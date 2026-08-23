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
      return `
        <article class="rich-card">
          <p class="card-company">${escapeHtml(card.cardCompany)}</p>
          <h2 class="card-name">${escapeHtml(card.cardName)}</h2>
        </article>
      `;
    })
    .join("");
}
