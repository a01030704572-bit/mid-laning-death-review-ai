import type { FeedbackJudgeIssue, FeedbackJudgeSafeRewrite } from "@/types/feedbackJudge";

export type FeedbackJudgePreviewMetadata = {
  verdict: "pass" | "revise" | "reject";
  qualityScore: number;
  issues: FeedbackJudgeIssue[];
  shouldShowToUser: boolean;
} | null;

export type FeedbackJudgeRenderPolicyInput = {
  hasFeedback: boolean;
  feedbackJudgePreview?: FeedbackJudgePreviewMetadata;
  feedbackJudgeSafeRewrite?: FeedbackJudgeSafeRewrite;
  debugMode?: boolean;
};

export type FeedbackJudgeRenderPolicy = {
  shouldRenderCard: boolean;
  shouldRenderFeedback: boolean;
  shouldRenderRawSupportingSections: boolean;
  renderSource: "raw" | "safeRewrite" | "hidden";
  safeRewrite?: Omit<FeedbackJudgeSafeRewrite, "toneNotes">;
  debugNotice?: {
    verdict?: "pass" | "revise" | "reject";
    qualityScore?: number;
    issues: Array<{
      type: string;
      severity: string;
    }>;
  };
};

export function getFeedbackJudgeRenderPolicy({
  hasFeedback,
  feedbackJudgePreview,
  feedbackJudgeSafeRewrite,
  debugMode = false,
}: FeedbackJudgeRenderPolicyInput): FeedbackJudgeRenderPolicy {
  if (!hasFeedback) {
    return {
      shouldRenderCard: false,
      shouldRenderFeedback: false,
      shouldRenderRawSupportingSections: false,
      renderSource: "hidden",
    };
  }

  const debugNotice = buildDebugNotice(feedbackJudgePreview);
  const shouldHideForUser =
    feedbackJudgePreview?.verdict === "reject" ||
    feedbackJudgePreview?.shouldShowToUser === false;

  if (shouldHideForUser) {
    return {
      shouldRenderCard: debugMode,
      shouldRenderFeedback: false,
      shouldRenderRawSupportingSections: false,
      renderSource: "hidden",
      debugNotice: debugMode ? debugNotice : undefined,
    };
  }

  if (
    feedbackJudgePreview?.verdict === "revise" &&
    hasUsableSafeRewrite(feedbackJudgeSafeRewrite)
  ) {
    const safeRewrite = feedbackJudgeSafeRewrite;
    return {
      shouldRenderCard: true,
      shouldRenderFeedback: true,
      shouldRenderRawSupportingSections: debugMode,
      renderSource: "safeRewrite",
      safeRewrite: stripToneNotes(safeRewrite),
      debugNotice: debugMode ? debugNotice : undefined,
    };
  }

  return {
    shouldRenderCard: true,
    shouldRenderFeedback: true,
    shouldRenderRawSupportingSections: true,
    renderSource: "raw",
    debugNotice: debugMode ? debugNotice : undefined,
  };
}

function hasUsableSafeRewrite(
  safeRewrite: FeedbackJudgeSafeRewrite | undefined
): safeRewrite is FeedbackJudgeSafeRewrite {
  return Boolean(
    safeRewrite?.summaryKo ||
      safeRewrite?.nextGameGoalKo ||
      safeRewrite?.whyItMattersKo ||
      safeRewrite?.whatToCheckKo
  );
}

function stripToneNotes(safeRewrite: FeedbackJudgeSafeRewrite) {
  const { toneNotes: _toneNotes, ...userFacingRewrite } = safeRewrite;
  return userFacingRewrite;
}

function buildDebugNotice(
  feedbackJudgePreview: FeedbackJudgePreviewMetadata | undefined
) {
  if (!feedbackJudgePreview) {
    return {
      issues: [],
    };
  }

  return {
    verdict: feedbackJudgePreview.verdict,
    qualityScore: feedbackJudgePreview.qualityScore,
    issues: feedbackJudgePreview.issues.map((issue) => ({
      type: issue.type,
      severity: issue.severity,
    })),
  };
}
