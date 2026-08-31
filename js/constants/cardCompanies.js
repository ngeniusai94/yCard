// 카드사 브랜드 정보. 한글·영문 별칭이 같은 객체를 가리키게 해서 로고/홈페이지가 어긋나지 않게 한다.
const shinhan = { name: "신한카드", homePage: "https://www.shinhancard.com", logoText: "신한", logoBg: "#0046FF" };
const hyundai = { name: "현대카드", homePage: "https://www.hyundaicard.com", logoText: "현대", logoBg: "#111111" };
const samsung = { name: "삼성카드", homePage: "https://www.samsungcard.com", logoText: "삼성", logoBg: "#1428A0" };
const kb = { name: "KB국민카드", homePage: "https://card.kbcard.com", logoText: "KB", logoBg: "#FFBC00", logoColor: "#1A1A1A" };
const woori = { name: "우리카드", homePage: "https://www.wooricard.com", logoText: "우리", logoBg: "#0067AC" };
const hana = { name: "하나카드", homePage: "https://www.hanacard.co.kr", logoText: "하나", logoBg: "#008485" };
const lotte = { name: "롯데카드", homePage: "https://www.lottecard.co.kr", logoText: "롯데", logoBg: "#E6002D" };
const nh = { name: "NH농협카드", homePage: "https://card.nonghyup.com", logoText: "농협", logoBg: "#1E7A46" };
const ibk = { name: "IBK기업은행", homePage: "https://www.ibk.co.kr", logoText: "IBK", logoBg: "#003DA5" };
const bc = { name: "BC카드", homePage: "https://www.bccard.com", logoText: "BC", logoBg: "#1B4EA0" };
const busan = { name: "BNK부산은행", homePage: "https://www.busanbank.co.kr", logoText: "BNK", logoBg: "#E60012" };
const knbank = { name: "BNK경남은행", homePage: "https://www.knbank.co.kr", logoText: "BNK", logoBg: "#E60012" };
const kjbank = { name: "광주은행", homePage: "https://www.kjbank.com", logoText: "광주", logoBg: "#F47B20" };
const jbbank = { name: "전북은행", homePage: "https://www.jbbank.co.kr", logoText: "전북", logoBg: "#0B6E4F" };
const jejubank = { name: "제주은행", homePage: "https://www.jejubank.co.kr", logoText: "제주", logoBg: "#1C8A6A" };
const suhyup = { name: "Sh수협은행", homePage: "https://www.suhyup-bank.com", logoText: "수협", logoBg: "#0072BC" };
const kakao = { name: "카카오뱅크", homePage: "https://www.kakaobank.com", logoText: "카뱅", logoBg: "#FEE500", logoColor: "#191919" };
const kbank = { name: "케이뱅크", homePage: "https://www.kbanknow.com", logoText: "케이", logoBg: "#4B2E83" };
const toss = { name: "토스뱅크", homePage: "https://www.tossbank.com", logoText: "토스", logoBg: "#0064FF" };

// 카드사 별칭 → { 대표명, 홈페이지, 원형 CI } 매핑. 실물 카드는 WOORI처럼 영문 로고인 경우가 많다.
export const cardCompanyDirectory = {
  신한카드: shinhan,
  신한: shinhan,
  shinhan: shinhan,
  shinhancard: shinhan,
  현대카드: hyundai,
  현대: hyundai,
  hyundai: hyundai,
  hyundaicard: hyundai,
  삼성카드: samsung,
  삼성: samsung,
  samsung: samsung,
  samsungcard: samsung,
  KB국민카드: kb,
  국민카드: kb,
  국민: kb,
  KB: kb,
  kbcard: kb,
  kookmin: kb,
  우리카드: woori,
  우리: woori,
  woori: woori,
  wooricard: woori,
  하나카드: hana,
  하나: hana,
  hana: hana,
  hanacard: hana,
  롯데카드: lotte,
  롯데: lotte,
  lotte: lotte,
  lottecard: lotte,
  NH농협카드: nh,
  농협카드: nh,
  농협: nh,
  nonghyup: nh,
  nhcard: nh,
  IBK기업은행: ibk,
  기업은행: ibk,
  ibk: ibk,
  BC카드: bc,
  BC: bc,
  bccard: bc,
  BNK부산은행: busan,
  부산은행: busan,
  busanbank: busan,
  bnkbusan: busan,
  BNK경남은행: knbank,
  경남은행: knbank,
  knbank: knbank,
  광주은행: kjbank,
  전북은행: jbbank,
  제주은행: jejubank,
  수협은행: suhyup,
  suhyup: suhyup,
  카카오뱅크: kakao,
  카카오: kakao,
  kakaobank: kakao,
  케이뱅크: kbank,
  kbank: kbank,
  토스뱅크: toss,
  tossbank: toss,
  toss: toss
};

