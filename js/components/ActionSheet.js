export function bindActionSheet({ sheet, onCamera, onGallery, onCancel }) {
  const dim = sheet.querySelector("[data-sheet-dim]");
  const cameraBtn = sheet.querySelector("[data-sheet-camera]");
  const galleryBtn = sheet.querySelector("[data-sheet-gallery]");
  const cancelBtn = sheet.querySelector("[data-sheet-cancel]");

  function closeSheet() {
    sheet.hidden = true;
  }

  function openSheet() {
    sheet.hidden = false;
  }

  dim.addEventListener("click", () => {
    closeSheet();
    onCancel();
  });
  cameraBtn.addEventListener("click", () => {
    closeSheet();
    onCamera();
  });
  galleryBtn.addEventListener("click", () => {
    closeSheet();
    onGallery();
  });
  cancelBtn.addEventListener("click", () => {
    closeSheet();
    onCancel();
  });

  return { openSheet, closeSheet };
}
