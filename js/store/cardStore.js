// 1차는 서버 없이 카드명·카드사만 기기에 기억한다. 카드번호는 넣지 않는다.
const STORAGE_KEY = "ycard.cards.v1";
const MAX_CARD_COUNT = 30;

function createCardId() {
  return `card_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function readCards() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function writeCards(cards) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

export function loadCards() {
  return readCards();
}

export function rememberCard({ cardName, cardCompany }) {
  const name = (cardName || "").trim();
  const company = (cardCompany || "").trim();
  if (!name) {
    throw new Error("EMPTY_NAME");
  }

  const cards = readCards();
  const alreadyRemembered = cards.some(
    (card) => card.cardName === name && card.cardCompany === company
  );
  if (alreadyRemembered) {
    throw new Error("ALREADY_SAVED");
  }
  if (cards.length >= MAX_CARD_COUNT) {
    throw new Error("CARD_LIMIT");
  }

  const now = Date.now();
  const savedCard = {
    id: createCardId(),
    cardName: name,
    cardCompany: company,
    createdAt: now,
    updatedAt: now
  };

  try {
    writeCards([savedCard, ...cards]);
  } catch (_error) {
    throw new Error("STORAGE_FULL");
  }
  return savedCard;
}
