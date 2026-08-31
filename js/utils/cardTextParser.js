import { findCardCompanyInText } from "../constants/cardCompanies.js";

// 카드번호, 유효기간, CVC 등 민감/불필요 정보가 담긴 줄은 카드명 후보에서 제외한다.
const SENSITIVE_LINE_PATTERNS = [
  /\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{2,4}/, // 카드번호 그룹
  /\b(0[1-9]|1[0-2])\s*\/\s*\d{2}\b/, // MM/YY 유효기간
  /valid\s*thru|good\s*thru|expiry|exp\.?\s*date|cvc|cvv/i
];

// 카드명 후보로 보기 어려운 흔한 표기(카드 종류, 발급 안내 문구 등)는 제외한다.
const GENERIC_LABEL_PATTERNS = [
  /^(credit|debit|check)\s*card$/i,
  /^republic of korea$/i,
  /^\d+$/
];

function splitLines(rawText) {
  return (rawText || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function isSensitiveLine(line) {
  return SENSITIVE_LINE_PATTERNS.some((pattern) => pattern.test(line));
}

function isGenericLabel(line) {
  return GENERIC_LABEL_PATTERNS.some((pattern) => pattern.test(line));
}

function hasReadableLetters(line) {
  return /[가-힣a-zA-Z]/.test(line);
}

function stripCompanyMention(line, cardCompany) {
  if (!cardCompany) return line;
  const withoutSuffix = cardCompany.replace(/(카드|은행)$/, "");
  const pattern = new RegExp(withoutSuffix.split("").join("\\s*"), "gi");
  return line.replace(pattern, "").trim();
}

function scoreNameCandidate(line) {
  const koreanCount = (line.match(/[가-힣]/g) || []).length;
  const latinCount = (line.match(/[a-zA-Z]/g) || []).length;
  return koreanCount * 2 + latinCount;
}

/**
 * OCR 원문 텍스트에서 카드사·카드명 후보를 뽑는다.
 * AI에게는 이 텍스트 결과만 보내고, 이미지는 보내지 않는다.
 * @param {string} rawText
 * @returns {{ cardCompany: string, cardName: string, confidence: number }}
 */
export function parseCardText(rawText) {
  const lines = splitLines(rawText);
  const readableLines = lines.filter((line) => !isSensitiveLine(line));

  const cardCompany = findCardCompanyInText(readableLines.join(" "));

  const nameCandidates = readableLines
    .map((line) => stripCompanyMention(line, cardCompany))
    .filter((line) => line.length >= 2)
    .filter((line) => hasReadableLetters(line))
    .filter((line) => !isGenericLabel(line))
    .filter((line) => !isSensitiveLine(line));

  nameCandidates.sort((a, b) => scoreNameCandidate(b) - scoreNameCandidate(a));
  const cardName = nameCandidates[0] || "";
  const nameQuality = Math.min(scoreNameCandidate(cardName) / 40, 1);

  let confidence = 0.2;
  if (cardCompany && cardName) confidence = 0.75 + nameQuality * 0.2;
  else if (cardCompany) confidence = 0.55;
  else if (cardName) confidence = 0.3 + nameQuality * 0.2;

  return { cardCompany, cardName, confidence };
}

export function isCardTextUnreadable({ cardCompany, cardName }) {
  return !cardCompany && !cardName;
}
