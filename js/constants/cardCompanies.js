// 카드사 별칭 → { 대표명, 홈페이지 } 매핑. 클라이언트(OCR 파싱)와 서버(홈페이지 링크) 양쪽에서 공유한다.
export const cardCompanyDirectory = {
  신한카드: { name: "신한카드", homePage: "https://www.shinhancard.com" },
  신한: { name: "신한카드", homePage: "https://www.shinhancard.com" },
  현대카드: { name: "현대카드", homePage: "https://www.hyundaicard.com" },
  현대: { name: "현대카드", homePage: "https://www.hyundaicard.com" },
  삼성카드: { name: "삼성카드", homePage: "https://www.samsungcard.com" },
  삼성: { name: "삼성카드", homePage: "https://www.samsungcard.com" },
  KB국민카드: { name: "KB국민카드", homePage: "https://card.kbcard.com" },
  국민카드: { name: "KB국민카드", homePage: "https://card.kbcard.com" },
  국민: { name: "KB국민카드", homePage: "https://card.kbcard.com" },
  KB: { name: "KB국민카드", homePage: "https://card.kbcard.com" },
  우리카드: { name: "우리카드", homePage: "https://www.wooricard.com" },
  우리: { name: "우리카드", homePage: "https://www.wooricard.com" },
  하나카드: { name: "하나카드", homePage: "https://www.hanacard.co.kr" },
  하나: { name: "하나카드", homePage: "https://www.hanacard.co.kr" },
  롯데카드: { name: "롯데카드", homePage: "https://www.lottecard.co.kr" },
  롯데: { name: "롯데카드", homePage: "https://www.lottecard.co.kr" },
  NH농협카드: { name: "NH농협카드", homePage: "https://card.nonghyup.com" },
  농협카드: { name: "NH농협카드", homePage: "https://card.nonghyup.com" },
  농협: { name: "NH농협카드", homePage: "https://card.nonghyup.com" },
  IBK기업은행: { name: "IBK기업은행", homePage: "https://www.ibk.co.kr" },
  기업은행: { name: "IBK기업은행", homePage: "https://www.ibk.co.kr" },
  BC카드: { name: "BC카드", homePage: "https://www.bccard.com" },
  BC: { name: "BC카드", homePage: "https://www.bccard.com" },
  BNK부산은행: { name: "BNK부산은행", homePage: "https://www.busanbank.co.kr" },
  부산은행: { name: "BNK부산은행", homePage: "https://www.busanbank.co.kr" },
  BNK경남은행: { name: "BNK경남은행", homePage: "https://www.knbank.co.kr" },
  경남은행: { name: "BNK경남은행", homePage: "https://www.knbank.co.kr" },
  광주은행: { name: "광주은행", homePage: "https://www.kjbank.com" },
  전북은행: { name: "전북은행", homePage: "https://www.jbbank.co.kr" },
  제주은행: { name: "제주은행", homePage: "https://www.jejubank.co.kr" },
  수협은행: { name: "Sh수협은행", homePage: "https://www.suhyup-bank.com" },
  카카오뱅크: { name: "카카오뱅크", homePage: "https://www.kakaobank.com" },
  케이뱅크: { name: "케이뱅크", homePage: "https://www.kbanknow.com" },
  토스뱅크: { name: "토스뱅크", homePage: "https://www.tossbank.com" }
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

export function findCardCompanyHomePage(cardCompany) {
  const company = (cardCompany || "").replaceAll(" ", "");
  if (!company) return "";
  if (cardCompanyDirectory[company]) return cardCompanyDirectory[company].homePage;
  const matchedKey = cardCompanyAliases.find((alias) => company.includes(alias));
  return matchedKey ? cardCompanyDirectory[matchedKey].homePage : "";
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
