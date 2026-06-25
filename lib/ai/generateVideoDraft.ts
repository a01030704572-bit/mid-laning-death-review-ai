import { geminiProvider } from "@/lib/ai/geminiProvider";
import {
  FfmpegExecutableMissingError,
  OpenAiApiKeyMissingError,
  openAiFrameProvider,
} from "@/lib/ai/openAiFrameProvider";
import type {
  VideoDraftGenerationOptions,
  VideoDraftProviderName,
} from "@/lib/ai/types";

export class UnsupportedVideoProviderError extends Error {}
export class VideoInputUnsupportedError extends Error {}
export { FfmpegExecutableMissingError, OpenAiApiKeyMissingError };

export function resolveVideoDraftProvider(
  provider = process.env.VIDEO_DRAFT_PROVIDER ?? process.env.AI_PROVIDER
): VideoDraftProviderName {
  const normalizedProvider = provider?.trim().toLowerCase() || "gemini";

  if (normalizedProvider !== "gemini" && normalizedProvider !== "openai") {
    throw new UnsupportedVideoProviderError(
      `Video draft is not supported by provider: ${normalizedProvider}`
    );
  }

  return normalizedProvider;
}

function isVideoInputUnsupportedError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  const isUnsupported =
    message.includes("not support") || message.includes("unsupported");
  return (
    isUnsupported &&
    (message.includes("video") ||
      message.includes("input modality") ||
      message.includes("media input"))
  );
}

export async function generateVideoDraft(
  prompt: string,
  clip: Blob,
  mimeType: string,
  options?: VideoDraftGenerationOptions
) {
  const provider = resolveVideoDraftProvider(options?.provider);

  try {
    switch (provider) {
      case "gemini":
        return await geminiProvider.generateVideoDraft(
          prompt,
          clip,
          mimeType,
          options
        );
      case "openai":
        return await openAiFrameProvider.generateVideoDraft(
          prompt,
          clip,
          mimeType,
          options
        );
    }
  } catch (error) {
    if (provider === "gemini" && isVideoInputUnsupportedError(error)) {
      throw new VideoInputUnsupportedError(
        "The configured Gemini model does not support video input."
      );
    }
    throw error;
  }
}
