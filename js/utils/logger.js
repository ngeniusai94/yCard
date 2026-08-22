const LOG_PREFIX = "[yCard]";

// 이미지 Base64 원문은 남기지 않는다. 길이·카드명 같은 요약만 찍는다.
export function logApp(eventName, payload = {}) {
  console.log(`${LOG_PREFIX} ${eventName}`, payload);
}

export function logAppError(eventName, payload = {}) {
  console.error(`${LOG_PREFIX} ${eventName}`, payload);
}

export function summarizeAnalyzeResult(data) {
  const card = data?.card || {};
  const benefits = Array.isArray(card.benefits) ? card.benefits : [];
  return {
    ok: data?.ok,
    confidence: data?.confidence,
    cardName: card.cardName || "",
    cardCompany: card.cardCompany || "",
    cardType: card.cardType || "",
    benefitCount: benefits.length,
    benefitTitles: benefits.slice(0, 5).map((benefit) => benefit.title || benefit.rateOrAmount || ""),
    warnings: data?.warnings || []
  };
}
