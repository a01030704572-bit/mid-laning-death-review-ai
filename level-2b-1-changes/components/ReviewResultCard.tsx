import { ReviewResult, RiskTag, ScenarioType } from "@/types/review";

type Props = {
  riskTags: RiskTag[];
  scenarioType?: ScenarioType;
  result: ReviewResult;
};

const SCENARIO_LABELS: Record<ScenarioType, { label: string; color: string }> = {
  PRE_LANE_VISION:      { label: "레벨 1 시야/침범", color: "bg-purple-100 text-purple-800 border-purple-300" },
  GANKED_WHILE_PUSHING: { label: "푸시 중 갱 당함",  color: "bg-red-100 text-red-800 border-red-300" },
  SOLO_KILL_TRADE:      { label: "1:1 교전",         color: "bg-orange-100 text-orange-800 border-orange-300" },
  RECALL_GREED:         { label: "귀환 탐욕",         color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  UNSAFE_WARDING:       { label: "위험 와딩",         color: "bg-blue-100 text-blue-800 border-blue-300" },
  ADVANTAGE_CONVERSION: { label: "이득 전환",         color: "bg-green-100 text-green-800 border-green-300" },
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

export default function ReviewResultCard({ riskTags, scenarioType, result }: Props) {
  const detectedScenario = scenarioType ?? result.scenario_type;
  const scenarioInfo = detectedScenario ? SCENARIO_LABELS[detectedScenario] : null;

  return (
    <section className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-bold">1:1 Coaching Review</h2>
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
            {detectedScenario} · {scenarioInfo.label}
          </span>
        </div>
      )}

      {/* Generated Risk Tags */}
      <div>
        <h3 className="font-semibold">Generated Risk Tags</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {riskTags.map((tag) => (
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
            {result.main_question}
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
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Possible Risk Factors */}
      {result.possible_risk_factors && result.possible_risk_factors.length > 0 && (
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

      {/* Next Laning Goal */}
      {result.next_laning_goal && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <h3 className="font-semibold text-emerald-900">다음 판 라인전 목표</h3>
          <p className="mt-1 text-sm text-emerald-800">{result.next_laning_goal}</p>
        </div>
      )}

      {/* Risk Checklist */}
      {result.risk_checklist && result.risk_checklist.length > 0 && (
        <Section title="리스크 체크리스트">
          <ul className="space-y-2">
            {result.risk_checklist.map((item, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="mt-0.5 text-zinc-400">☐</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Confidence Note */}
      <div className="rounded-xl border border-zinc-200 p-3 text-sm leading-6 text-zinc-600">
        <p className="font-semibold text-zinc-800">Confidence Note</p>
        <p className="mt-1">{result.confidence_note ?? result.confidenceNote}</p>
      </div>
    </section>
  );
}
