import { createImageInput } from "./adapters/imageInput.js";
import { bindActionSheet } from "./components/ActionSheet.js";
import { bindErrorModal, mapImageError } from "./components/ErrorModal.js";
import { optimizeImage, formatByteSize } from "./utils/imageOptimizer.js";
import { showToast } from "./utils/toast.js";

const appState = {
  pendingImage: null
};

function showView(viewName) {
  document.getElementById("dashboardView").hidden = viewName !== "dashboard";
  document.getElementById("previewView").hidden = viewName !== "preview";
}

function setLoading(isLoading) {
  document.getElementById("loadingOverlay").hidden = !isLoading;
}

function renderPreview(pendingImage) {
  const previewImage = document.getElementById("previewImage");
  const previewMeta = document.getElementById("previewMeta");
  previewImage.src = pendingImage.previewDataUrl;
  previewMeta.textContent = `${pendingImage.width}×${pendingImage.height} · ${formatByteSize(pendingImage.byteSize)}`;
}

async function handleSelectedFile(file) {
  setLoading(true);
  try {
    const optimized = await optimizeImage(file);
    appState.pendingImage = optimized;
    renderPreview(optimized);
    showView("preview");
  } catch (error) {
    appState.pendingImage = null;
    const copy = mapImageError(error);
    errorModal.openModal(copy);
  } finally {
    setLoading(false);
  }
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
    appState.pendingImage = null;
    document.getElementById("previewImage").removeAttribute("src");
    showView("dashboard");
  });
  document.getElementById("previewRetryBtn").addEventListener("click", () => {
    actionSheet.openSheet();
  });
  document.getElementById("analyzeReadyBtn").addEventListener("click", () => {
    if (!appState.pendingImage) {
      showToast("사진을 먼저 선택해 주세요.");
      return;
    }
    // AI 호출은 다음 단계. 페이로드만 준비된 상태.
    console.log("analyzePayloadReady", {
      mimeType: appState.pendingImage.mimeType,
      byteSize: appState.pendingImage.byteSize,
      width: appState.pendingImage.width,
      height: appState.pendingImage.height,
      base64Length: appState.pendingImage.uploadBase64.length
    });
    showToast("이미지 준비 완료. AI 분석은 다음에 연결합니다.");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bindDashboard();
  bindPreview();
  showView("dashboard");
});
