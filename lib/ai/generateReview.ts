import { geminiProvider } from "@/lib/ai/geminiProvider";
import type { AiProviderName } from "@/lib/ai/types";

export function resolveAiProvider(
  provider = process.env.AI_PROVIDER
): AiProviderName {
  const normalizedProvider = provider?.trim().toLowerCase() || "gemini";

  if (normalizedProvider !== "gemini") {
    throw new Error(`Unsupported AI provider: ${normalizedProvider}`);
  }

  return normalizedProvider;
}

export async function generateCoachingReview(prompt: string) {
  const provider = resolveAiProvider();

  switch (provider) {
    case "gemini":
      return geminiProvider.generateCoachingReview(prompt);
  }
}
