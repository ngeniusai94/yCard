// Gemini 키는 서버에만 두고, 브라우저로는 절대 내려주지 않는다.
const GEMINI_MODEL = "gemini-2.0-flash";

const ANALYZE_PROMPT = `당신은 한국 신용/체크카드 이미지에서 카드 정보를 추출한다.
반드시 JSON 객체만 출력한다.

규칙:
- 이미지에서 카드명, 카드사, 카드 종류를 읽는다.
- 혜택 안내가 보이면 그대로 추출한다.
- 혜택 글자가 없어도 카드명이 확인되면, 그 카드의 공개된 대표 혜택을 채운다.
- 모르면 지어내지 말고 빈 값/빈 배열을 쓴다.
- 카드번호 전체, CVC, 유효기간, 주민번호, 서명은 절대 추출하지 않는다. 보이면 warnings에 "민감정보 감지됨 — 저장하지 않음"을 넣는다.
- 카드가 아니거나 카드명을 읽기 어려우면 ok=false, confidence는 0.3 이하, cardName은 빈 문자열.

출력 스키마:
{
  "ok": true,
  "confidence": 0.0,
  "card": {
    "cardName": "",
    "cardCompany": "",
    "cardType": "CREDIT" | "CHECK" | "UNKNOWN",
    "performance": { "previousMonthSpend": 0, "note": "" },
    "benefits": [
      {
        "category": "",
        "title": "",
        "rateOrAmount": "",
        "condition": "",
        "limit": "",
        "type": "DISCOUNT" | "POINT" | "CASHBACK"
      }
    ],
    "cautions": [],
    "rawSummary": ""
  },
  "warnings": []
}`;

function logServer(eventName, payload = {}) {
  console.log(`[yCard] ${eventName}`, payload);
}

function extractJson(text) {
  if (!text) return null;
  const trimmed = text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch (_error) {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    return null;
  }
}

function emptyBenefits() {
  return {
    performance: { previousMonthSpend: 0, note: "" },
    benefits: [],
    cautions: [],
    rawSummary: ""
  };
}

function normalizeResult(parsed) {
  const card = parsed?.card || {};
  return {
    ok: parsed?.ok !== false,
    confidence: Number(parsed?.confidence || 0),
    card: {
      cardName: (card.cardName || "").trim(),
      cardCompany: card.cardCompany || "",
      cardType: card.cardType || "UNKNOWN",
      performance: card.performance || emptyBenefits().performance,
      benefits: Array.isArray(card.benefits) ? card.benefits : [],
      cautions: Array.isArray(card.cautions) ? card.cautions : [],
      rawSummary: card.rawSummary || ""
    },
    warnings: Array.isArray(parsed?.warnings) ? parsed.warnings : []
  };
}

async function callGeminiJson({ apiKey, imageBase64, mimeType, locale }) {
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
  const geminiResponse = await fetch(geminiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: ANALYZE_PROMPT }]
      },
      contents: [
        {
          parts: [
            {
              text: `locale=${locale}. 이미지에서 카드명, 카드사명, 카드 혜택을 JSON으로 추출하세요.`
            },
            {
              inline_data: {
                mime_type: mimeType,
                data: imageBase64
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json"
      }
    })
  });

  if (!geminiResponse.ok) {
    const error = new Error("AI_UPSTREAM");
    error.status = geminiResponse.status;
    throw error;
  }

  const payload = await geminiResponse.json();
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  return extractJson(text);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logServer("analyze.error", { reason: "SERVER_CONFIG" });
    res.status(500).json({ ok: false, error: "SERVER_CONFIG" });
    return;
  }

  const { imageBase64, mimeType = "image/jpeg", locale = "ko-KR" } = req.body || {};
  if (!imageBase64 || typeof imageBase64 !== "string") {
    logServer("analyze.error", { reason: "INVALID_IMAGE" });
    res.status(400).json({ ok: false, error: "INVALID_IMAGE" });
    return;
  }

  const safeMime = mimeType === "image/png" ? "image/png" : "image/jpeg";
  const startedAt = Date.now();

  logServer("analyze.send", {
    provider: "gemini",
    model: GEMINI_MODEL,
    mimeType: safeMime,
    locale,
    base64Length: imageBase64.length,
    approxByteSize: Math.round(imageBase64.length * 0.75)
  });

  try {
    const parsed = await callGeminiJson({
      apiKey,
      imageBase64,
      mimeType: safeMime,
      locale
    });

    if (!parsed || typeof parsed !== "object" || !parsed.card) {
      logServer("analyze.error", { reason: "SCHEMA", elapsedMs: Date.now() - startedAt });
      res.status(502).json({ ok: false, error: "SCHEMA" });
      return;
    }

    const result = normalizeResult(parsed);
    logServer("analyze.receive", {
      provider: "gemini",
      ok: result.ok,
      confidence: result.confidence,
      cardName: result.card.cardName,
      cardCompany: result.card.cardCompany,
      benefitCount: result.card.benefits.length,
      benefitTitles: result.card.benefits.slice(0, 5).map((benefit) => benefit.title || ""),
      elapsedMs: Date.now() - startedAt
    });

    res.status(200).json(result);
  } catch (error) {
    logServer("analyze.error", { status: error.status || 0, elapsedMs: Date.now() - startedAt });
    if (error.status === 429) {
      res.status(429).json({ ok: false, error: "RATE_LIMIT" });
      return;
    }
    if (error.status && error.status < 500) {
      res.status(400).json({ ok: false, error: "AI_UPSTREAM" });
      return;
    }
    res.status(502).json({ ok: false, error: "AI_UPSTREAM" });
  }
}
