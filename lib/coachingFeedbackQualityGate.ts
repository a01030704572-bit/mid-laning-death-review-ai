import { getCoachingFeedbackQualityWarnings } from "@/lib/coachingFeedbackGuards";
import { selectNextGameGoal } from "@/lib/nextGameGoalSelector";
import type {
  CoachingFeedback,
  EvidenceConfidence,
  NextGameGoal,
  SceneCoachingReview,
} from "@/types/coachingFeedback";

export type CoachingFeedbackQualityGateResult = {
  feedback: CoachingFeedback;
  warnings: string[];
  changed: boolean;
};

const NEXT_GOAL_REPAIRED_WARNING =
  "다음 판 목표가 불완전해 안전한 기본 목표로 보정했습니다.";
const HIGH_CONFIDENCE_WITHOUT_EVIDENCE_WARNING =
  "근거가 부족한 high confidence 장면을 낮은 신뢰도로 보정했습니다.";
const LOW_EVIDENCE_HIGH_CONFIDENCE_WARNING =
  "낮은 신뢰도의 근거만 있는 high confidence 장면을 중간 신뢰도로 보정했습니다.";
const EMPTY_STRENGTH_WARNING =
  "강점 후보가 부족해 강점 피드백을 확정하지 않았습니다.";
const EMPTY_IMPROVEMENT_WARNING =
  "개선 후보가 부족해 다음 목표가 장면 복기 기준으로 생성되었습니다.";
const WEAK_RECURRING_PATTERN_WARNING =
  "반복 근거가 부족한 패턴 후보를 보수적으로 처리했습니다.";
const PERSONALIZATION_REPAIRED_WARNING =
  "개인화 프로필 신뢰도가 없어 개인화 적용을 보수적으로 처리했습니다.";
const DEFINITIVE_WORDING_WARNING =
  "확정적인 표현이 포함되어 복기용 가설인지 확인이 필요합니다.";

function uniqueWarnings(warnings: string[]) {
  return Array.from(new Set(warnings.filter(Boolean)));
}

function isNonEmptyText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isCompleteNextGameGoal(value: unknown): value is NextGameGoal {
  const candidate = value as Partial<NextGameGoal> | undefined;
  return Boolean(
    candidate &&
      isNonEmptyText(candidate.goalKo) &&
      isNonEmptyText(candidate.triggerKo) &&
      isNonEmptyText(candidate.successConditionKo)
  );
}

function sceneHasEvidence(sceneReview: SceneCoachingReview) {
  return Array.isArray(sceneReview.evidence) && sceneReview.evidence.length > 0;
}

function sceneEvidenceIsAllLow(sceneReview: SceneCoachingReview) {
  return (
    sceneHasEvidence(sceneReview) &&
    sceneReview.evidence.every((evidence) => evidence.confidence === "low")
  );
}

function hasStrongSceneEvidence(sceneReviews: SceneCoachingReview[]) {
  return sceneReviews.some((sceneReview) =>
    sceneReview.evidence.some(
      (evidence) =>
        (evidence.source === "riot" ||
          evidence.source === "video" ||
          evidence.source === "overwolf") &&
        evidence.confidence !== "low"
    )
  );
}

function downgradeEvidenceConfidence(
  confidence: EvidenceConfidence,
  hasScenes: boolean,
  hasStrongEvidence: boolean
): EvidenceConfidence {
  if (confidence !== "high") return confidence;
  if (hasStrongEvidence) return confidence;
  return hasScenes ? "medium" : "low";
}

function hasDefinitiveWording(value: unknown) {
  if (!isNonEmptyText(value)) return false;
  return /확정|반드시|무조건/.test(value);
}

