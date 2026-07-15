import type {
  CoachingFeedback,
  SceneCoachingReview,
} from "@/types/coachingFeedback";

function isNonEmptyText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasEvidence(sceneReview: SceneCoachingReview): boolean {
  return (
    Array.isArray(sceneReview.evidence) && sceneReview.evidence.length > 0
  );
}

export function hasExactlyOneNextGameGoal(
  feedback: CoachingFeedback
): boolean {
  const nextGameGoal = feedback.nextGameGoal;

  return (
    Boolean(nextGameGoal) &&
    isNonEmptyText(nextGameGoal.goalKo) &&
    isNonEmptyText(nextGameGoal.triggerKo) &&
    isNonEmptyText(nextGameGoal.successConditionKo)
  );
}

export function hasEvidenceBackedSceneReviews(
  feedback: CoachingFeedback
): boolean {
  const sceneReviews = Array.isArray(feedback.sceneReviews)
    ? feedback.sceneReviews
    : [];

  return sceneReviews.every(
    (sceneReview) => sceneReview.confidence === "low" || hasEvidence(sceneReview)
  );
}

export function getCoachingFeedbackQualityWarnings(
  feedback: CoachingFeedback
): string[] {
  const warnings: string[] = [];
  const sceneReviews = Array.isArray(feedback.sceneReviews)
    ? feedback.sceneReviews
    : [];
  const strengths = Array.isArray(feedback.strengths) ? feedback.strengths : [];
  const improvementCandidates = Array.isArray(feedback.improvementCandidates)
    ? feedback.improvementCandidates
    : [];

  if (sceneReviews.length === 0) {
    warnings.push("장면별 복기 후보가 없습니다.");
  }

  if (strengths.length === 0) {
    warnings.push("유지할 강점 후보가 없습니다.");
  }

  if (improvementCandidates.length === 0) {
    warnings.push("개선 후보가 없습니다.");
  }

  if (!hasExactlyOneNextGameGoal(feedback)) {
    warnings.push(
      "다음 판 목표에는 goalKo, triggerKo, successConditionKo가 모두 필요합니다."
    );
  }

  for (const sceneReview of sceneReviews) {
    if (sceneReview.confidence === "high" && !hasEvidence(sceneReview)) {
      warnings.push(
        `높은 신뢰도의 장면 리뷰(${sceneReview.sceneId})에 근거가 없습니다.`
      );
    }
  }

  if (
    feedback.personalization?.profileApplied === true &&
    !feedback.personalization.profileConfidence
  ) {
    warnings.push(
      "개인화 프로필을 적용한 경우 profileConfidence가 필요합니다."
    );
  }

  return warnings;
}
