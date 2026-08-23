import { logApp, logAppError, summarizeAnalyzeResult } from "../utils/logger.js";

const ANALYZE_TIMEOUT_MS = 40000;

export class AnalyzeError extends Error {
  constructor(code) {
    super(code);
    this.name = "AnalyzeError";
    this.code = code;
  }
}

async function postAnalyze(body, signal) {
  const startedAt = Date.now();
  logApp("analyze.send", {
    mimeType: body.mimeType,
    locale: body.locale,
    base64Length: body.imageBase64?.length || 0,
    approxByteSize: Math.round((body.imageBase64?.length || 0) * 0.75)
  });

  const response = await fetch("/api/analyze-card", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal
  });

  if (response.status === 429) {
    logAppError("analyze.receive.error", { status: 429, code: "RATE_LIMIT", elapsedMs: Date.now() - startedAt });
    throw new AnalyzeError("RATE_LIMIT");
  }
  if (response.status >= 500) {
    logAppError("analyze.receive.error", { status: response.status, code: "SERVER", elapsedMs: Date.now() - startedAt });
    throw new AnalyzeError("SERVER");
  }
  if (!response.ok) {
    logAppError("analyze.receive.error", { status: response.status, code: "REQUEST", elapsedMs: Date.now() - startedAt });
    throw new AnalyzeError("REQUEST");
  }

  const data = await response.json();
  if (!data || typeof data !== "object" || !data.card) {
    logAppError("analyze.receive.error", { code: "SCHEMA", elapsedMs: Date.now() - startedAt });
    throw new AnalyzeError("SCHEMA");
  }

  logApp("analyze.receive", {
    ...summarizeAnalyzeResult(data),
    elapsedMs: Date.now() - startedAt
  });
  return data;
}

function shouldRetry(error, signal) {
  if (signal?.aborted) return false;
  if (error instanceof AnalyzeError) {
    return error.code === "SERVER" || error.code === "NETWORK";
  }
  return error instanceof TypeError;
}

export async function analyzeCard({ imageBase64, mimeType, signal }) {
  const body = {
    imageBase64,
    mimeType,
    locale: "ko-KR"
  };

  try {
    return await postAnalyze(body, signal);
  } catch (error) {
    if (error.name === "AbortError") {
      throw new AnalyzeError("TIMEOUT");
    }
    if (!navigator.onLine) {
      throw new AnalyzeError("OFFLINE");
    }
    const mapped = error instanceof AnalyzeError ? error : new AnalyzeError("NETWORK");
    if (!shouldRetry(mapped, signal)) {
      throw mapped;
    }
    try {
      return await postAnalyze(body, signal);
    } catch (retryError) {
      if (retryError.name === "AbortError") {
        throw new AnalyzeError("TIMEOUT");
      }
      if (!navigator.onLine) {
        throw new AnalyzeError("OFFLINE");
      }
      throw retryError instanceof AnalyzeError ? retryError : new AnalyzeError("NETWORK");
    }
  }
}

export function createAnalyzeTimeout() {
  const controller = new AbortController();
  const timerId = window.setTimeout(() => controller.abort(), ANALYZE_TIMEOUT_MS);
  return {
    signal: controller.signal,
    cancel() {
      window.clearTimeout(timerId);
      controller.abort();
    },
    clear() {
      window.clearTimeout(timerId);
    }
  };
}

export function isUnreadableResult(data) {
  const cardName = data?.card?.cardName?.trim();
  const confidence = Number(data?.confidence ?? 0);
  return data?.ok === false || !cardName || confidence < 0.45;
}