// 별칭 중 길이가 긴 것부터 매칭해야 "국민"이 "국민카드"보다 먼저 걸리는 문제를 막는다.
export const cardCompanyAliases = Object.keys(cardCompanyDirectory).sort(
  (a, b) => b.length - a.length
);

// 카드사 홈페이지는 대표 페이지라 특정 카드 정보가 바로 보이지 않는다.
// 카드사·카드명으로 검색한 결과 페이지를 함께 제공해 실제 그 카드 정보로 이동시킨다.
export function buildCardSearchUrl(cardCompany, cardName) {
  const keyword = [cardCompany, cardName, "카드 혜택"].filter(Boolean).join(" ").trim();
  if (!keyword) return "";
  return `https://search.naver.com/search.naver?query=${encodeURIComponent(keyword)}`;
}

function normalizeForMatch(text) {
  return (text || "").replace(/\s+/g, "").toLowerCase();
}

function findCardCompanyEntry(cardCompany) {
  const company = normalizeForMatch(cardCompany);
  if (!company) return null;
  const exactKey = cardCompanyAliases.find((alias) => normalizeForMatch(alias) === company);
  if (exactKey) return cardCompanyDirectory[exactKey];
  const containedKey = cardCompanyAliases.find((alias) => company.includes(normalizeForMatch(alias)));
  return containedKey ? cardCompanyDirectory[containedKey] : null;
}

export function findCardCompanyHomePage(cardCompany) {
  return findCardCompanyEntry(cardCompany)?.homePage || "";
}

// wooricard, SHINHAN 같은 영문/별칭을 화면·AI에 넣을 한글 공식명으로 바꾼다.
export function toCanonicalCardCompany(text) {
  const entry = findCardCompanyEntry(text);
  if (entry?.name) return entry.name;
  return findCardCompanyInText(text);
}

// 알려진 카드사만 원형 CI를 만든다. 매칭되지 않으면 빈 문자열을 돌려 로고를 숨긴다.
export function findCardCompanyLogo(cardCompany) {
  const entry = findCardCompanyEntry(cardCompany);
  if (!entry?.logoText || !entry?.logoBg) return "";
  const fill = entry.logoColor || "#ffffff";
  const fontSize = entry.logoText.length >= 3 ? 18 : 22;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="${entry.logoBg}"/><text x="32" y="40" text-anchor="middle" font-size="${fontSize}" font-weight="700" fill="${fill}" font-family="system-ui,sans-serif">${entry.logoText}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function levenshteinDistance(a, b) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let i = 0; i < rows; i += 1) dp[i][0] = i;
  for (let j = 0; j < cols; j += 1) dp[0][j] = j;
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[rows - 1][cols - 1];
}

// OCR은 글자를 몇 개씩 잘못 읽거나 줄이 끊어지는 경우가 많아, 정확히 일치하지 않아도
// 편집거리(오타 허용치) 안에 들면 같은 카드사로 인정한다. 2글자 이하 별칭(KB, BC 등)은
// 오인식 위험이 커서 정확히 일치할 때만 인정한다.
function fuzzyIncludes(normalizedText, alias) {
  const normalizedAlias = normalizeForMatch(alias);
  const aliasLength = normalizedAlias.length;
  // 세로로 적힌 글자는 한 줄에 한 글자씩 끊어져 인식되어 오차가 커서, 허용치를 넉넉히 둔다.
  const maxEdits = aliasLength <= 2 ? 0 : Math.max(1, Math.round(aliasLength * 0.4));
  if (maxEdits === 0) return normalizedText.includes(normalizedAlias);

  for (let start = 0; start <= normalizedText.length - 1; start += 1) {
    for (let lengthDelta = -1; lengthDelta <= 1; lengthDelta += 1) {
      const windowLength = aliasLength + lengthDelta;
      if (windowLength < 1) continue;
      const window = normalizedText.slice(start, start + windowLength);
      if (window.length !== windowLength) continue;
      if (levenshteinDistance(window, normalizedAlias) <= maxEdits) return true;
    }
  }
  return false;
}

// OCR 원문 안에서 카드사명을 찾을 때 사용한다. 영문 로고(WOORI, SHINHAN 등)도 잡는다.
export function findCardCompanyInText(text) {
  const normalized = normalizeForMatch(text);
  if (!normalized) return "";

  const exactMatch = cardCompanyAliases.find((alias) => normalized.includes(normalizeForMatch(alias)));
  if (exactMatch) return cardCompanyDirectory[exactMatch].name;

  const fuzzyMatch = cardCompanyAliases.find((alias) => fuzzyIncludes(normalized, alias));
  return fuzzyMatch ? cardCompanyDirectory[fuzzyMatch].name : "";
}
