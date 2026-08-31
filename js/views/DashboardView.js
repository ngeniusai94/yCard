import { findCardCompanyLogo } from "../constants/cardCompanies.js";

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
      const cardName = card.cardName || "카드명 없음";
      const logoUrl = findCardCompanyLogo(card.cardCompany);
      const logoHtml = logoUrl
        ? `<img class="company-logo" src="${logoUrl}" alt="${escapeHtml(card.cardCompany || "")} 로고" />`
        : "";
      return `
        <div class="remember-row">
          <div class="remember-identity">
            ${logoHtml}
            <div>
              <p class="remember-text">${escapeHtml(cardName)}</p>
              ${card.cardCompany ? `<p class="remember-company">${escapeHtml(card.cardCompany)}</p>` : ""}
            </div>
          </div>
          <button type="button" class="delete-btn" data-delete-card="${escapeHtml(card.id)}" aria-label="${escapeHtml(cardName)} 삭제">×</button>
        </div>
      `;
    })
    .join("");
}
