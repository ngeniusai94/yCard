export function bindErrorModal(modal) {
  const titleEl = modal.querySelector("[data-error-title]");
  const bodyEl = modal.querySelector("[data-error-body]");
  const closeBtn = modal.querySelector("[data-error-close]");

  function closeModal() {
    modal.hidden = true;
  }

  function openModal({ title, body }) {
    titleEl.textContent = title;
    bodyEl.textContent = body;
    modal.hidden = false;
  }

  closeBtn.addEventListener("click", closeModal);
  modal.querySelector("[data-error-dim]").addEventListener("click", closeModal);

  return { openModal, closeModal };
}

export function mapImageError(error) {
  const code = error && error.message;
  if (code === "INVALID_TYPE") {
    return {
      title: "이미지 파일만 선택할 수 있어요",
      body: "JPG, PNG, WEBP 사진을 선택해 주세요."
    };
  }
  if (code === "TOO_LARGE") {
    return {
      title: "사진이 너무 커요",
      body: "더 작은 사진으로 다시 선택해 주세요."
    };
  }
  return {
    title: "사진을 준비하지 못했어요",
    body: "초점을 맞추고 다시 촬영하거나, 다른 사진을 선택해 주세요."
  };
}
