import { buildCardSearchUrl, findCardCompanyHomePage, toCanonicalCardCompany } from "../js/constants/cardCompanies.js";

// Gemini 키는 서버에만 두고, 브라우저로는 절대 내려주지 않는다.
// 이미지를 전송하지 않고 텍스트(카드사/카드명)만 보내므로 저렴한 텍스트 모델을 쓴다.
const PRIMARY_MODEL = "gemini-3.1-flash-lite";
const FALLBACK_MODEL = "gemini-3.5-flash-lite";

const ANALYZE_PROMPT = `당신은 한국 신용/체크카드 혜택 정보를 알고 있는 어시스턴트다.
사용자가 카드사와 카드명을 알려주면, 그 카드의 대표 혜택을 JSON으로만 출력한다.

규칙:
- 이미지는 없다. 오직 텍스트로 주어진 카드사·카드명만 보고 판단한다.
- 카드사·카드명은 카드 사진을 OCR(광학 문자 인식)로 읽어서 얻은 값이라 오타·오인식이 섞여 있을 수 있다.
  예: "6"↔"e", "O"↔"0", "1"↔"I"↔"l", 받침이 빠지거나 비슷한 자음/모음으로 잘못 읽힘, 공백 위치가 다름 등.
  주어진 텍스트와 발음·형태가 비슷한 실제 카드사/카드명이 존재하면, 그 실제 카드로 보정해서 판단한다.
  이때 응답의 card.cardName, card.cardCompany에는 보정한 정확한 한글 이름을 넣는다.
  예: wooricard / WOORI → 우리카드, shinhancard → 신한카드.
- 실제로 존재할 법한 카드의 공개된 대표 혜택을 가능한 한 폭넓게 채운다.
  카드가 실제로 제공하는 혜택 카테고리(예: 주유/마트/커피/온라인쇼핑/대중교통/통신/해외이용/포인트 적립 등) 중
  해당 카드가 실제로 제공하는 것을 최소 3개, 최대 8개까지 benefits 배열에 담는다. 혜택이 1~2개뿐인 카드라면 그만큼만 채운다.
- 모르는 정보는 지어내지 말고 빈 값/빈 배열을 쓴다. 단, 혜택 개수를 줄이기 위해 아는 혜택을 생략하지 않는다.
- officialDetailUrl은 비워 둔다. 링크는 서버가 카드사 대표 홈페이지로 채운다.
- 오타를 보정해도 어떤 카드인지 전혀 알아볼 수 없으면 ok=false, confidence는 0.3 이하로 출력한다.

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

function normalizeResult(parsed, fallback) {
  const card = parsed?.card || {};
  const rawCompany = card.cardCompany || fallback.cardCompany || "";
  const cardCompany = toCanonicalCardCompany(rawCompany) || rawCompany;
  const cardName = (card.cardName || fallback.cardName || "").trim();
  return {
    ok: parsed?.ok !== false,
    confidence: Number(parsed?.confidence || 0),
    card: {
      cardName,
      cardCompany,
      cardType: card.cardType || "UNKNOWN",
      officialDetailUrl: findCardCompanyHomePage(cardCompany),
      cardSearchUrl: buildCardSearchUrl(cardCompany, cardName),
      performance: card.performance || { previousMonthSpend: 0, note: "" },
      benefits: Array.isArray(card.benefits) ? card.benefits : [],
      cautions: Array.isArray(card.cautions) ? card.cautions : [],
      rawSummary: card.rawSummary || ""
    },
    warnings: Array.isArray(parsed?.warnings) ? parsed.warnings : []
  };
}

async function requestGemini({ apiKey, model, cardCompany, cardName, locale }) {
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
              text: `locale=${locale}. 카드사: ${cardCompany || "미확인"}. 카드명: ${cardName || "미확인"} (OCR로 읽은 값이라 오타가 있을 수 있음. wooricard는 우리카드처럼 한글 공식 카드사명으로 보정해서 판단). 이 카드가 실제로 제공하는 대표 혜택을 카테고리별로 최대한 폭넓게(가능하면 3개 이상) JSON으로 알려줘. URL 검색은 하지 마세요.`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
        maxOutputTokens: 2048
      }
    })
  });
}

async function callGeminiJson({ apiKey, cardCompany, cardName, locale }) {
  const models = [PRIMARY_MODEL, FALLBACK_MODEL];
  let lastStatus = 0;

  for (let index = 0; index < models.length; index += 1) {
    const model = models[index];
    logServer("gemini.request", { model, attempt: index + 1 });
    const geminiResponse = await requestGemini({
      apiKey,
      model,
      cardCompany,
      cardName,
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

  const { cardCompany = "", cardName = "", locale = "ko-KR" } = req.body || {};
  if (!cardCompany.trim() && !cardName.trim()) {
    logServer("analyze.error", { reason: "INVALID_CARD_TEXT" });
    res.status(400).json({ ok: false, error: "INVALID_CARD_TEXT" });
    return;
  }

  const startedAt = Date.now();

  logServer("analyze.send", {
    provider: "gemini",
    model: PRIMARY_MODEL,
    cardCompany,
    cardName,
    locale
  });

  try {
    const parsed = await callGeminiJson({
      apiKey,
      cardCompany,
      cardName,
      locale
    });

    if (!parsed || typeof parsed !== "object" || !parsed.card) {
      logServer("analyze.error", { reason: "SCHEMA", parsed, elapsedMs: Date.now() - startedAt });
      res.status(502).json({ ok: false, error: "SCHEMA" });
      return;
    }

    const result = normalizeResult(parsed, { cardCompany, cardName });
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
