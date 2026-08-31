// 이미지는 서버로 전송하지 않는다. 화면 미리보기용으로만 축소한다.
// (OCR은 원본 파일을 별도 해상도로 다시 렌더링해서 읽는다 — utils/cardOcr.js)
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_EDGE = 768;
const TARGET_BYTES = 400 * 1024;
const MAX_BYTES = 800 * 1024;

export function isAllowedImage(file) {
  if (!file) return false;
  if (ALLOWED_TYPES.includes(file.type)) return true;
  // 일부 브라우저는 HEIC type을 비워 둠
  const name = (file.name || "").toLowerCase();
  return name.endsWith(".heic") || name.endsWith(".heif") || name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png") || name.endsWith(".webp");
}

function scaleSize(width, height, maxEdge) {
  const longEdge = Math.max(width, height);
  if (longEdge <= maxEdge) {
    return { width, height };
  }
  const ratio = maxEdge / longEdge;
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio)
  };
}

async function loadBitmap(file) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch (_error) {
      // HEIC 등 미지원 시 아래 Image 경로로 재시도
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("LOAD_FAIL"));
      element.src = objectUrl;
    });
    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function drawToCanvas(source, maxEdge) {
  const sourceWidth = source.width;
  const sourceHeight = source.height;
  const size = scaleSize(sourceWidth, sourceHeight, maxEdge);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  context.drawImage(source, 0, 0, size.width, size.height);
  return canvas;
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("ENCODE_FAIL"));
        return;
      }
      resolve(blob);
    }, "image/jpeg", quality);
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("READ_FAIL"));
    reader.readAsDataURL(blob);
  });
}

export function formatByteSize(byteSize) {
  if (byteSize < 1024) return `${byteSize} B`;
  const kiloByte = byteSize / 1024;
  if (kiloByte < 1024) return `${kiloByte.toFixed(0)} KB`;
  return `${(kiloByte / 1024).toFixed(2)} MB`;
}

export async function optimizeImage(file) {
  if (!isAllowedImage(file)) {
    throw new Error("INVALID_TYPE");
  }

  const bitmap = await loadBitmap(file);
  const previewCanvas = drawToCanvas(bitmap, MAX_EDGE);

  let quality = 0.72;
  let blob = await canvasToBlob(previewCanvas, quality);
  if (blob.size > TARGET_BYTES) {
    quality = 0.6;
    blob = await canvasToBlob(previewCanvas, quality);
  }
  if (blob.size > MAX_BYTES) {
    quality = 0.5;
    blob = await canvasToBlob(previewCanvas, quality);
  }
  if (blob.size > MAX_BYTES) {
    throw new Error("TOO_LARGE");
  }

  const previewDataUrl = await blobToDataUrl(blob);

  if (bitmap.close) {
    bitmap.close();
  }

  return {
    previewDataUrl,
    byteSize: blob.size,
    mimeType: "image/jpeg",
    width: previewCanvas.width,
    height: previewCanvas.height
  };
}
