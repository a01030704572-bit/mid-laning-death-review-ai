import type { RiotTimelineEvidence } from "@/types/riot";
import type { DeathReviewInput } from "@/types/review";
import type { VideoReviewDraft } from "@/types/videoDraft";

export type VideoDraftSourceState =
  | "none"
  | "generated_not_applied"
  | "applied";

export type ReviewRequestPayload =
  | DeathReviewInput
  | {
      manualInput: DeathReviewInput;
      videoDraft?: VideoReviewDraft;
      riotEvidence?: RiotTimelineEvidence;
      videoDraftSourceState?: VideoDraftSourceState;
    };

export function buildReviewRequestPayload({
  input,
  videoDraft,
  riotEvidence,
  videoDraftSourceState,
}: {
  input: DeathReviewInput;
  videoDraft?: VideoReviewDraft | null;
  riotEvidence?: RiotTimelineEvidence | null;
  videoDraftSourceState?: VideoDraftSourceState;
}): ReviewRequestPayload {
  if (!videoDraft && !riotEvidence && !videoDraftSourceState) return input;

  return {
    manualInput: input,
    ...(videoDraft ? { videoDraft } : {}),
    ...(riotEvidence ? { riotEvidence } : {}),
    ...(videoDraftSourceState ? { videoDraftSourceState } : {}),
  };
}
