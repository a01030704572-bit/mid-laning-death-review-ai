import { createPartFromUri, FileState, GoogleGenAI } from "@google/genai";
import type {
  AiProvider,
  VideoDraftGenerationOptions,
} from "@/lib/ai/types";

export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export function resolveGeminiModel(model = process.env.GEMINI_MODEL) {
  return model?.trim() || DEFAULT_GEMINI_MODEL;
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
      model: resolveGeminiModel(),
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
        model: resolveGeminiModel(),
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
