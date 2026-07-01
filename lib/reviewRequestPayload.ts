import type { RiotTimelineEvidence } from "@/types/riot";
import type { DeathReviewInput } from "@/types/review";
import type { VideoReviewDraft } from "@/types/videoDraft";

export type ReviewRequestPayload =
  | DeathReviewInput
  | {
      manualInput: DeathReviewInput;
      videoDraft?: VideoReviewDraft;
      riotEvidence?: RiotTimelineEvidence;
    };

export function buildReviewRequestPayload({
  input,
  videoDraft,
  riotEvidence,
}: {
  input: DeathReviewInput;
  videoDraft?: VideoReviewDraft | null;
  riotEvidence?: RiotTimelineEvidence | null;
}): ReviewRequestPayload {
  if (!videoDraft && !riotEvidence) return input;

  return {
    manualInput: input,
    ...(videoDraft ? { videoDraft } : {}),
    ...(riotEvidence ? { riotEvidence } : {}),
  };
}