export function normalizeCoachingFeedback(
  feedback: CoachingFeedback
): CoachingFeedbackQualityGateResult {
  let changed = false;
  const warnings: string[] = [];
  const sceneReviews = Array.isArray(feedback.sceneReviews)
    ? feedback.sceneReviews
    : [];
  const strengths = Array.isArray(feedback.strengths) ? feedback.strengths : [];
  const improvementCandidates = Array.isArray(feedback.improvementCandidates)
    ? feedback.improvementCandidates
    : [];
  const recurringPatterns = Array.isArray(feedback.recurringPatterns)
    ? feedback.recurringPatterns
    : [];

  const normalizedSceneReviews = sceneReviews.map((sceneReview) => {
    if (sceneReview.confidence !== "high") return { ...sceneReview };

    if (!sceneHasEvidence(sceneReview)) {
      changed = true;
      warnings.push(HIGH_CONFIDENCE_WITHOUT_EVIDENCE_WARNING);
      return {
        ...sceneReview,
        confidence: "low" as const,
      };
    }

    if (sceneEvidenceIsAllLow(sceneReview)) {
      changed = true;
      warnings.push(LOW_EVIDENCE_HIGH_CONFIDENCE_WARNING);
      return {
        ...sceneReview,
        confidence: "medium" as const,
      };
    }

    return { ...sceneReview };
  });

  const normalizedRecurringPatterns = recurringPatterns.map((pattern) => {
    if (pattern.occurrenceCount > 1 && pattern.confidence !== "high") {
      return { ...pattern };
    }
    if (pattern.occurrenceCount > 1 && pattern.confidence === "high") {
      return { ...pattern };
    }

    if (pattern.confidence !== "low") {
      changed = true;
    }
    warnings.push(WEAK_RECURRING_PATTERN_WARNING);
    return {
      ...pattern,
      confidence: "low" as const,
    };
  });

  const normalizedNextGameGoal = isCompleteNextGameGoal(feedback.nextGameGoal)
    ? { ...feedback.nextGameGoal }
    : selectNextGameGoal({
        recurringPatterns: normalizedRecurringPatterns,
        improvementCandidates,
        sceneReviews: normalizedSceneReviews,
      });

  if (!isCompleteNextGameGoal(feedback.nextGameGoal)) {
    changed = true;
    warnings.push(NEXT_GOAL_REPAIRED_WARNING);
  }

  const hasStrongEvidence = hasStrongSceneEvidence(normalizedSceneReviews);
  const normalizedEvidenceConfidence = downgradeEvidenceConfidence(
    feedback.evidenceConfidence,
    normalizedSceneReviews.length > 0,
    hasStrongEvidence
  );

  if (normalizedEvidenceConfidence !== feedback.evidenceConfidence) {
    changed = true;
  }

  const normalizedMatchSummaryConfidence =
    normalizedEvidenceConfidence === "low" &&
    feedback.matchSummary.confidence === "high"
      ? "low"
      : feedback.matchSummary.confidence;

  if (normalizedMatchSummaryConfidence !== feedback.matchSummary.confidence) {
    changed = true;
  }

  const normalizedPersonalization =
    feedback.personalization?.profileApplied === true &&
    !feedback.personalization.profileConfidence
      ? {
          ...feedback.personalization,
          profileApplied: false,
          profileConfidence: "insufficient_data" as const,
        }
      : feedback.personalization
        ? { ...feedback.personalization }
        : feedback.personalization;

  if (
    feedback.personalization?.profileApplied === true &&
    !feedback.personalization.profileConfidence
  ) {
    changed = true;
    warnings.push(PERSONALIZATION_REPAIRED_WARNING);
  }

  if (strengths.length === 0) {
    warnings.push(EMPTY_STRENGTH_WARNING);
  }

  if (improvementCandidates.length === 0) {
    warnings.push(EMPTY_IMPROVEMENT_WARNING);
  }

  if (
    hasDefinitiveWording(feedback.matchSummary.overallHypothesisKo) ||
    normalizedSceneReviews.some((sceneReview) =>
      hasDefinitiveWording(sceneReview.reviewHypothesisKo)
    )
  ) {
    warnings.push(DEFINITIVE_WORDING_WARNING);
  }

  const normalizedFeedback: CoachingFeedback = {
    ...feedback,
    matchSummary: {
      ...feedback.matchSummary,
      confidence: normalizedMatchSummaryConfidence,
    },
    sceneReviews: normalizedSceneReviews,
    strengths: strengths.map((strength) => ({ ...strength })),
    improvementCandidates: improvementCandidates.map((candidate) => ({
      ...candidate,
      evidenceSceneIds: [...candidate.evidenceSceneIds],
    })),
    recurringPatterns: normalizedRecurringPatterns.map((pattern) => ({
      ...pattern,
      evidenceSceneIds: [...pattern.evidenceSceneIds],
    })),
    nextGameGoal: {
      ...normalizedNextGameGoal,
      basedOn: {
        ...normalizedNextGameGoal.basedOn,
        sceneIds: [...normalizedNextGameGoal.basedOn.sceneIds],
      },
    },
    evidenceConfidence: normalizedEvidenceConfidence,
    personalization: normalizedPersonalization,
  };

  return {
    feedback: normalizedFeedback,
    warnings: uniqueWarnings([
      ...warnings,
      ...getCoachingFeedbackQualityWarnings(normalizedFeedback),
    ]),
    changed,
  };
}

export {
  DEFINITIVE_WORDING_WARNING,
  EMPTY_IMPROVEMENT_WARNING,
  EMPTY_STRENGTH_WARNING,
  HIGH_CONFIDENCE_WITHOUT_EVIDENCE_WARNING,
  LOW_EVIDENCE_HIGH_CONFIDENCE_WARNING,
  NEXT_GOAL_REPAIRED_WARNING,
  PERSONALIZATION_REPAIRED_WARNING,
  WEAK_RECURRING_PATTERN_WARNING,
};
