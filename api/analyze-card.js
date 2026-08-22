// OpenAI 키는 서버에만 두고, 브라우저로는 절대 내려주지 않는다.

const VISION_PROMPT = `당신은 한국 신용/체크카드 이미지에서 카드 식별 정보만 추출한다.
반드시 JSON 객체만 출력한다.

규칙:
- 카드명, 카드사, 카드 종류만 추출한다. 혜택·전월실적·한도는 추출하지 않는다.
- 카드번호 전체, CVC, 유효기간, 주민번호, 서명은 절대 추출하지 않는다. 보이면 warnings에 "민감정보 감지됨 — 저장하지 않음"을 넣는다.
- 카드가 아니거나 카드명을 읽기 어려우면 ok=false, confidence는 0.3 이하, cardName은 빈 문자열.
- 모르면 빈 값을 쓰고 지어내지 않는다.

출력 스키마:
{
  "ok": true,
  "confidence": 0.0,
  "card": {
    "cardName": "",
    "cardCompany": "",
    "cardType": "CREDIT" | "CHECK" | "UNKNOWN"
  },
  "warnings": []
}`;

const BENEFIT_LOOKUP_PROMPT = `당신은 한국 신용/체크카드의 공개된 대표 혜택을 조회하는 추출기다.
반드시 JSON 객체만 출력한다.

규칙:
- 주어진 카드명·카드사 기준으로 일반적인 주요 혜택만 정리한다.
- 모르거나 최신 정보가 불확실하면 지어내지 말고 빈 배열/빈 값을 쓴다.
- 카드번호, CVC, 유효기간은 절대 넣지 않는다.

출력 스키마:
{
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
  "rawSummary": "",
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

function hasCardName(data) {
  return Boolean(data?.card?.cardName && String(data.card.cardName).trim());
}

async function callOpenAiJson({ apiKey, messages }) {
  const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages
    })
  });

  if (!openAiResponse.ok) {
    const error = new Error("AI_UPSTREAM");
    error.status = openAiResponse.status;
    throw error;
  }

  const payload = await openAiResponse.json();
  return extractJson(payload.choices?.[0]?.message?.content);
}

function emptyBenefits() {
  return {
    performance: { previousMonthSpend: 0, note: "" },
    benefits: [],
    cautions: [],
    rawSummary: "",
    warnings: []
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
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
    mimeType: safeMime,
    locale,
    base64Length: imageBase64.length,
    approxByteSize: Math.round(imageBase64.length * 0.75)
  });

  try {
    // 1단계: 이미지에서 카드명만 추출
    const identity = await callOpenAiJson({
      apiKey,
      messages: [
        { role: "system", content: VISION_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: `locale=${locale}. 이미지에서 카드명, 카드사, 카드 종류만 추출하세요. 혜택은 추출하지 마세요.` },
            {
              type: "image_url",
              image_url: { url: `data:${safeMime};base64,${imageBase64}` }
            }
          ]
        }
      ]
    });

    logServer("analyze.receive.cardName", {
      ok: identity?.ok,
      confidence: identity?.confidence,
      cardName: identity?.card?.cardName || "",
      cardCompany: identity?.card?.cardCompany || "",
      cardType: identity?.card?.cardType || "",
      warnings: identity?.warnings || []
    });

    if (!identity || typeof identity !== "object" || !identity.card) {
      res.status(502).json({ ok: false, error: "SCHEMA" });
      return;
    }

    if (!hasCardName(identity) || identity.ok === false || Number(identity.confidence || 0) < 0.45) {
      const unread = {
        ok: false,
        confidence: Number(identity.confidence || 0),
        card: {
          cardName: identity.card.cardName || "",
          cardCompany: identity.card.cardCompany || "",
          cardType: identity.card.cardType || "UNKNOWN",
          ...emptyBenefits()
        },
        warnings: identity.warnings || []
      };
      logServer("analyze.receive", { ...unread.card, benefitCount: 0, elapsedMs: Date.now() - startedAt, skippedBenefitLookup: true });
      res.status(200).json(unread);
      return;
    }

    // 2단계: 카드명으로 혜택 조회 (이미지는 보내지 않음)
    let lookup = emptyBenefits();
    try {
      logServer("benefit.lookup.send", {
        cardName: identity.card.cardName,
        cardCompany: identity.card.cardCompany || "",
        cardType: identity.card.cardType || "UNKNOWN"
      });

      const lookedUp = await callOpenAiJson({
        apiKey,
        messages: [
          { role: "system", content: BENEFIT_LOOKUP_PROMPT },
          {
            role: "user",
            content: `카드명: ${identity.card.cardName}\n카드사: ${identity.card.cardCompany || ""}\n카드종류: ${identity.card.cardType || "UNKNOWN"}\nlocale=${locale}`
          }
        ]
      });

      if (lookedUp && typeof lookedUp === "object") {
        lookup = {
          performance: lookedUp.performance || emptyBenefits().performance,
          benefits: Array.isArray(lookedUp.benefits) ? lookedUp.benefits : [],
          cautions: Array.isArray(lookedUp.cautions) ? lookedUp.cautions : [],
          rawSummary: lookedUp.rawSummary || "",
          warnings: Array.isArray(lookedUp.warnings) ? lookedUp.warnings : []
        };
      }

      logServer("benefit.lookup.receive", {
        benefitCount: lookup.benefits.length,
        benefitTitles: lookup.benefits.slice(0, 5).map((benefit) => benefit.title || ""),
        performanceNote: lookup.performance?.note || "",
        warnings: lookup.warnings
      });
    } catch (lookupError) {
      lookup.warnings = ["혜택 조회에 실패했습니다. 카드명은 확인했으니 혜택은 직접 입력해 주세요."];
      logServer("benefit.lookup.error", { status: lookupError.status || 0 });
    }

    const result = {
      ok: true,
      confidence: Number(identity.confidence || 0),
      card: {
        cardName: identity.card.cardName.trim(),
        cardCompany: identity.card.cardCompany || "",
        cardType: identity.card.cardType || "UNKNOWN",
        performance: lookup.performance,
        benefits: lookup.benefits,
        cautions: lookup.cautions,
        rawSummary: lookup.rawSummary
      },
      warnings: [...(identity.warnings || []), ...(lookup.warnings || [])]
    };

    logServer("analyze.receive", {
      cardName: result.card.cardName,
      cardCompany: result.card.cardCompany,
      benefitCount: result.card.benefits.length,
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
