import {
  buildCoachingFeedbackPipeline,
  type BuildCoachingFeedbackPipelineResult,
} from "@/lib/coachingFeedbackPipeline";
import { runLocalFeedbackJudgePrecheckForCoachingFeedback } from "@/lib/feedbackJudgeAdapter";
import type {
  FeedbackJudgeIssue,
  FeedbackJudgeResult,
  FeedbackJudgeSafeRewrite,
} from "@/types/feedbackJudge";

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
  feedbackJudgePreview: {
    verdict: FeedbackJudgeResult["verdict"];
    qualityScore: number;
    issues: FeedbackJudgeIssue[];
    shouldShowToUser: boolean;
  } | null;
  feedbackJudgePreviewWarnings: string[];
  feedbackJudgeSafeRewrite?: FeedbackJudgeSafeRewrite;
};

export function buildCoachingFeedbackPreviewForMatchReview(
  input: {
    report: MatchReviewFeedbackInput;
    generatedAtIsoTimestamp?: string;
  },
  buildPipeline = buildCoachingFeedbackPipeline,
  runJudge = runLocalFeedbackJudgePrecheckForCoachingFeedback
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
    const judgePreview = buildFeedbackJudgePreviewSafely({
      feedbackPreview,
      report: input.report,
      runJudge,
    });

    return {
      coachingFeedbackPreview: feedbackPreview,
      coachingFeedbackPreviewWarnings: [],
      ...judgePreview,
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
      feedbackJudgePreview: null,
      feedbackJudgePreviewWarnings: [],
    };
  }
}

function buildFeedbackJudgePreviewSafely({
  feedbackPreview,
  report,
  runJudge,
}: {
  feedbackPreview: BuildCoachingFeedbackPipelineResult;
  report: MatchReviewFeedbackInput;
  runJudge: typeof runLocalFeedbackJudgePrecheckForCoachingFeedback;
}): Pick<
  CoachingFeedbackPreviewResponse,
  "feedbackJudgePreview" | "feedbackJudgePreviewWarnings" | "feedbackJudgeSafeRewrite"
> {
  try {
    const judgeResult = runJudge(feedbackPreview.feedback, {
      selectedMode: "direct",
      evidenceConfidence: "hypothesis",
      supportingFactsKo: extractSafeSupportingFacts(report),
    });

    return {
      feedbackJudgePreview: {
        verdict: judgeResult.verdict,
        qualityScore: judgeResult.qualityScore,
        issues: judgeResult.issues,
        shouldShowToUser: judgeResult.shouldShowToUser,
      },
      feedbackJudgePreviewWarnings: [],
      feedbackJudgeSafeRewrite: judgeResult.safeRewrite,
    };
  } catch (error) {
    console.warn("Feedback judge preview generation failed.", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return {
      feedbackJudgePreview: null,
      feedbackJudgePreviewWarnings: [
        "Feedback judge preview could not be generated.",
      ],
    };
  }
}

function extractSafeSupportingFacts(report: MatchReviewFeedbackInput) {
  return [
    ...extractSceneFacts(report.topScenes),
    ...extractSceneFacts(report.improvementScenes),
    ...extractSceneFacts(report.strengthScenes),
    ...extractSceneFacts(report.rankedScenes),
  ].slice(0, 8);
}

function extractSceneFacts(scenes: unknown[] | undefined) {
  if (!Array.isArray(scenes)) return [];

  return scenes
    .map((scene) => {
      if (!scene || typeof scene !== "object") return null;
      const record = scene as Record<string, unknown>;
      const displayName =
        typeof record.displayNameKo === "string" ? record.displayNameKo : "";
      const gameTimeSec =
        typeof record.gameTimeSec === "number"
          ? `${Math.round(record.gameTimeSec)}초`
          : "";

      return [gameTimeSec, displayName].filter(Boolean).join(" · ") || null;
    })
    .filter((value): value is string => Boolean(value));
}
