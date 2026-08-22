export function bindErrorModal(modal) {
  const titleEl = modal.querySelector("[data-error-title]");
  const bodyEl = modal.querySelector("[data-error-body]");
  const closeBtn = modal.querySelector("[data-error-close]");
  const secondaryBtn = modal.querySelector("[data-error-secondary]");
  let secondaryHandler = null;

  function closeModal() {
    modal.hidden = true;
    secondaryHandler = null;
  }

  function openModal({ title, body, secondaryLabel, onSecondary }) {
    titleEl.textContent = title;
    bodyEl.textContent = body;
    secondaryHandler = typeof onSecondary === "function" ? onSecondary : null;
    if (secondaryLabel && secondaryHandler) {
      secondaryBtn.textContent = secondaryLabel;
      secondaryBtn.hidden = false;
    } else {
      secondaryBtn.hidden = true;
    }
    modal.hidden = false;
  }

  closeBtn.addEventListener("click", closeModal);
  modal.querySelector("[data-error-dim]").addEventListener("click", closeModal);
  secondaryBtn.addEventListener("click", () => {
    const handler = secondaryHandler;
    closeModal();
    if (handler) handler();
  });

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

export function mapAnalyzeError(error) {
  const code = error && error.code;
  if (code === "OFFLINE") {
    return {
      title: "인터넷 연결을 확인해 주세요",
      body: "저장된 카드는 볼 수 있지만, 분석은 연결이 필요합니다."
    };
  }
  if (code === "TIMEOUT") {
    return {
      title: "분석이 지연되고 있어요",
      body: "사진을 유지해 두었습니다. 잠시 후 다시 시도해 주세요."
    };
  }
  if (code === "RATE_LIMIT") {
    return {
      title: "요청이 많아요",
      body: "잠시 기다렸다가 다시 시도해 주세요."
    };
  }
  if (code === "REQUEST") {
    return {
      title: "사진을 다시 올려 주세요",
      body: "이미지 형식을 확인한 뒤 다시 촬영하거나 선택해 주세요."
    };
  }
  return {
    title: "잠시 후 다시 시도해 주세요",
    body: "분석을 완료하지 못했어요. 같은 사진으로 다시 시도할 수 있습니다."
  };
}
