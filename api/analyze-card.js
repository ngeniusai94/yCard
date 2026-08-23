// Gemini 키는 서버에만 두고, 브라우저로는 절대 내려주지 않는다.
const PRIMARY_MODEL = "gemini-3.1-flash-lite";
const FALLBACK_MODEL = "gemini-3.5-flash-lite";

const COMPANY_HOME_PAGES = {
  신한카드: "https://www.shinhancard.com",
  신한: "https://www.shinhancard.com",
  현대카드: "https://www.hyundaicard.com",
  현대: "https://www.hyundaicard.com",
  삼성카드: "https://www.samsungcard.com",
  삼성: "https://www.samsungcard.com",
  KB국민카드: "https://card.kbcard.com",
  국민카드: "https://card.kbcard.com",
  KB: "https://card.kbcard.com",
  우리카드: "https://www.wooricard.com",
  우리: "https://www.wooricard.com",
  하나카드: "https://www.hanacard.co.kr",
  하나: "https://www.hanacard.co.kr",
  롯데카드: "https://www.lottecard.co.kr",
  롯데: "https://www.lottecard.co.kr",
  NH농협카드: "https://card.nonghyup.com",
  농협카드: "https://card.nonghyup.com",
  농협: "https://card.nonghyup.com",
  IBK기업은행: "https://www.ibk.co.kr",
  기업은행: "https://www.ibk.co.kr",
  BC카드: "https://www.bccard.com",
  BC: "https://www.bccard.com"
};

const ANALYZE_PROMPT = `당신은 한국 신용/체크카드 이미지에서 카드 정보를 추출한다.
반드시 JSON 객체만 출력한다.

규칙:
- 이미지에서 카드명, 카드사, 카드 종류를 읽는다.
- 혜택 안내가 보이면 그대로 추출한다.
- 혜택 글자가 없어도 카드명이 확인되면, 그 카드의 공개된 대표 혜택을 채운다.
- officialDetailUrl은 비워 둔다. 링크는 서버가 카드사 대표 홈페이지로 채운다.
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
    "officialDetailUrl": "",
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

function findCompanyHomePage(cardCompany) {
  const company = (cardCompany || "").replaceAll(" ", "");
  if (!company) return "";
  if (COMPANY_HOME_PAGES[company]) return COMPANY_HOME_PAGES[company];
  const matchedKey = Object.keys(COMPANY_HOME_PAGES).find((key) => company.includes(key));
  return matchedKey ? COMPANY_HOME_PAGES[matchedKey] : "";
}

function normalizeResult(parsed) {
  const card = parsed?.card || {};
  const cardCompany = card.cardCompany || "";
  return {
    ok: parsed?.ok !== false,
    confidence: Number(parsed?.confidence || 0),
    card: {
      cardName: (card.cardName || "").trim(),
      cardCompany,
      cardType: card.cardType || "UNKNOWN",
      officialDetailUrl: findCompanyHomePage(cardCompany),
      performance: card.performance || emptyBenefits().performance,
      benefits: Array.isArray(card.benefits) ? card.benefits : [],
      cautions: Array.isArray(card.cautions) ? card.cautions : [],
      rawSummary: card.rawSummary || ""
    },
    warnings: Array.isArray(parsed?.warnings) ? parsed.warnings : []
  };
}

async function requestGemini({ apiKey, model, imageBase64, mimeType, locale }) {
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  return fetch(geminiUrl, {
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
              text: `locale=${locale}. 이미지에서 카드명, 카드사명, 카드 혜택만 JSON으로 추출하세요. URL 검색은 하지 마세요.`
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
}

async function callGeminiJson({ apiKey, imageBase64, mimeType, locale }) {
  const models = [PRIMARY_MODEL, FALLBACK_MODEL];
  let lastStatus = 0;

  for (let index = 0; index < models.length; index += 1) {
    const model = models[index];
    logServer("gemini.request", { model, attempt: index + 1 });
    const geminiResponse = await requestGemini({
      apiKey,
      model,
      imageBase64,
      mimeType,
      locale
    });

    if (geminiResponse.ok) {
      const payload = await geminiResponse.json();
      const text = payload.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const parsed = extractJson(text);
      logServer("gemini.raw.json", {
        model,
        finishReason: payload.candidates?.[0]?.finishReason || "",
        rawText: text,
        parsed
      });
      return parsed;
    }

    lastStatus = geminiResponse.status;
    const lastBody = await geminiResponse.text();
    logServer("gemini.upstream.error", {
      model,
      status: lastStatus,
      body: lastBody.slice(0, 800)
    });

    // 첫 모델이 실패했을 때만 한 번 더 시도한다.
    if (index === 0) {
      continue;
    }
  }

  const error = new Error("AI_UPSTREAM");
  error.status = lastStatus;
  throw error;
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
    model: PRIMARY_MODEL,
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
      logServer("analyze.error", { reason: "SCHEMA", parsed, elapsedMs: Date.now() - startedAt });
      res.status(502).json({ ok: false, error: "SCHEMA" });
      return;
    }

    const result = normalizeResult(parsed);
    logServer("analyze.receive.json", result);

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
