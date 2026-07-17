import type {
  CoachingFeedback,
  CoachingStrength,
  ImprovementCandidate,
  ImprovementCategory,
  SceneCoachingReview,
} from "@/types/coachingFeedback";

type CoachingFeedbackPreviewCardProps = {
  feedback: CoachingFeedback | null | undefined;
  warnings?: string[];
  debugMode?: boolean;
};

const IMPROVEMENT_LABELS: Record<ImprovementCategory, string> = {
  jungle_tracking: "상대 정글 위치 확인",
  objective_setup: "오브젝트 전 준비",
  post_kill_conversion: "킬 이후 이득 전환",
  fight_direction: "교전 방향",
  recall_timing: "귀환 타이밍",
  vision_timing: "시야 타이밍",
  wave_management: "웨이브 관리",
  roam_timing: "로밍 타이밍",
  death_avoidance: "사망 회피",
  unknown: "추가 확인 필요",
};

function dedupeByText<T>(items: T[], getText: (item: T) => string) {
  const seen = new Set<string>();
  const deduped: T[] = [];

  for (const item of items) {
    const key = getText(item).replace(/\s+/g, " ").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return deduped;
}

function categoryLabel(category: ImprovementCategory | CoachingStrength["category"]) {
  return category in IMPROVEMENT_LABELS
    ? IMPROVEMENT_LABELS[category as ImprovementCategory]
    : "유지할 강점";
}

function summaryLine(feedback: CoachingFeedback) {
  return (
    feedback.matchSummary.summaryKo ||
    "복기용 가설을 바탕으로 다음 판에 먼저 적용할 목표를 정리했습니다."
  );
}

function strengthText(strength: CoachingStrength) {
  return strength.feedbackKo;
}

function improvementText(candidate: ImprovementCandidate) {
  return candidate.feedbackKo;
}

function sceneReviewText(sceneReview: SceneCoachingReview) {
  return `${sceneReview.titleKo} ${sceneReview.reviewHypothesisKo}`;
}

export default function CoachingFeedbackPreviewCard({
  feedback,
  warnings = [],
  debugMode = false,
}: CoachingFeedbackPreviewCardProps) {
  if (!feedback) return null;

  const strengths = dedupeByText(feedback.strengths, strengthText).slice(0, 2);
  const improvements = dedupeByText(
    feedback.improvementCandidates,
    improvementText
  ).slice(0, 2);
  const sceneReviews = dedupeByText(
    feedback.sceneReviews,
    sceneReviewText
  ).slice(0, 2);

  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-emerald-700">
            Riot 자동 복기
          </p>
          <h3 className="mt-1 text-base font-bold text-zinc-950">
            이번 판 코칭 요약
          </h3>
        </div>
        <span className="w-fit rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700">
          다음 판 목표 1개
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-zinc-700">
        {summaryLine(feedback)}
      </p>

      <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-3">
        <p className="text-xs font-bold text-emerald-700">다음 판 목표</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-zinc-950">
          {feedback.nextGameGoal.goalKo}
        </p>
        <div className="mt-3 grid gap-2 text-xs leading-5 text-zinc-600 md:grid-cols-2">
          <p>
            <span className="font-semibold text-zinc-800">확인할 포인트: </span>
            {feedback.nextGameGoal.triggerKo}
          </p>
          <p>
            <span className="font-semibold text-zinc-800">성공 기준: </span>
            {feedback.nextGameGoal.successConditionKo}
          </p>
        </div>
      </div>

      {(strengths.length > 0 || improvements.length > 0) && (
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {strengths.length > 0 && (
            <div className="rounded-xl border border-emerald-200 bg-white p-3">
              <p className="text-xs font-bold text-zinc-950">
                유지할 좋은 판단 후보
              </p>
              <ul className="mt-2 space-y-2 text-xs leading-5 text-zinc-600">
                {strengths.map((strength) => (
                  <li key={strength.id}>
                    <span className="font-semibold text-zinc-800">
                      {categoryLabel(strength.category)}
                    </span>
                    <span className="mx-1 text-zinc-300">·</span>
                    {strength.feedbackKo}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {improvements.length > 0 && (
            <div className="rounded-xl border border-emerald-200 bg-white p-3">
              <p className="text-xs font-bold text-zinc-950">
                다음에 체크할 후보
              </p>
              <ul className="mt-2 space-y-2 text-xs leading-5 text-zinc-600">
                {improvements.map((candidate) => (
                  <li key={candidate.id}>
                    <span className="font-semibold text-zinc-800">
                      {categoryLabel(candidate.category)}
                    </span>
                    <span className="mx-1 text-zinc-300">·</span>
                    {candidate.feedbackKo}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {sceneReviews.length > 0 && (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-white p-3">
          <p className="text-xs font-bold text-zinc-950">복기용 근거 후보</p>
          <div className="mt-2 space-y-2">
            {sceneReviews.map((sceneReview) => (
              <div
                key={sceneReview.sceneId}
                className="rounded-lg border border-zinc-100 bg-zinc-50 p-2"
              >
                <p className="text-xs font-semibold text-zinc-900">
                  {sceneReview.titleKo}
                </p>
                <p className="mt-1 text-xs leading-5 text-zinc-600">
                  {sceneReview.reviewHypothesisKo}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {debugMode && warnings.length > 0 && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-bold text-amber-800">Debug warnings</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-amber-800">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
