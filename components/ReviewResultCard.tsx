import { ReviewResult, RiskTag, ScenarioType } from "@/types/review";
import { sanitizeUserFacingText } from "@/lib/userFacingText";

type Props = {
  riskTags: RiskTag[];
  scenarioType?: ScenarioType;
  result: ReviewResult;
};

const RISK_FACTOR_EXPLANATION_OVERRIDES: Record<string, string> = {
  JUNGLE_COVER_AVAILABLE:
    "교전 방향은 아군 정글 커버 쪽이었기 때문에 방향 선택 자체는 크게 나쁘지 않았을 수 있습니다. 다만 딜교 손해의 핵심은 상대 핵심 스킬 쿨타임 확인, 내 진입 타이밍, 웨이브 상태, 챔피언 상성 조건 쪽에 있었을 가능성이 높습니다.",
};

const SCENARIO_LABELS: Record<ScenarioType, { label: string; color: string }> = {
  PRE_LANE_VISION:      { label: "레벨 1 시야/침범", color: "bg-purple-100 text-purple-800 border-purple-300" },
  GANKED_WHILE_PUSHING: { label: "푸시 중 갱 당함",  color: "bg-red-100 text-red-800 border-red-300" },
  SOLO_KILL_TRADE:      { label: "1:1 교전",         color: "bg-orange-100 text-orange-800 border-orange-300" },
  RECALL_GREED:         { label: "귀환 탐욕",         color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  UNSAFE_WARDING:       { label: "위험 와딩",         color: "bg-blue-100 text-blue-800 border-blue-300" },
  ADVANTAGE_CONVERSION: { label: "이득 전환",         color: "bg-green-100 text-green-800 border-green-300" },
  OBJECTIVE_PREP_TURN:  { label: "오브젝트 준비",     color: "bg-cyan-100 text-cyan-800 border-cyan-300" },
  MID_ROAM_FIGHT_JOIN:  { label: "미드 로밍/교전 합류", color: "bg-indigo-100 text-indigo-800 border-indigo-300" },
  GENERAL_LANING_DEATH: { label: "일반 라인전 사망",  color: "bg-zinc-100 text-zinc-700 border-zinc-300" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <h3 className="font-semibold text-zinc-900">{title}</h3>
      <div className="mt-2 text-sm leading-6 text-zinc-700">{children}</div>
    </div>
  );
}

function getDisplayRiskTags(riskTags: RiskTag[]) {
  const tagSet = new Set<RiskTag>(riskTags);
  const hiddenTags = new Set<RiskTag>();

  if (tagSet.has("IGNORED_KNOWN_ENEMY_JUNGLE")) {
    hiddenTags.add("ENEMY_JUNGLER_NEARBY");
  }

  if (tagSet.has("FOUGHT_WITHOUT_ALLY_COVER")) {
    hiddenTags.add("NO_ALLY_COVER");
  }

  if (tagSet.has("FOUGHT_TOWARD_ENEMY_COVER")) {
    hiddenTags.add("FIGHT_TOWARD_ENEMY_JUNGLE");
  }

  if (
    tagSet.has("ENEMY_SUPPORT_ROAM_WINDOW") ||
    tagSet.has("ALLY_SUPPORT_CANNOT_MOVE")
  ) {
    hiddenTags.add("ENEMY_SUPPORT_MOVE_FIRST");
  }

  return riskTags.filter((tag) => !hiddenTags.has(tag));
}

function shouldShowRiskFactor(tag: string, riskTags: RiskTag[], displayRiskTags: RiskTag[]) {
  const generatedTags = new Set<string>(riskTags);
  const visibleTags = new Set<string>(displayRiskTags);

  return !generatedTags.has(tag) || visibleTags.has(tag);
}

function getRiskFactorExplanation(tag: string, explanation: string) {
  return RISK_FACTOR_EXPLANATION_OVERRIDES[tag] ?? explanation;
}

export default function ReviewResultCard({ riskTags, scenarioType, result }: Props) {
  const detectedScenario = scenarioType ?? result.scenario_type;
  const scenarioInfo = detectedScenario ? SCENARIO_LABELS[detectedScenario] : null;
  const displayRiskTags = getDisplayRiskTags(riskTags);
  const displayRiskFactors = result.possible_risk_factors?.filter((factor) =>
    shouldShowRiskFactor(factor.tag, riskTags, displayRiskTags)
  );

  return (
    <section className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-bold">Decision Coaching Review</h2>
        <p className="text-sm text-zinc-500">
          입력된 정보와 Risk Tag를 바탕으로 생성된 코칭 피드백입니다. 확정 판단이 아니라 복기용 가설입니다.
        </p>
      </div>

      {/* Scenario Type Badge */}
      {scenarioInfo && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-zinc-500">감지된 시나리오</span>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${scenarioInfo.color}`}
          >
            {scenarioInfo.label}
          </span>
        </div>
      )}

      {/* Generated Risk Tags */}
      <div>
        <h3 className="font-semibold">Generated Risk Tags</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {displayRiskTags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1 text-xs font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Main Review Question — 강조 */}
      {result.main_question && (
        <div className="rounded-2xl border-2 border-zinc-900 bg-zinc-950 p-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">
            핵심 복기 질문
          </p>
          <p className="text-lg font-bold leading-snug text-white">
            {sanitizeUserFacingText(result.main_question)}
          </p>
        </div>
      )}

      {/* Follow-up Questions */}
      {result.follow_up_questions && result.follow_up_questions.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-2">
          <h3 className="font-semibold text-zinc-900">추가 복기 질문</h3>
          <ul className="space-y-2 mt-1">
            {result.follow_up_questions.map((q, i) => (
              <li key={i} className="flex gap-2 text-sm text-zinc-700">
                <span className="mt-0.5 flex-shrink-0 text-zinc-400 font-bold">Q{i + 2}.</span>
                <span>{sanitizeUserFacingText(q)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.goodDecisionSummary && (
        <Section title="잘한 판단">
          <p>{sanitizeUserFacingText(result.goodDecisionSummary)}</p>
        </Section>
      )}

      {result.improvementFocus && (
        <Section title="추가로 조심할 변수">
          <p>{sanitizeUserFacingText(result.improvementFocus)}</p>
        </Section>
      )}

      {displayRiskFactors && displayRiskFactors.length > 0 && (
        <div>
          <h3 className="font-semibold">감지된 판단 요소</h3>
          <div className="mt-2 space-y-3">
            {displayRiskFactors.map((factor, index) => (
              <div key={index} className="rounded-xl bg-zinc-50 border border-zinc-200 p-3">
                <p className="text-xs font-semibold text-zinc-500">{factor.tag}</p>
                <p className="mt-1 text-sm text-zinc-700">
                  {sanitizeUserFacingText(
                    getRiskFactorExplanation(factor.tag, factor.explanation)
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Possible Risk Factors */}
      {false && result.possible_risk_factors && result.possible_risk_factors.length > 0 && (
        <div>
          <h3 className="font-semibold">가능한 위험 요인</h3>
          <div className="mt-2 space-y-3">
            {result.possible_risk_factors.map((factor, index) => (
              <div key={index} className="rounded-xl bg-zinc-50 border border-zinc-200 p-3">
                <p className="text-xs font-semibold text-zinc-500">{factor.tag}</p>
                <p className="mt-1 text-sm text-zinc-700">{factor.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.coverAndEscapeAnalysis && (
        <Section title="정글/서폿 커버와 이탈 경로">
          <p>{sanitizeUserFacingText(result.coverAndEscapeAnalysis)}</p>
        </Section>
      )}

      {/* Next Laning Goal */}
      {result.next_laning_goal && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <h3 className="font-semibold text-emerald-900">다음 판 라인전 목표</h3>
          <p className="mt-1 text-sm text-emerald-800">
            {sanitizeUserFacingText(result.next_laning_goal)}
          </p>
        </div>
      )}

      {/* Risk Checklist */}
      {result.risk_checklist && result.risk_checklist.length > 0 && (
        <Section title="리스크 체크리스트">
          <ul className="space-y-2">
            {result.risk_checklist.map((item, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="mt-0.5 text-zinc-400">☐</span>
                <span>{sanitizeUserFacingText(item)}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Confidence Note */}
      <div className="rounded-xl border border-zinc-200 p-3 text-sm leading-6 text-zinc-600">
        <p className="font-semibold text-zinc-800">Confidence Note</p>
        <p className="mt-1">
          {sanitizeUserFacingText(result.confidence_note ?? result.confidenceNote)}
        </p>
      </div>
    </section>
  );
}
