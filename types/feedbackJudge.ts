import type { CoachingFeedback } from "@/types/coachingFeedback";

export type FeedbackJudgeVerdict = "pass" | "revise" | "reject";

export type FeedbackJudgeIssueType =
  | "overclaiming"
  | "shaming"
  | "internal_label"
  | "too_vague"
  | "too_harsh"
  | "too_robotic"
  | "not_actionable"
  | "unsupported_by_evidence"
  | "manipulative"
  | "hidden_psych_profile";

export type FeedbackJudgeIssueSeverity = "low" | "medium" | "high";

export type FeedbackJudgeMode =
  | "direct"
  | "gentle"
  | "analytical"
  | "high_elo"
  | "beginner";

export type FeedbackJudgeIssue = {
  type: FeedbackJudgeIssueType;
  severity: FeedbackJudgeIssueSeverity;
  messageKo: string;
  excerpt?: string;
};

export type FeedbackJudgeSafeRewrite = {
  summaryKo?: string;
  nextGameGoalKo?: string;
  whyItMattersKo?: string;
  whatToCheckKo?: string;
  notesKo?: string[];
  toneNotes?: string[];
};

export type FeedbackJudgeResult = {
  verdict: FeedbackJudgeVerdict;
  qualityScore: number;
  issues: FeedbackJudgeIssue[];
  safeRewrite?: FeedbackJudgeSafeRewrite;
  shouldShowToUser: boolean;
};

export type FeedbackJudgeInput = {
  feedback: CoachingFeedback;
  mode?: FeedbackJudgeMode;
  selectedMode?: FeedbackJudgeMode;
  modeDefinition?: string;
  draftFeedback?: {
    summaryRaw: string;
    nextGameGoalRaw: string;
    whyItMattersRaw: string;
    whatToCheckRaw: string;
    extraUserFacingTexts?: string[];
  };
  matchEvidenceSummary?: string[];
  evidenceConfidence?: "confirmed" | "hypothesis" | "uncertain";
  supportingFactsKo?: string[];
  evidenceText?: string;
  userTier?: string;
};
