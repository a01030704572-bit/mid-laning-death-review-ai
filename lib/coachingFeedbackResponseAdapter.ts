import {
  buildCoachingFeedbackPipeline,
  type BuildCoachingFeedbackPipelineResult,
} from "@/lib/coachingFeedbackPipeline";

type MatchReviewFeedbackInput = {
  matchId?: string;
  puuid?: string;
  rankedScenes?: unknown[];
  topScenes?: unknown[];
  improvementScenes?: unknown[];
  strengthScenes?: unknown[];
  generatedAt?: string;
};

export type CoachingFeedbackPreviewResponse = {
  coachingFeedbackPreview: BuildCoachingFeedbackPipelineResult | null;
  coachingFeedbackPreviewWarnings: string[];
};

export function buildCoachingFeedbackPreviewForMatchReview(
  input: {
    report: MatchReviewFeedbackInput;
    generatedAtIsoTimestamp?: string;
  },
  buildPipeline = buildCoachingFeedbackPipeline
): CoachingFeedbackPreviewResponse {
  try {
    const feedbackPreview = buildPipeline({
      matchId: input.report.matchId,
      puuid: input.report.puuid,
      rankedScenes: input.report.rankedScenes,
      topScenes: input.report.topScenes,
      improvementScenes: input.report.improvementScenes,
      strengthScenes: input.report.strengthScenes,
      generatedAtIsoTimestamp:
        input.generatedAtIsoTimestamp ??
        input.report.generatedAt ??
        new Date().toISOString(),
    });

    return {
      coachingFeedbackPreview: feedbackPreview,
      coachingFeedbackPreviewWarnings: [],
    };
  } catch (error) {
    console.warn("Coaching feedback preview generation failed.", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return {
      coachingFeedbackPreview: null,
      coachingFeedbackPreviewWarnings: [
        "Coaching feedback preview could not be generated.",
      ],
    };
  }
}
