export type AiProviderName = "gemini";
export type VideoDraftProviderName = "gemini" | "openai";

export type AiTextGenerationProvider = {
  generateCoachingReview: (prompt: string) => Promise<string | undefined>;
};

export type VideoDraftGenerationOptions = {
  provider?: VideoDraftProviderName;
  timeoutMs?: number;
  pollIntervalMs?: number;
};

export type AiVideoDraftProvider = {
  generateVideoDraft: (
    prompt: string,
    clip: Blob,
    mimeType: string,
    options?: VideoDraftGenerationOptions
  ) => Promise<string | undefined>;
};

export type AiProvider = AiTextGenerationProvider & AiVideoDraftProvider;
