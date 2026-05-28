import { ReviewResult, RiskTag } from "@/types/review";

type Props = {
  riskTags: RiskTag[];
  result: ReviewResult;
};

export default function ReviewResultCard({ riskTags, result }: Props) {
  return (
    <section className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-bold">Review Result</h2>
        <p className="text-sm text-zinc-500">
          입력된 정보 기반의 질문형 복기 결과입니다. 확정 판단이 아닙니다.
        </p>
      </div>

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
        <h3 className="font-semibold">Possible Risk Factors</h3>
        <div className="mt-2 space-y-3">
          {result.possible_risk_factors?.map((factor, index) => (
            <div key={index} className="rounded-xl bg-zinc-50 p-3">
              <p className="font-medium">{factor.tag}</p>
              <p className="text-sm text-zinc-700">{factor.explanation}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold">Review Questions</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {result.review_questions?.map((question, index) => (
            <li key={index}>{question}</li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl bg-zinc-50 p-4">
        <h3 className="font-semibold">Next Laning Goal</h3>
        <p className="mt-1 text-sm">{result.next_laning_goal}</p>
      </div>

      <div>
        <h3 className="font-semibold">Risk Checklist</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {result.risk_checklist?.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-zinc-200 p-3 text-sm text-zinc-600">
        {result.confidence_note}
      </div>
    </section>
  );
}