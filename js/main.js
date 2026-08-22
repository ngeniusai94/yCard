// 레이아웃 확인용. 카메라/분석은 다음 단계에서 연결한다.
function showToast(message) {
  const toast = document.getElementById("appToast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timerId);
  showToast.timerId = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2200);
}

function bindLayoutOnlyActions() {
  const laterMessage = "레이아웃 확인 단계입니다. 카메라는 다음에 연결합니다.";
  document.querySelectorAll("[data-later]").forEach((button) => {
    button.addEventListener("click", () => showToast(laterMessage));
  });
}

document.addEventListener("DOMContentLoaded", bindLayoutOnlyActions);
