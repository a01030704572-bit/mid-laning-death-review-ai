import type { HabitPatternAnalysis } from "@/types/history";

type Props = {
  analysis: HabitPatternAnalysis;
};

export default function RecentHabitPatternCard({ analysis }: Props) {
  const {
    recentSceneCount,
    repeatedPatterns,
    primaryHabitFocus,
    nextReviewGoal,
    sampleSizeWarning,
  } = analysis;

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-bold text-zinc-950">
          최근 복기 장면 패턴 분석
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          {recentSceneCount >= 5
            ? "최근 5개 복기 장면 기준"
            : sampleSizeWarning}
        </p>
      </div>

      {recentSceneCount === 0 ? null : (
        <>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <h3 className="text-sm font-semibold text-zinc-900">
              {repeatedPatterns.some(({ count }) => count >= 3)
                ? "가능성이 높은 반복 패턴"
                : "주의해서 볼 패턴"}
            </h3>
            {repeatedPatterns.length > 0 ? (
              <ul className="mt-2 space-y-2 text-sm text-zinc-700">
                {repeatedPatterns.slice(0, 3).map((pattern) => (
                  <li key={pattern.tag} className="flex justify-between gap-3">
                    <span>{pattern.label}</span>
                    <span className="shrink-0 font-medium text-zinc-900">
                      {recentSceneCount}개 복기 장면 중 {pattern.count}회
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-zinc-600">
                아직 반복해서 나타난 패턴은 없습니다.
              </p>
            )}
          </div>

          {primaryHabitFocus && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h3 className="text-sm font-semibold text-amber-950">
                {primaryHabitFocus.level === "possible_one_off"
                  ? "다음 복기 확인 포인트"
                  : "우선 교정 포인트"}
              </h3>
              <p className="mt-1 text-sm leading-6 text-amber-900">
                {primaryHabitFocus.message}
              </p>
            </div>
          )}

          {nextReviewGoal && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <h3 className="text-sm font-semibold text-emerald-950">
                {primaryHabitFocus?.level === "possible_one_off"
                  ? "이번 장면 기준 다음 목표"
                  : "다음 목표"}
              </h3>
              <p className="mt-1 text-sm leading-6 text-emerald-900">
                {nextReviewGoal}
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
