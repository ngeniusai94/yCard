function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
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
  summaryText.textContent = `기억 ${cards.length}장`;
  cardList.innerHTML = cards
    .map((card) => {
      const label = [card.cardCompany, card.cardName].filter(Boolean).join(" ");
      return `
        <div class="remember-row">
          <p class="remember-text">${escapeHtml(label)}</p>
          <button type="button" class="delete-btn" data-delete-card="${escapeHtml(card.id)}" aria-label="${escapeHtml(label)} 삭제">×</button>
        </div>
      `;
    })
    .join("");
}
