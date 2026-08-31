function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function benefitTypeLabel(type) {
  if (type === "POINT") return "적립";
  if (type === "CASHBACK") return "캐시백";
  return "할인";
}

function benefitTypeClass(type) {
  return type === "POINT" || type === "CASHBACK" ? "tag-secondary" : "tag-primary";
}

function benefitDetail(benefit) {
  return [benefit.condition, benefit.limit, benefit.rateOrAmount]
    .filter(Boolean)
    .join(" · ");
}

export function fillBenefitResult(card) {
  document.getElementById("resultCardNameInput").value = card.cardName || "";
  document.getElementById("resultCardCompany").textContent = card.cardCompany || "";

  const list = document.getElementById("benefitList");
  const benefits = Array.isArray(card.benefits) ? card.benefits : [];
  if (!benefits.length) {
    list.innerHTML = `<p class="guide-text">표시할 혜택이 없어요. 카드사 페이지에서 확인해 주세요.</p>`;
  } else {
    list.innerHTML = benefits
      .map((benefit) => {
        const title = benefit.title || [benefit.category, benefit.rateOrAmount].filter(Boolean).join(" ");
        const detail = benefitDetail(benefit);
        return `
          <article class="benefit-item">
            <span class="chip ${benefitTypeClass(benefit.type)}">${benefitTypeLabel(benefit.type)}</span>
            <div>
              <p class="benefit-title">${escapeHtml(title)}</p>
              ${detail ? `<p class="benefit-detail">${escapeHtml(detail)}</p>` : ""}
            </div>
          </article>
        `;
      })
      .join("");
  }

  fillLink(document.getElementById("cardSearchLinkBtn"), card.cardSearchUrl);
  fillLink(document.getElementById("officialLinkBtn"), card.officialDetailUrl);
}

function fillLink(linkElement, url) {
  if (url) {
    linkElement.href = url;
    linkElement.hidden = false;
    return;
  }
  linkElement.removeAttribute("href");
  linkElement.hidden = true;
}
