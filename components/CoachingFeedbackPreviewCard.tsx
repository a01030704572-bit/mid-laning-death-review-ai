import type {
  CoachingFeedback,
  CoachingStrength,
  ImprovementCandidate,
  ImprovementCategory,
  SceneCoachingReview,
} from "@/types/coachingFeedback";
import {
  getFeedbackJudgeRenderPolicy,
  type FeedbackJudgePreviewMetadata,
} from "@/lib/feedbackJudgeRenderPolicy";
import { sanitizeUserFacingFeedbackText } from "@/lib/feedbackJudgeGuards";
import type { FeedbackJudgeSafeRewrite } from "@/types/feedbackJudge";

type CoachingFeedbackPreviewCardProps = {
  feedback: CoachingFeedback | null | undefined;
  warnings?: string[];
  feedbackJudgePreview?: FeedbackJudgePreviewMetadata;
  feedbackJudgePreviewWarnings?: string[];
  feedbackJudgeSafeRewrite?: FeedbackJudgeSafeRewrite;
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
    : "좋은 판단";
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
  feedbackJudgePreview,
  feedbackJudgePreviewWarnings = [],
  feedbackJudgeSafeRewrite,
  debugMode = false,
}: CoachingFeedbackPreviewCardProps) {
  const renderPolicy = getFeedbackJudgeRenderPolicy({
    hasFeedback: Boolean(feedback),
    feedbackJudgePreview,
    feedbackJudgeSafeRewrite,
    debugMode,
  });

  if (!feedback || !renderPolicy.shouldRenderCard) return null;

  if (!renderPolicy.shouldRenderFeedback) {
    return debugMode ? (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-xs font-semibold text-amber-800">
          Debug Feedback Judge
        </p>
        <h3 className="mt-1 text-sm font-bold text-zinc-950">
          Coaching feedback card hidden in user mode
        </h3>
        <JudgeDebugNotice
          debugNotice={renderPolicy.debugNotice}
          warnings={feedbackJudgePreviewWarnings}
        />
      </section>
    ) : null;
  }

  const strengths = dedupeByText(feedback.strengths, strengthText).slice(0, 2);
  const improvements = dedupeByText(
    feedback.improvementCandidates,
    improvementText
  ).slice(0, 2);
  const sceneReviews = dedupeByText(
    feedback.sceneReviews,
    sceneReviewText
  ).slice(0, 2);
  const safeRewrite = renderPolicy.safeRewrite;
  const shouldHideRawSupportingSections =
    !renderPolicy.shouldRenderRawSupportingSections;
  const summaryKo = safeRewrite?.summaryKo ?? summaryLine(feedback);
  const nextGameGoalKo =
    safeRewrite?.nextGameGoalKo ?? feedback.nextGameGoal.goalKo;
  const whyItMattersKo =
    safeRewrite?.whyItMattersKo ?? feedback.nextGameGoal.triggerKo;
  const whatToCheckKo =
    safeRewrite?.whatToCheckKo ?? feedback.nextGameGoal.successConditionKo;

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
        {summaryKo}
      </p>

      <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-3">
        <p className="text-xs font-bold text-emerald-700">다음 판 목표</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-zinc-950">
          {nextGameGoalKo}
        </p>
        <div className="mt-3 grid gap-2 text-xs leading-5 text-zinc-600 md:grid-cols-2">
          <p>
            <span className="font-semibold text-zinc-800">확인할 포인트: </span>
            {whyItMattersKo}
          </p>
          <p>
            <span className="font-semibold text-zinc-800">성공 기준: </span>
            {whatToCheckKo}
          </p>
        </div>
      </div>

      {!shouldHideRawSupportingSections &&
        (strengths.length > 0 || improvements.length > 0) && (
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
                    {sanitizeUserFacingFeedbackText(strength.feedbackKo)}
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
                    {sanitizeUserFacingFeedbackText(candidate.feedbackKo)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {!shouldHideRawSupportingSections && sceneReviews.length > 0 && (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-white p-3">
          <p className="text-xs font-bold text-zinc-950">복기용 근거 후보</p>
          <div className="mt-2 space-y-2">
            {sceneReviews.map((sceneReview) => (
              <div
                key={sceneReview.sceneId}
                className="rounded-lg border border-zinc-100 bg-zinc-50 p-2"
              >
                <p className="text-xs font-semibold text-zinc-900">
                  {sanitizeUserFacingFeedbackText(sceneReview.titleKo)}
                </p>
                <p className="mt-1 text-xs leading-5 text-zinc-600">
                  {sanitizeUserFacingFeedbackText(sceneReview.reviewHypothesisKo)}
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

      {debugMode && (
        <JudgeDebugNotice
          debugNotice={renderPolicy.debugNotice}
          warnings={feedbackJudgePreviewWarnings}
        />
      )}
    </section>
  );
}

function JudgeDebugNotice({
  debugNotice,
  warnings,
}: {
  debugNotice: ReturnType<typeof getFeedbackJudgeRenderPolicy>["debugNotice"];
  warnings: string[];
}) {
  if (!debugNotice && warnings.length === 0) return null;

  return (
    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
      <p className="text-xs font-bold text-amber-800">Feedback Judge debug</p>
      {debugNotice && (
        <div className="mt-2 space-y-1 text-xs leading-5 text-amber-800">
          <p>
            verdict: {debugNotice.verdict ?? "missing"} · score:{" "}
            {debugNotice.qualityScore ?? "n/a"}
          </p>
          {debugNotice.issues.length > 0 && (
            <ul className="list-disc space-y-1 pl-4">
              {debugNotice.issues.map((issue, index) => (
                <li key={`${issue.type}-${issue.severity}-${index}`}>
                  {issue.type} · {issue.severity}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {warnings.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-amber-800">
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
