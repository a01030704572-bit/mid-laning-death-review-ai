import type {
  AutoSceneConfidence,
  EliminationPatternResult,
  PlayerTierGroup,
  TierEvidenceRequirement,
} from "@/types/autoScene";

type RepeatedPatternPreviewCardProps = {
  results: EliminationPatternResult[];
  compact?: boolean;
};

const CONFIDENCE_LABELS: Record<AutoSceneConfidence, string> = {
  high: "높음",
  medium: "중간",
  low: "낮음",
};

const EVIDENCE_REQUIREMENT_LABELS: Record<TierEvidenceRequirement, string> = {
  riot_only_ok: "경기 이벤트 기록만으로 1차 판단 가능",
  video_recommended: "영상 확인 권장",
  video_required: "영상 확인 필요",
  user_confirmation_required: "유저 확인 필요",
};

const TIER_LABELS: Record<PlayerTierGroup, string> = {
  iron_silver: "Iron~Silver",
  gold_platinum: "Gold~Platinum",
  emerald_diamond: "Emerald~Diamond",
  master_plus: "Master+",
};

const PIPELINE_STEPS = [
  "Scene Candidates",
  "Similar Groups",
  "Tier Criteria",
  "Pattern Analysis",
];

function confidenceClass(confidence: AutoSceneConfidence) {
  if (confidence === "high") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (confidence === "medium") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-zinc-200 bg-zinc-50 text-zinc-500";
}

function explainResult(result: EliminationPatternResult) {
  const firstFactor = result.repeatedFactors[0]?.factorLabelKo;
  if (!firstFactor) {
    return "공통 요소가 아직 충분하지 않아 후보로만 봅니다.";
  }

  return `${firstFactor} 요소가 반복되어 후보로 묶였습니다.`;
}

function compactCautionKo() {
  return "영상 확인 전까지는 후보로만 봅니다.";
}

function actionOnlyGoal(goal: string) {
  return goal
    .replace(/^다음\s*(게임|판)(에서는|에는)?\s*/, "")
    .replace(/^다음\s*(게임|판)\s*/, "")
    .trim();
}

function FullPreviewHeader({ compact }: { compact: boolean }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2
          className={
            compact
              ? "text-sm font-bold text-zinc-950"
              : "text-base font-bold text-zinc-950"
          }
        >
          자동화 패턴 후보 상세
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          경기 이벤트 기록 기반 샘플 데이터로 생성한 패턴 후보입니다.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-500">
          UI 확인용 샘플
        </span>
        <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
          Gold~Platinum 기준 샘플
        </span>
        {!compact && (
          <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
            P0 핵심 패턴 4종
          </span>
        )}
      </div>
    </div>
  );
}

export default function RepeatedPatternPreviewCard({
  results,
  compact = false,
}: RepeatedPatternPreviewCardProps) {
  if (results.length === 0) return null;

  const repeatedFactorLimit = compact ? 1 : 2;
  const eliminatedFactorLimit = compact ? 1 : 2;

  return (
    <section
      className={
        compact
          ? "space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3"
          : "space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
      }
    >
      {!compact && <FullPreviewHeader compact={compact} />}

      {!compact && (
        <>
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
            이 결과는 실제 유저 경기 분석이 아니라 UI 확인용 샘플입니다.
          </p>

          <div className="grid gap-2 sm:grid-cols-4">
            {PIPELINE_STEPS.map((step, index) => (
              <div
                key={step}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                  Step {index + 1}
                </p>
                <p className="mt-1 text-sm font-semibold text-zinc-800">
                  {step}
                </p>
              </div>
            ))}
          </div>

          <p className="rounded-xl border border-zinc-200 bg-white p-3 text-sm leading-6 text-zinc-600">
            실제 시야/웨이브/교전 방향은 Level 8 영상 근거에서 보강합니다.
          </p>
        </>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {results.map((result) => (
          <article
            key={result.id}
            className={
              compact
                ? "rounded-xl border border-zinc-200 bg-white p-3"
                : "rounded-xl border border-zinc-200 bg-zinc-50 p-4"
            }
          >
            <h3 className="text-sm font-bold leading-6 text-zinc-950">
              {result.primaryPatternKo}
            </h3>

            {!compact && (
              <p className="mt-1 text-xs text-zinc-400">{result.groupType}</p>
            )}

            <p className="mt-1 text-xs text-zinc-500">
              {result.sceneCount}개 장면 · 신뢰도{" "}
              {CONFIDENCE_LABELS[result.confidence]} ·{" "}
              {EVIDENCE_REQUIREMENT_LABELS[result.evidenceRequirement]}
            </p>

            {!compact && (
              <p className="mt-1 text-xs text-zinc-500">
                티어 기준 {TIER_LABELS[result.tierGroup]}
              </p>
            )}

            <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-xs font-semibold text-zinc-500">왜 떴나요?</p>
              <p className="mt-1 text-sm leading-6 text-zinc-700">
                {explainResult(result)}
              </p>
            </div>

            <div className="mt-3">
              <h4 className="text-xs font-semibold text-zinc-500">
                핵심 반복 요소
              </h4>
              <ul className="mt-2 space-y-2">
                {result.repeatedFactors
                  .slice(0, repeatedFactorLimit)
                  .map((factor) => (
                    <li
                      key={`${result.id}-${factor.factorLabelKo}`}
                      className="rounded-lg border border-zinc-200 bg-white p-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-zinc-900">
                          {factor.factorLabelKo}
                        </span>
                        {!compact && (
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${confidenceClass(
                              factor.adjustedConfidence
                            )}`}
                          >
                            {CONFIDENCE_LABELS[factor.adjustedConfidence]}
                          </span>
                        )}
                      </div>
                      {!compact && (
                        <p className="mt-1 text-xs leading-5 text-zinc-600">
                          {factor.reasonKo}
                        </p>
                      )}
                    </li>
                  ))}
              </ul>
            </div>

            {!compact && (
              <div className="mt-3">
                <h4 className="text-xs font-semibold text-zinc-500">
                  추가 확인 필요 요소
                </h4>
                {result.eliminatedFactors.length > 0 ? (
                  <ul className="mt-2 space-y-1.5 text-sm leading-6 text-zinc-700">
                    {result.eliminatedFactors
                      .slice(0, eliminatedFactorLimit)
                      .map((factor) => (
                        <li
                          key={`${result.id}-${factor.labelKo}`}
                          className="flex gap-2"
                        >
                          <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-zinc-400" />
                          <span>
                            <span className="font-medium">
                              {factor.labelKo}
                            </span>
                            : {factor.reasonKo}
                          </span>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-zinc-600">
                    아직 추가 확인이 필요한 요소가 충분하지 않습니다.
                  </p>
                )}
              </div>
            )}

            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <h4 className="text-xs font-semibold text-emerald-800">
                다음 판 목표
              </h4>
              <p className="mt-1 text-sm leading-6 text-emerald-950">
                {actionOnlyGoal(result.nextGameGoalKo)}
              </p>
            </div>

            <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-3">
              <h4 className="text-xs font-semibold text-zinc-500">근거 한계</h4>
              <p className="mt-1 text-sm leading-6 text-zinc-700">
                {compactCautionKo()}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
