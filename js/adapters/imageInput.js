// 웹은 input[type=file], 이후 Cordova는 이 어댑터만 교체한다.
export function createImageInput({ cameraInput, galleryInput, onFile, onCancel }) {
  function bindInput(input) {
    input.addEventListener("change", () => {
      const file = input.files && input.files[0];
      input.value = "";
      if (!file) {
        onCancel();
        return;
      }
      onFile(file);
    });
  }

  bindInput(cameraInput);
  bindInput(galleryInput);

  return {
    openCamera() {
      cameraInput.click();
    },
    openGallery() {
      galleryInput.click();
    }
  };
}
