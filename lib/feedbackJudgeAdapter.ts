import {
  DEFAULT_FEEDBACK_JUDGE_MODE_DEFINITIONS,
} from "@/lib/feedbackJudgePrompt";
import {
  detectHiddenPsychProfilePhrases,
  detectInternalLabelLeaks,
  detectManipulativePhrases,
  enforceFeedbackJudgeResultSafety,
  hasActionableNextGameGoal,
  sanitizeUserFacingFeedbackText,
} from "@/lib/feedbackJudgeGuards";
import type { CoachingFeedback } from "@/types/coachingFeedback";
import type {
  FeedbackJudgeInput,
  FeedbackJudgeIssue,
  FeedbackJudgeIssueSeverity,
  FeedbackJudgeIssueType,
  FeedbackJudgeMode,
  FeedbackJudgeResult,
} from "@/types/feedbackJudge";

export type BuildFeedbackJudgeInputFromCoachingFeedbackOptions = {
  selectedMode?: FeedbackJudgeMode;
  modeDefinition?: FeedbackJudgeInput["modeDefinition"];
  evidenceConfidence?: "confirmed" | "hypothesis" | "uncertain";
  supportingFactsKo?: string[];
};

const STRONG_CERTAINTY_PATTERN =
  /(?:확실|무조건|반드시|틀림없이|100%|definitely|certainly|must have)/i;
const ROBOTIC_PHRASE = "후보입니다";

const SHAMING_PHRASES = [
  "당신 때문에",
  "민폐",
  "한심",
  "네가 망쳤",
  "부끄러운",
  "실력이 부족해서",
];

const ISSUE_SCORE_PENALTY: Record<FeedbackJudgeIssueSeverity, number> = {
  high: 30,
  medium: 15,
  low: 5,
};

export function buildFeedbackJudgeInputFromCoachingFeedback(
  feedback: CoachingFeedback,
  options: BuildFeedbackJudgeInputFromCoachingFeedbackOptions = {}
): FeedbackJudgeInput {
  const selectedMode = options.selectedMode ?? "direct";
  const supportingFactsKo =
    options.supportingFactsKo ?? extractSupportingFacts(feedback);

  return {
    feedback,
    mode: selectedMode,
    selectedMode,
    modeDefinition:
      options.modeDefinition ??
      DEFAULT_FEEDBACK_JUDGE_MODE_DEFINITIONS[selectedMode],
    draftFeedback: {
      summaryRaw: feedback.matchSummary.summaryKo,
      nextGameGoalRaw: feedback.nextGameGoal.goalKo,
      whyItMattersRaw:
        feedback.nextGameGoal.triggerKo ||
        feedback.matchSummary.overallHypothesisKo ||
        feedback.matchSummary.summaryKo,
      whatToCheckRaw: feedback.nextGameGoal.successConditionKo,
      extraUserFacingTexts: extractUserFacingFeedbackTexts(feedback),
    },
    matchEvidenceSummary: buildMatchEvidenceSummary(feedback),
    evidenceConfidence: options.evidenceConfidence ?? "hypothesis",
    supportingFactsKo,
    evidenceText: supportingFactsKo.join("\n"),
  };
}

