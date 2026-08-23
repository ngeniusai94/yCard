import { createImageInput } from "./adapters/imageInput.js";
import { analyzeCard, createAnalyzeTimeout, isUnreadableResult } from "./api/analyzeCard.js";
import { bindActionSheet } from "./components/ActionSheet.js";
import { bindErrorModal, mapAnalyzeError, mapImageError } from "./components/ErrorModal.js";
import { loadCards, rememberCard } from "./store/cardStore.js";
import { optimizeImage, formatByteSize } from "./utils/imageOptimizer.js";
import { logApp, logAppError } from "./utils/logger.js";
import { showToast } from "./utils/toast.js";
import { fillBenefitResult } from "./views/AnalyzeConfirmView.js";
import { renderDashboard } from "./views/DashboardView.js";

const appState = {
  pendingImage: null,
  currentCard: null,
  analyzeSession: null
};

function showView(viewName) {
  document.getElementById("dashboardView").hidden = viewName !== "dashboard";
  document.getElementById("previewView").hidden = viewName !== "preview";
  document.getElementById("benefitView").hidden = viewName !== "benefit";
}

function refreshDashboard() {
  renderDashboard(loadCards());
}

function setLoading(isLoading, message, canCancel = false) {
  const overlay = document.getElementById("loadingOverlay");
  const text = document.getElementById("loadingText");
  const cancelBtn = document.getElementById("loadingCancelBtn");
  overlay.hidden = !isLoading;
  if (message) {
    text.textContent = message;
  }
  cancelBtn.hidden = !canCancel;
}

function clearPreview() {
  appState.pendingImage = null;
  appState.currentCard = null;
  document.getElementById("previewImage").removeAttribute("src");
}

function renderPreview(pendingImage) {
  const previewImage = document.getElementById("previewImage");
  const previewMeta = document.getElementById("previewMeta");
  previewImage.src = pendingImage.previewDataUrl;
  previewMeta.textContent = `${pendingImage.width}×${pendingImage.height} · ${formatByteSize(pendingImage.byteSize)}`;
}

function openBenefitResult(card) {
  appState.currentCard = card;
  fillBenefitResult(card);
  showView("benefit");
}

async function handleSelectedFile(file) {
  setLoading(true, "사진을 준비하고 있어요", false);
  try {
    const optimized = await optimizeImage(file);
    appState.pendingImage = optimized;
    logApp("image.ready", {
      mimeType: optimized.mimeType,
      width: optimized.width,
      height: optimized.height,
      byteSize: optimized.byteSize,
      base64Length: optimized.uploadBase64.length
    });
    renderPreview(optimized);
    showView("preview");
  } catch (error) {
    appState.pendingImage = null;
    errorModal.openModal(mapImageError(error));
  } finally {
    setLoading(false);
  }
}

async function handleAnalyze() {
  if (!appState.pendingImage) {
    showToast("사진을 먼저 선택해 주세요.");
    return;
  }
  if (appState.analyzeSession) {
    return;
  }
  if (!navigator.onLine) {
    errorModal.openModal(mapAnalyzeError({ code: "OFFLINE" }));
    return;
  }

  const timeout = createAnalyzeTimeout();
  appState.analyzeSession = { timeout, canceledByUser: false };
  setLoading(true, "카드명과 혜택을 읽고 있어요", true);

  try {
    logApp("analyze.start", {
      mimeType: appState.pendingImage.mimeType,
      byteSize: appState.pendingImage.byteSize,
      width: appState.pendingImage.width,
      height: appState.pendingImage.height,
      base64Length: appState.pendingImage.uploadBase64.length
    });

    const result = await analyzeCard({
      imageBase64: appState.pendingImage.uploadBase64,
      mimeType: appState.pendingImage.mimeType,
      signal: timeout.signal
    });

    if (isUnreadableResult(result)) {
      logApp("analyze.unreadable", {
        ok: result.ok,
        confidence: result.confidence,
        cardName: result.card?.cardName || ""
      });
      errorModal.openModal({
        title: "카드를 인식하지 못했어요",
        body: "카드명이 보이게 초점을 맞춘 뒤 다시 찍어 주세요."
      });
      return;
    }

    logApp("analyze.done", {
      cardName: result.card?.cardName || "",
      cardCompany: result.card?.cardCompany || "",
      officialDetailUrl: result.card?.officialDetailUrl || "",
      benefitCount: Array.isArray(result.card?.benefits) ? result.card.benefits.length : 0
    });
    openBenefitResult(result.card);
  } catch (error) {
    if (appState.analyzeSession?.canceledByUser) {
      logApp("analyze.canceled");
      return;
    }
    logAppError("analyze.failed", { code: error.code || error.message });
    errorModal.openModal(mapAnalyzeError(error));
  } finally {
    timeout.clear();
    appState.analyzeSession = null;
    setLoading(false);
  }
}

