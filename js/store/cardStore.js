// 1차는 서버 없이 기기에만 저장한다. 카드번호는 넣지 않는다.
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

export function saveAnalyzedCard({ card, thumbnailDataUrl, confidence, source }) {
  const cards = readCards();
  if (cards.length >= MAX_CARD_COUNT) {
    throw new Error("CARD_LIMIT");
  }

  const now = Date.now();
  const savedCard = {
    id: createCardId(),
    cardName: card.cardName.trim(),
    cardCompany: (card.cardCompany || "").trim(),
    cardType: card.cardType || "UNKNOWN",
    performance: card.performance || { previousMonthSpend: 0, note: "" },
    benefits: card.benefits || [],
    cautions: card.cautions || [],
    thumbnailDataUrl: thumbnailDataUrl || "",
    confidence: confidence || 0,
    source: source || "VISION",
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