export function runLocalFeedbackJudgePrecheck(
  input: FeedbackJudgeInput
): FeedbackJudgeResult {
  const draft = input.draftFeedback ?? {
    summaryRaw: input.feedback.matchSummary.summaryKo,
    nextGameGoalRaw: input.feedback.nextGameGoal.goalKo,
    whyItMattersRaw:
      input.feedback.nextGameGoal.triggerKo ||
      input.feedback.matchSummary.overallHypothesisKo,
    whatToCheckRaw: input.feedback.nextGameGoal.successConditionKo,
  };
  const checkedText = [
    draft.summaryRaw,
    draft.nextGameGoalRaw,
    draft.whyItMattersRaw,
    draft.whatToCheckRaw,
    ...(draft.extraUserFacingTexts ?? []),
  ].join("\n");
  const issues = collectLocalIssues({
    checkedText,
    nextGameGoalRaw: draft.nextGameGoalRaw,
    evidenceConfidence: input.evidenceConfidence ?? "hypothesis",
  });
  const qualityScore = calculateQualityScore(issues);
  const hasHighIssue = issues.some((issue) => issue.severity === "high");
  const hasRevisionRequiredIssue = issues.some((issue) =>
    [
      "internal_label",
      "not_actionable",
      "overclaiming",
      "unsupported_by_evidence",
    ].includes(issue.type)
  );
  const verdict =
    qualityScore < 50 || hasHighIssue
      ? "reject"
      : qualityScore >= 80 && !hasRevisionRequiredIssue
        ? "pass"
        : "revise";

  return enforceFeedbackJudgeResultSafety({
    verdict,
    qualityScore,
    issues,
    safeRewrite: {
      summaryKo: cleanUserFacingText(draft.summaryRaw, "근거를 바탕으로 다시 확인할 장면입니다."),
      nextGameGoalKo: cleanUserFacingText(
        draft.nextGameGoalRaw,
        "다음 판에는 같은 조건이 나오면 한 번 더 확인하고 행동하세요."
      ),
      whyItMattersKo: cleanUserFacingText(
        draft.whyItMattersRaw,
        "이 장면은 복기용 가설로만 확인합니다."
      ),
      whatToCheckKo: cleanUserFacingText(
        draft.whatToCheckRaw,
        "다음에는 행동 전에 확인할 조건을 하나 정합니다."
      ),
      toneNotes: [
        "로컬 사전 검사는 사용자에게 보여주기 전 문구 위험을 확인합니다.",
      ],
    },
    shouldShowToUser: verdict !== "reject",
  });
}

export function runLocalFeedbackJudgePrecheckForCoachingFeedback(
  feedback: CoachingFeedback,
  options?: BuildFeedbackJudgeInputFromCoachingFeedbackOptions
): FeedbackJudgeResult {
  return runLocalFeedbackJudgePrecheck(
    buildFeedbackJudgeInputFromCoachingFeedback(feedback, options)
  );
}

function collectLocalIssues(input: {
  checkedText: string;
  nextGameGoalRaw: string;
  evidenceConfidence: "confirmed" | "hypothesis" | "uncertain";
}): FeedbackJudgeIssue[] {
  const issues: FeedbackJudgeIssue[] = [];

  const internalLabelLeaks = detectInternalLabelLeaks(input.checkedText);
  if (internalLabelLeaks.length > 0) {
    issues.push(
      createIssue(
        "internal_label",
        "medium",
        "내부 개발 라벨이 사용자 문구에 노출됐습니다.",
        internalLabelLeaks.join(", ")
      )
    );
  }

  for (const phrase of detectHiddenPsychProfilePhrases(input.checkedText)) {
    issues.push(createIssue("hidden_psych_profile", "high", "근거 없이 성향이나 심리를 단정하는 표현입니다.", phrase));
  }

  for (const phrase of detectManipulativePhrases(input.checkedText)) {
    const issueType = SHAMING_PHRASES.some((shamingPhrase) =>
      phrase.toLowerCase().includes(shamingPhrase.toLowerCase())
    )
      ? "shaming"
      : "manipulative";
    issues.push(
      createIssue(
        issueType,
        "high",
        issueType === "shaming"
          ? "사용자를 탓하거나 수치심을 주는 표현입니다."
          : "공포나 죄책감으로 행동을 압박하는 표현입니다.",
        phrase
      )
    );
  }

  for (const phrase of detectShamingPhrases(input.checkedText)) {
    if (!issues.some((issue) => issue.excerpt === phrase)) {
      issues.push(createIssue("shaming", "high", "사용자를 탓하거나 수치심을 주는 표현입니다.", phrase));
    }
  }

  if (!hasActionableNextGameGoal(input.nextGameGoalRaw)) {
    issues.push(
      createIssue(
        "not_actionable",
        input.nextGameGoalRaw.trim() ? "medium" : "high",
        "다음 판 목표가 관찰 가능한 행동으로 충분히 구체화되지 않았습니다.",
        input.nextGameGoalRaw
      )
    );
  }

  if (
    input.evidenceConfidence !== "confirmed" &&
    STRONG_CERTAINTY_PATTERN.test(input.checkedText)
  ) {
    issues.push(
      createIssue(
        "overclaiming",
        "medium",
        "근거가 확정되지 않았는데 단정적인 표현을 사용했습니다.",
        input.checkedText.match(STRONG_CERTAINTY_PATTERN)?.[0]
      )
    );
  }

  const roboticCount = countOccurrences(input.checkedText, ROBOTIC_PHRASE);
  if (roboticCount >= 3) {
    issues.push(
      createIssue(
        "too_robotic",
        "low",
        "같은 후보 표현이 반복되어 문구가 기계적으로 보입니다.",
        ROBOTIC_PHRASE
      )
    );
  }

  return dedupeIssues(issues);
}

