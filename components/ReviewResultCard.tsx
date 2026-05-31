import { ReviewResult, RiskTag } from "@/types/review";

type Props = {
  riskTags: RiskTag[];
  result: ReviewResult;
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <h3 className="font-semibold text-zinc-900">{title}</h3>
      <div className="mt-2 text-sm leading-6 text-zinc-700">{children}</div>
    </div>
  );
}

export default function ReviewResultCard({ riskTags, result }: Props) {
  return (
    <section className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-bold">1:1 Coaching Review</h2>
        <p className="text-sm text-zinc-500">
          입력된 정보와 Risk Tag를 바탕으로 생성된 코칭 피드백입니다. 확정 판단이 아니라 복기용 가설입니다.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-300 bg-zinc-950 p-5 text-white">
        <h3 className="text-lg font-bold">Coach Feedback</h3>

        <div className="mt-4 space-y-4 text-sm leading-6">
          <div>
            <p className="font-semibold text-zinc-200">핵심 피드백</p>
            <p className="mt-1 text-zinc-100">
              {result.coachFeedback?.coreFeedback}
            </p>
          </div>

          <div>
            <p className="font-semibold text-zinc-200">잘한 점</p>
            <p className="mt-1 text-zinc-100">
              {result.coachFeedback?.whatWentWell}
            </p>
          </div>

          <div>
            <p className="font-semibold text-zinc-200">고칠 점</p>
            <p className="mt-1 text-zinc-100">
              {result.coachFeedback?.whatToImprove}
            </p>
          </div>

          <div className="rounded-xl bg-white/10 p-3">
            <p className="font-semibold text-zinc-100">다음 판 행동 하나</p>
            <p className="mt-1 text-zinc-100">
              {result.coachFeedback?.oneActionForNextGame}
            </p>
          </div>
        </div>
      </div>
      
      <Section title="상황 이해">
        <p>{result.situationUnderstanding}</p>
      </Section>

      <Section title="판단 흐름 분석">
        <p>{result.decisionFlowAnalysis}</p>
      </Section>

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

      <div>
        <h3 className="font-semibold">가능한 위험 요인</h3>
        <div className="mt-2 space-y-3">
          {result.possibleRiskFactors?.map((factor, index) => (
            <div key={index} className="rounded-xl bg-zinc-50 p-3">
              <p className="font-medium">{factor.tag}</p>
              <p className="text-sm text-zinc-700">{factor.explanation}</p>
            </div>
          ))}
        </div>
      </div>

      <Section title="확정할 수 없는 정보">
        <ul className="list-disc space-y-1 pl-5">
          {result.uncertainInfo?.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </Section>

      <Section title="다시 봐야 할 장면 체크포인트">
        <ul className="list-disc space-y-1 pl-5">
          {result.sceneCheckpoints?.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </Section>

      <Section title="다음 판 행동 목표">
        <ul className="list-disc space-y-1 pl-5">
          {result.nextGameGoals?.map((goal, index) => (
            <li key={index}>{goal}</li>
          ))}
        </ul>
      </Section>

      <Section title="티어별 조언">
        <p>{result.tierAdvice}</p>
      </Section>

      <div>
        <h3 className="font-semibold">장기 패턴 태그</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {result.longTermPatternTags?.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1 text-xs font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 p-3 text-sm leading-6 text-zinc-600">
        <p className="font-semibold text-zinc-800">Confidence Note</p>
        <p className="mt-1">{result.confidenceNote}</p>
      </div>
    </section>
  );
}