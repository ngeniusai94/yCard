export function bindConfirmModal(modal) {
  const titleEl = modal.querySelector("[data-confirm-title]");
  const cancelBtn = modal.querySelector("[data-confirm-cancel]");
  const okBtn = modal.querySelector("[data-confirm-ok]");
  let okHandler = null;

  function closeModal() {
    modal.hidden = true;
    okHandler = null;
  }

  function openModal({ title, okLabel = "기억", onOk }) {
    titleEl.textContent = title;
    okBtn.textContent = okLabel;
    okHandler = typeof onOk === "function" ? onOk : null;
    modal.hidden = false;
  }

  cancelBtn.addEventListener("click", closeModal);
  modal.querySelector("[data-confirm-dim]").addEventListener("click", closeModal);
  okBtn.addEventListener("click", () => {
    const handler = okHandler;
    closeModal();
    if (handler) handler();
  });

  return { openModal, closeModal };
}