function createIssue(
  type: FeedbackJudgeIssueType,
  severity: FeedbackJudgeIssueSeverity,
  messageKo: string,
  excerpt?: string
): FeedbackJudgeIssue {
  return { type, severity, messageKo, excerpt };
}

function calculateQualityScore(issues: FeedbackJudgeIssue[]) {
  const penalty = issues.reduce(
    (total, issue) => total + ISSUE_SCORE_PENALTY[issue.severity],
    0
  );
  return Math.max(0, Math.min(100, 100 - penalty));
}

function extractSupportingFacts(feedback: CoachingFeedback) {
  return feedback.sceneReviews
    .flatMap((sceneReview) =>
      sceneReview.evidence.map((evidence) =>
        evidence.detailKo
          ? `${evidence.labelKo}: ${evidence.detailKo}`
          : evidence.labelKo
      )
    )
    .filter(Boolean)
    .slice(0, 8);
}

function buildMatchEvidenceSummary(feedback: CoachingFeedback) {
  return [
    feedback.matchSummary.summaryKo,
    ...feedback.sceneReviews.slice(0, 3).map((scene) => scene.reviewHypothesisKo),
    ...feedback.improvementCandidates
      .slice(0, 3)
      .map((candidate) => candidate.feedbackKo),
  ].filter(Boolean);
}

function extractUserFacingFeedbackTexts(feedback: CoachingFeedback) {
  return [
    feedback.matchSummary.titleKo,
    feedback.matchSummary.summaryKo,
    feedback.matchSummary.overallHypothesisKo,
    feedback.nextGameGoal.goalKo,
    feedback.nextGameGoal.triggerKo,
    feedback.nextGameGoal.successConditionKo,
    ...feedback.strengths.map((strength) => strength.feedbackKo),
    ...feedback.improvementCandidates.map((candidate) => candidate.feedbackKo),
    ...feedback.recurringPatterns.map((pattern) => pattern.hypothesisKo),
    ...feedback.sceneReviews.flatMap((sceneReview) => [
      sceneReview.titleKo,
      sceneReview.reviewHypothesisKo,
      sceneReview.goodDecisionKo,
      sceneReview.missedConditionKo,
      sceneReview.correctionKo,
      sceneReview.nextActionKo,
      ...sceneReview.evidence.flatMap((evidence) => [
        evidence.labelKo,
        evidence.detailKo,
      ]),
    ]),
  ].filter((text): text is string => Boolean(text?.trim()));
}

function cleanUserFacingText(text: string, fallback: string) {
  const cleaned = sanitizeUserFacingFeedbackText(text);

  return cleaned || fallback;
}

function detectShamingPhrases(text: string) {
  const loweredText = text.toLowerCase();
  return SHAMING_PHRASES.filter((phrase) =>
    loweredText.includes(phrase.toLowerCase())
  );
}

function countOccurrences(text: string, pattern: string) {
  if (!pattern) return 0;
  return text.split(pattern).length - 1;
}

function dedupeIssues(issues: FeedbackJudgeIssue[]) {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.type}:${issue.severity}:${issue.excerpt ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
