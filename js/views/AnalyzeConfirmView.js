function createBenefitRow(benefit = {}) {
  const row = document.createElement("div");
  row.className = "benefit-row";
  row.innerHTML = `
    <input class="form-input" data-benefit-title type="text" placeholder="혜택 제목" value="" />
    <select class="form-input" data-benefit-type>
      <option value="DISCOUNT">할인</option>
      <option value="POINT">적립</option>
      <option value="CASHBACK">캐시백</option>
    </select>
    <button type="button" class="row-remove" aria-label="혜택 삭제">삭제</button>
  `;
  row.querySelector("[data-benefit-title]").value = benefit.title || "";
  row.querySelector("[data-benefit-type]").value = benefit.type || "DISCOUNT";
  row.querySelector(".row-remove").addEventListener("click", () => {
    const list = document.getElementById("benefitList");
    if (list.children.length > 1) {
      row.remove();
    }
  });
  return row;
}

export function emptyConfirmCard() {
  return {
    cardName: "",
    cardCompany: "",
    cardType: "UNKNOWN",
    performance: { previousMonthSpend: 0, note: "" },
    benefits: []
  };
}

export function fillConfirmForm(card) {
  document.getElementById("inputCardName").value = card.cardName || "";
  document.getElementById("inputCardCompany").value = card.cardCompany || "";
  document.getElementById("inputCardType").value = card.cardType || "UNKNOWN";
  document.getElementById("inputPerformanceNote").value = card.performance?.note || "";
  document.getElementById("inputPerformanceSpend").value = card.performance?.previousMonthSpend || "";

  const list = document.getElementById("benefitList");
  list.innerHTML = "";
  const benefits = (card.benefits || [])
    .slice(0, 8)
    .map((benefit) => ({
      title: benefit.title || [benefit.category, benefit.rateOrAmount].filter(Boolean).join(" "),
      type: benefit.type || "DISCOUNT"
    }));
  (benefits.length ? benefits : [{}]).forEach((benefit) => list.appendChild(createBenefitRow(benefit)));
}

export function bindConfirmForm() {
  document.getElementById("addBenefitBtn").addEventListener("click", () => {
    document.getElementById("benefitList").appendChild(createBenefitRow());
  });
}

export function readConfirmForm() {
  const spendRaw = document.getElementById("inputPerformanceSpend").value;
  const benefits = [...document.querySelectorAll("#benefitList .benefit-row")]
    .map((row) => ({
      title: row.querySelector("[data-benefit-title]").value.trim(),
      type: row.querySelector("[data-benefit-type]").value
    }))
    .filter((benefit) => benefit.title);

  return {
    cardName: document.getElementById("inputCardName").value.trim(),
    cardCompany: document.getElementById("inputCardCompany").value.trim(),
    cardType: document.getElementById("inputCardType").value,
    performance: {
      previousMonthSpend: Number(spendRaw) || 0,
      note: document.getElementById("inputPerformanceNote").value.trim()
    },
    benefits,
    cautions: []
  };
}
