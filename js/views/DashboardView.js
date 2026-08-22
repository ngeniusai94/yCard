function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function cardTypeLabel(cardType) {
  if (cardType === "CHECK") return "체크";
  if (cardType === "CREDIT") return "신용";
  return "기타";
}

function performanceLabel(card) {
  const spend = Number(card.performance?.previousMonthSpend || 0);
  if (!spend) return "실적 없음";
  return `실적 ${Math.round(spend / 10000)}만`;
}

function benefitChips(benefits) {
  const list = Array.isArray(benefits) ? benefits : [];
  const visible = list.slice(0, 3);
  const extraCount = list.length - visible.length;
  const chips = visible.map((benefit) => {
    const isPoint = benefit.type === "POINT" || benefit.type === "CASHBACK";
    const className = isPoint ? "chip tag-secondary" : "chip tag-primary";
    return `<span class="${className}">${escapeHtml(benefit.title || benefit.rateOrAmount)}</span>`;
  });
  if (extraCount > 0) {
    chips.push(`<span class="chip badge-muted">+${extraCount}</span>`);
  }
  return chips.join("");
}

function summaryLine(cards) {
  const titles = cards
    .flatMap((card) => (card.benefits || []).map((benefit) => benefit.title))
    .filter(Boolean);
  const uniqueTitles = [...new Set(titles)].slice(0, 3);
  if (!uniqueTitles.length) return `등록 ${cards.length}장`;
  return `등록 ${cards.length}장 · ${uniqueTitles.join(" · ")}`;
}

export function renderDashboard(cards) {
  const summaryCard = document.getElementById("summaryCard");
  const summaryText = document.getElementById("summaryText");
  const cardList = document.getElementById("cardList");
  const emptyState = document.getElementById("emptyState");

  if (!cards.length) {
    summaryCard.hidden = true;
    cardList.innerHTML = "";
    emptyState.hidden = false;
    return;
  }

  summaryCard.hidden = false;
  emptyState.hidden = true;
  summaryText.textContent = summaryLine(cards);
  cardList.innerHTML = cards
    .map((card) => {
      const typeClass = card.cardType === "CHECK" ? "tag-secondary" : "tag-primary";
      const perfClass = card.performance?.previousMonthSpend ? "tag-secondary" : "badge-muted";
      return `
        <article class="rich-card">
          <div class="card-meta">
            <p>${escapeHtml(card.cardCompany)} · <span class="chip ${typeClass}">${cardTypeLabel(card.cardType)}</span></p>
            <span class="chip ${perfClass}">${performanceLabel(card)}</span>
          </div>
          <h2 class="card-name">${escapeHtml(card.cardName)}</h2>
          <div class="chip-row">${benefitChips(card.benefits)}</div>
        </article>
      `;
    })
    .join("");
}
