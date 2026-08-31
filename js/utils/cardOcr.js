// 이미지를 서버(AI)로 보내지 않고, 브라우저에서 직접 OCR로 글자만 읽어낸다.
// Tesseract.js는 CDN에서 동적으로 불러오므로 최초 1회만 언어 데이터를 내려받는다.
const TESSERACT_ESM_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@6/dist/tesseract.esm.min.js";
const OCR_LANGS = "kor+eng";
const OCR_MAX_EDGE = 1800;
const OCR_MIN_EDGE = 1200;
const DARK_BG_MEAN = 140;

// 카드 디자인은 로고·상품명이 세로로 적힌 경우가 많아, 회전값을 바꿔가며 시도한다.
export const OCR_ROTATIONS = [0, 90, 270];

let workerPromise = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { default: Tesseract } = await import(TESSERACT_ESM_URL);
      const worker = await Tesseract.createWorker(OCR_LANGS);
      // 카드 디자인은 문단이 아니라 흩어진 로고/문구라서, 희소 텍스트 모드가 더 잘 잡는다.
      await worker.setParameters({ tessedit_pageseg_mode: "11" });
      return worker;
    })().catch((error) => {
      workerPromise = null;
      throw error;
    });
  }
  return workerPromise;
}

export class CardOcrError extends Error {
  constructor(code) {
    super(code);
    this.name = "CardOcrError";
    this.code = code;
  }
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

function getSourceSize(source) {
  return {
    width: source.width || source.naturalWidth,
    height: source.height || source.naturalHeight
  };
}

function toGray(red, green, blue) {
  return 0.299 * red + 0.587 * green + 0.114 * blue;
}

// Tesseract는 어두운 글자 + 밝은 배경을 잘 읽는다.
// 빨간/남색 카드처럼 흰 글자면 평균 밝기가 낮으니 색을 뒤집어 준다.
function enhancePixels(context, canvas) {
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;
  let graySum = 0;
  const sampleCount = pixels.length / 4;

  for (let index = 0; index < pixels.length; index += 4) {
    graySum += toGray(pixels[index], pixels[index + 1], pixels[index + 2]);
  }
  const meanGray = graySum / sampleCount;
  const invert = meanGray < DARK_BG_MEAN;

  for (let index = 0; index < pixels.length; index += 4) {
    let gray = toGray(pixels[index], pixels[index + 1], pixels[index + 2]);
    if (invert) {
      gray = 255 - gray;
    }
    gray = (gray - 128) * 1.7 + 128;
    gray = Math.max(0, Math.min(255, gray));
    pixels[index] = gray;
    pixels[index + 1] = gray;
    pixels[index + 2] = gray;
  }

  context.putImageData(imageData, 0, 0);
}

function drawRotatedOcrCanvas(source, rotationDeg, maxEdge) {
  const { width: sourceWidth, height: sourceHeight } = getSourceSize(source);
  const longEdge = Math.max(sourceWidth, sourceHeight);
  let scale = longEdge > maxEdge ? maxEdge / longEdge : 1;
  if (longEdge < OCR_MIN_EDGE) {
    scale = OCR_MIN_EDGE / longEdge;
  }
  const drawWidth = Math.round(sourceWidth * scale);
  const drawHeight = Math.round(sourceHeight * scale);
  const swapped = rotationDeg === 90 || rotationDeg === 270;

  const canvas = document.createElement("canvas");
  canvas.width = swapped ? drawHeight : drawWidth;
  canvas.height = swapped ? drawWidth : drawHeight;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.save();
  if (rotationDeg === 90) {
    context.translate(canvas.width, 0);
    context.rotate((90 * Math.PI) / 180);
  } else if (rotationDeg === 270) {
    context.translate(0, canvas.height);
    context.rotate((-90 * Math.PI) / 180);
  }
  context.drawImage(source, 0, 0, drawWidth, drawHeight);
  context.restore();
  enhancePixels(context, canvas);
  return canvas;
}

/**
 * 카드 이미지에서 텍스트를 추출한다. 세로로 적힌 로고·상품명도 잡을 수 있도록
 * 지정한 회전 각도로 이미지를 돌려서 인식한다.
 * @param {File} file - 사용자가 선택한 원본 이미지 파일
 * @param {0 | 90 | 270} rotationDeg
 * @returns {Promise<string>} OCR 원문 텍스트
 */
export async function recognizeCardText(file, rotationDeg = 0) {
  if (!file) {
    throw new CardOcrError("INVALID_IMAGE");
  }

  try {
    const bitmap = await loadBitmap(file);
    const canvas = drawRotatedOcrCanvas(bitmap, rotationDeg, OCR_MAX_EDGE);
    if (bitmap.close) {
      bitmap.close();
    }

    const worker = await getWorker();
    const { data } = await worker.recognize(canvas);
    return data?.text || "";
  } catch (_error) {
    throw new CardOcrError("OCR_FAILED");
  }
}