function handleRememberCard() {
  const card = appState.currentCard;
  if (!card?.cardName) {
    showToast("카드명을 확인하지 못했어요.");
    return;
  }

  try {
    rememberCard({
      cardName: card.cardName,
      cardCompany: card.cardCompany
    });
    clearPreview();
    refreshDashboard();
    showView("dashboard");
    showToast("카드를 기억했어요.");
  } catch (error) {
    if (error.message === "ALREADY_SAVED") {
      showToast("이미 기억한 카드예요.");
      return;
    }
    if (error.message === "CARD_LIMIT") {
      showToast("최대 30장까지 기억할 수 있어요.");
      return;
    }
    if (error.message === "STORAGE_FULL") {
      showToast("기기에 공간이 부족해요.");
      return;
    }
    showToast("기억하지 못했어요. 다시 시도해 주세요.");
  }
}

function handleCancelResult() {
  clearPreview();
  showView("dashboard");
}

const errorModal = bindErrorModal(document.getElementById("errorModal"));

const imageInput = createImageInput({
  cameraInput: document.getElementById("cameraInput"),
  galleryInput: document.getElementById("galleryInput"),
  onFile: handleSelectedFile,
  onCancel() {}
});

const actionSheet = bindActionSheet({
  sheet: document.getElementById("actionSheet"),
  onCamera() {
    imageInput.openCamera();
  },
  onGallery() {
    imageInput.openGallery();
  },
  onCancel() {}
});

function bindDashboard() {
  document.querySelectorAll("[data-open-sheet]").forEach((button) => {
    button.addEventListener("click", () => actionSheet.openSheet());
  });
  document.querySelectorAll("[data-later]").forEach((button) => {
    button.addEventListener("click", () => {
      showToast("설정은 다음 단계에서 연결합니다.");
    });
  });
}

function bindPreview() {
  document.getElementById("previewBackBtn").addEventListener("click", () => {
    clearPreview();
    showView("dashboard");
  });
  document.getElementById("previewRetryBtn").addEventListener("click", () => {
    actionSheet.openSheet();
  });
  document.getElementById("analyzeReadyBtn").addEventListener("click", () => {
    handleAnalyze();
  });
}

function bindBenefitResult() {
  document.getElementById("benefitBackBtn").addEventListener("click", () => {
    showView("preview");
  });
  document.getElementById("cancelResultBtn").addEventListener("click", handleCancelResult);
  document.getElementById("rememberCardBtn").addEventListener("click", handleRememberCard);
}

function bindLoadingCancel() {
  document.getElementById("loadingCancelBtn").addEventListener("click", () => {
    if (!appState.analyzeSession) return;
    appState.analyzeSession.canceledByUser = true;
    appState.analyzeSession.timeout.cancel();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bindDashboard();
  bindPreview();
  bindBenefitResult();
  bindLoadingCancel();
  refreshDashboard();
  showView("dashboard");
});
