// OpenAI 키는 서버에만 두고, 브라우저로는 절대 내려주지 않는다.
const SYSTEM_PROMPT = `당신은 한국 신용/체크카드 혜택 안내 이미지를 구조화하는 추출기다.
반드시 JSON 객체만 출력한다. 마크다운 코드블록을 쓰지 않는다.

규칙:
- 카드번호 전체, CVC, 유효기간, 주민번호, 서명은 절대 추출하지 않는다. 보이면 warnings에 "민감정보 감지됨 — 저장하지 않음"을 넣는다.
- 카드/혜택 안내가 아니거나 글자를 거의 읽을 수 없으면 ok=false, confidence는 0.3 이하, cardName은 빈 문자열.
- 모르면 빈 값이나 빈 배열을 쓰고 지어내지 않는다.

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

function isValidResult(data) {
  return data && typeof data === "object" && data.card && typeof data.card === "object";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ ok: false, error: "SERVER_CONFIG" });
    return;
  }

  const { imageBase64, mimeType = "image/jpeg", locale = "ko-KR" } = req.body || {};
  if (!imageBase64 || typeof imageBase64 !== "string") {
    res.status(400).json({ ok: false, error: "INVALID_IMAGE" });
    return;
  }

  const safeMime = mimeType === "image/png" ? "image/png" : "image/jpeg";

  try {
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
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: `locale=${locale}. 이미지에서 카드명, 카드사, 카드 종류, 전월실적, 주요 혜택을 추출하세요.` },
              {
                type: "image_url",
                image_url: {
                  url: `data:${safeMime};base64,${imageBase64}`
                }
              }
            ]
          }
        ]
      })
    });

    if (!openAiResponse.ok) {
      const status = openAiResponse.status;
      if (status === 429) {
        res.status(429).json({ ok: false, error: "RATE_LIMIT" });
        return;
      }
      res.status(status >= 500 ? 502 : 400).json({ ok: false, error: "AI_UPSTREAM" });
      return;
    }

    const payload = await openAiResponse.json();
    const content = payload.choices?.[0]?.message?.content;
    const parsed = extractJson(content);
    if (!isValidResult(parsed)) {
      res.status(502).json({ ok: false, error: "SCHEMA" });
      return;
    }

    res.status(200).json(parsed);
  } catch (_error) {
    res.status(502).json({ ok: false, error: "AI_UPSTREAM" });
  }
}
