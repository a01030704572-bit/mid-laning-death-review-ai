import { getReviewReadinessPreviewCards } from "@/lib/reviewReadinessPreview";
import type { ReviewReadinessStatus } from "@/types/reviewReadiness";

const statusStyles: Record<ReviewReadinessStatus, string> = {
  riot_ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
  video_ready: "border-sky-200 bg-sky-50 text-sky-700",
  match_inference_needed: "border-amber-200 bg-amber-50 text-amber-700",
  riot_fallback: "border-zinc-200 bg-zinc-100 text-zinc-600",
};

export default function RecentReviewFlowPreview() {
  const readinessCards = getReviewReadinessPreviewCards();

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-zinc-950">
            최근 경기 리포트 상태
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-zinc-600">
            경기가 끝나면 Riot 기록과 영상 근거 상태에 따라 리포트가 준비됩니다.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {readinessCards.map((card) => (
          <article
            key={card.id}
            className="flex h-full flex-col rounded-xl border border-zinc-200 bg-zinc-50 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span
                className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusStyles[card.id]}`}
              >
                {card.statusLabelKo}
              </span>
              <span className="text-[11px] font-medium text-zinc-400">
                {card.eyebrowKo}
              </span>
            </div>

            <h3 className="mt-3 text-sm font-bold text-zinc-950">
              {card.titleKo}
            </h3>
            <p className="mt-2 flex-1 text-xs leading-5 text-zinc-600">
              {card.descriptionKo}
            </p>
            <p className="mt-3 border-t border-zinc-200 pt-3 text-[11px] font-semibold text-zinc-500">
              근거 상태 · {card.evidenceLabelKo}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
