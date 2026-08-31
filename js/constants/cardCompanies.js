// 카드사 별칭 → { 대표명, 홈페이지, 원형 CI } 매핑. 클라이언트(OCR 파싱)와 서버(홈페이지 링크) 양쪽에서 공유한다.
export const cardCompanyDirectory = {
  신한카드: { name: "신한카드", homePage: "https://www.shinhancard.com", logoText: "신한", logoBg: "#0046FF" },
  신한: { name: "신한카드", homePage: "https://www.shinhancard.com", logoText: "신한", logoBg: "#0046FF" },
  현대카드: { name: "현대카드", homePage: "https://www.hyundaicard.com", logoText: "현대", logoBg: "#111111" },
  현대: { name: "현대카드", homePage: "https://www.hyundaicard.com", logoText: "현대", logoBg: "#111111" },
  삼성카드: { name: "삼성카드", homePage: "https://www.samsungcard.com", logoText: "삼성", logoBg: "#1428A0" },
  삼성: { name: "삼성카드", homePage: "https://www.samsungcard.com", logoText: "삼성", logoBg: "#1428A0" },
  KB국민카드: { name: "KB국민카드", homePage: "https://card.kbcard.com", logoText: "KB", logoBg: "#FFBC00", logoColor: "#1A1A1A" },
  국민카드: { name: "KB국민카드", homePage: "https://card.kbcard.com", logoText: "KB", logoBg: "#FFBC00", logoColor: "#1A1A1A" },
  국민: { name: "KB국민카드", homePage: "https://card.kbcard.com", logoText: "KB", logoBg: "#FFBC00", logoColor: "#1A1A1A" },
  KB: { name: "KB국민카드", homePage: "https://card.kbcard.com", logoText: "KB", logoBg: "#FFBC00", logoColor: "#1A1A1A" },
  우리카드: { name: "우리카드", homePage: "https://www.wooricard.com", logoText: "우리", logoBg: "#0067AC" },
  우리: { name: "우리카드", homePage: "https://www.wooricard.com", logoText: "우리", logoBg: "#0067AC" },
  하나카드: { name: "하나카드", homePage: "https://www.hanacard.co.kr", logoText: "하나", logoBg: "#008485" },
  하나: { name: "하나카드", homePage: "https://www.hanacard.co.kr", logoText: "하나", logoBg: "#008485" },
  롯데카드: { name: "롯데카드", homePage: "https://www.lottecard.co.kr", logoText: "롯데", logoBg: "#E6002D" },
  롯데: { name: "롯데카드", homePage: "https://www.lottecard.co.kr", logoText: "롯데", logoBg: "#E6002D" },
  NH농협카드: { name: "NH농협카드", homePage: "https://card.nonghyup.com", logoText: "농협", logoBg: "#1E7A46" },
  농협카드: { name: "NH농협카드", homePage: "https://card.nonghyup.com", logoText: "농협", logoBg: "#1E7A46" },
  농협: { name: "NH농협카드", homePage: "https://card.nonghyup.com", logoText: "농협", logoBg: "#1E7A46" },
  IBK기업은행: { name: "IBK기업은행", homePage: "https://www.ibk.co.kr", logoText: "IBK", logoBg: "#003DA5" },
  기업은행: { name: "IBK기업은행", homePage: "https://www.ibk.co.kr", logoText: "IBK", logoBg: "#003DA5" },
  BC카드: { name: "BC카드", homePage: "https://www.bccard.com", logoText: "BC", logoBg: "#1B4EA0" },
  BC: { name: "BC카드", homePage: "https://www.bccard.com", logoText: "BC", logoBg: "#1B4EA0" },
  BNK부산은행: { name: "BNK부산은행", homePage: "https://www.busanbank.co.kr", logoText: "BNK", logoBg: "#E60012" },
  부산은행: { name: "BNK부산은행", homePage: "https://www.busanbank.co.kr", logoText: "BNK", logoBg: "#E60012" },
  BNK경남은행: { name: "BNK경남은행", homePage: "https://www.knbank.co.kr", logoText: "BNK", logoBg: "#E60012" },
  경남은행: { name: "BNK경남은행", homePage: "https://www.knbank.co.kr", logoText: "BNK", logoBg: "#E60012" },
  광주은행: { name: "광주은행", homePage: "https://www.kjbank.com", logoText: "광주", logoBg: "#F47B20" },
  전북은행: { name: "전북은행", homePage: "https://www.jbbank.co.kr", logoText: "전북", logoBg: "#0B6E4F" },
  제주은행: { name: "제주은행", homePage: "https://www.jejubank.co.kr", logoText: "제주", logoBg: "#1C8A6A" },
  수협은행: { name: "Sh수협은행", homePage: "https://www.suhyup-bank.com", logoText: "수협", logoBg: "#0072BC" },
  카카오뱅크: { name: "카카오뱅크", homePage: "https://www.kakaobank.com", logoText: "카뱅", logoBg: "#FEE500", logoColor: "#191919" },
  케이뱅크: { name: "케이뱅크", homePage: "https://www.kbanknow.com", logoText: "케이", logoBg: "#4B2E83" },
  토스뱅크: { name: "토스뱅크", homePage: "https://www.tossbank.com", logoText: "토스", logoBg: "#0064FF" }
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

function findCardCompanyEntry(cardCompany) {
  const company = (cardCompany || "").replaceAll(" ", "");
  if (!company) return null;
  if (cardCompanyDirectory[company]) return cardCompanyDirectory[company];
  const matchedKey = cardCompanyAliases.find((alias) => company.includes(alias));
  return matchedKey ? cardCompanyDirectory[matchedKey] : null;
}

export function findCardCompanyHomePage(cardCompany) {
  return findCardCompanyEntry(cardCompany)?.homePage || "";
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
  const aliasLength = alias.length;
  // 세로로 적힌 글자는 한 줄에 한 글자씩 끊어져 인식되어 오차가 커서, 허용치를 넉넉히 둔다.
  const maxEdits = aliasLength <= 2 ? 0 : Math.max(1, Math.round(aliasLength * 0.4));
  if (maxEdits === 0) return normalizedText.includes(alias);

  for (let start = 0; start <= normalizedText.length - 1; start += 1) {
    for (let lengthDelta = -1; lengthDelta <= 1; lengthDelta += 1) {
      const windowLength = aliasLength + lengthDelta;
      if (windowLength < 1) continue;
      const window = normalizedText.slice(start, start + windowLength);
      if (window.length !== windowLength) continue;
      if (levenshteinDistance(window, alias) <= maxEdits) return true;
    }
  }
  return false;
}

// OCR 원문 안에서 카드사명을 찾을 때 사용한다. 공백·줄바꿈을 제거하고 비교한다.
export function findCardCompanyInText(text) {
  const normalized = (text || "").replace(/\s+/g, "");
  if (!normalized) return "";

  const exactMatch = cardCompanyAliases.find((alias) => normalized.includes(alias));
  if (exactMatch) return cardCompanyDirectory[exactMatch].name;

  const fuzzyMatch = cardCompanyAliases.find((alias) => fuzzyIncludes(normalized, alias));
  return fuzzyMatch ? cardCompanyDirectory[fuzzyMatch].name : "";
}
