import { createPartFromUri, FileState, GoogleGenAI } from "@google/genai";
import type {
  AiProvider,
  VideoDraftGenerationOptions,
} from "@/lib/ai/types";

export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";
export const DEFAULT_GEMINI_REVIEW_MODEL = "gemini-2.5-flash";
export const DEFAULT_GEMINI_VIDEO_MODEL = "gemini-2.5-flash";
export const GEMINI_QUOTA_ERROR_MESSAGE =
  "Gemini 무료 요청 한도를 초과했습니다. 잠시 후 다시 시도하거나 모델/결제 설정을 확인해 주세요.";
export const GEMINI_UNAVAILABLE_ERROR_MESSAGE =
  "Gemini 모델이 일시적으로 혼잡합니다. 잠시 후 다시 시도해 주세요.";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export function resolveGeminiModel(model = process.env.GEMINI_MODEL) {
  return model?.trim() || DEFAULT_GEMINI_MODEL;
}

export function resolveGeminiReviewModel(
  model = process.env.GEMINI_REVIEW_MODEL ?? process.env.GEMINI_MODEL
) {
  return model?.trim() || DEFAULT_GEMINI_REVIEW_MODEL;
}

export function resolveGeminiVideoModel(
  model = process.env.GEMINI_VIDEO_MODEL ?? process.env.GEMINI_MODEL
) {
  return model?.trim() || DEFAULT_GEMINI_VIDEO_MODEL;
}

function getErrorField(error: unknown, field: string) {
  if (!error || typeof error !== "object") return undefined;
  const value = (error as Record<string, unknown>)[field];
  return typeof value === "string" || typeof value === "number"
    ? value
    : undefined;
}

export function getGeminiErrorLogContext(error: unknown) {
  return {
    status: getErrorField(error, "status"),
    code: getErrorField(error, "code"),
    message: error instanceof Error ? error.message : undefined,
  };
}

export function isGeminiQuotaError(error: unknown) {
  const status = getErrorField(error, "status");
  const code = getErrorField(error, "code");
  const message = error instanceof Error ? error.message : "";

  return (
    status === 429 ||
    code === 429 ||
    code === "RESOURCE_EXHAUSTED" ||
    message.includes("RESOURCE_EXHAUSTED") ||
    message.includes("generate_content_free_tier_requests")
  );
}

export function isGeminiUnavailableError(error: unknown) {
  const status = getErrorField(error, "status");
  const code = getErrorField(error, "code");
  const message = error instanceof Error ? error.message : "";

  return (
    status === 503 ||
    code === 503 ||
    code === "UNAVAILABLE" ||
    message.includes("UNAVAILABLE") ||
    message.toLowerCase().includes("high demand")
  );
}

function wait(durationMs: number) {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}

async function waitForActiveFile(
  uploadedFile: Awaited<ReturnType<typeof ai.files.upload>>,
  options?: VideoDraftGenerationOptions
) {
  const timeoutMs = options?.timeoutMs ?? 60_000;
  const pollIntervalMs = options?.pollIntervalMs ?? 2_000;
  const deadline = Date.now() + timeoutMs;
  let currentFile = uploadedFile;

  if (!currentFile.name) {
    throw new Error("Gemini did not return an uploaded file name.");
  }
  const fileName = currentFile.name;

  while (currentFile.state === FileState.PROCESSING) {
    if (Date.now() >= deadline) {
      throw new Error("Gemini video processing timed out.");
    }
    await wait(pollIntervalMs);
    currentFile = await ai.files.get({ name: fileName });
  }

  if (currentFile.state === FileState.FAILED) {
    throw new Error("Gemini video processing failed.");
  }
  if (currentFile.state !== FileState.ACTIVE) {
    throw new Error("Gemini video file did not become active.");
  }

  return currentFile;
}

export const geminiProvider: AiProvider = {
  async generateCoachingReview(prompt) {
    const response = await ai.models.generateContent({
      model: resolveGeminiReviewModel(),
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    return response.text;
  },

  async generateVideoDraft(prompt, clip, mimeType, options) {
    const uploadedFile = await ai.files.upload({
      file: clip,
      config: { mimeType },
    });

    try {
      const activeFile = await waitForActiveFile(uploadedFile, options);
      if (!activeFile.uri || !activeFile.mimeType) {
        throw new Error("Gemini active video file is missing its URI or MIME type.");
      }

      const response = await ai.models.generateContent({
        model: resolveGeminiVideoModel(),
        contents: [
          {
            role: "user",
            parts: [
              createPartFromUri(activeFile.uri, activeFile.mimeType),
              { text: prompt },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
        },
      });

      return response.text;
    } finally {
      if (uploadedFile.name) {
        try {
          await ai.files.delete({ name: uploadedFile.name });
        } catch (error) {
          console.warn("Failed to delete Gemini video draft file.", error);
        }
      }
    }
  },
};
