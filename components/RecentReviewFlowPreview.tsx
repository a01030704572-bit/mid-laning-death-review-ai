type ReviewFlowStatus =
  | "riot_ready"
  | "video_ready"
  | "match_unknown"
  | "riot_fallback";

type ReviewFlowPreviewItem = {
  id: string;
  title: string;
  timeLabel: string;
  status: ReviewFlowStatus;
  statusLabel: string;
  description: string;
  evidenceLabel: string;
};

const previewItems: ReviewFlowPreviewItem[] = [
  {
    id: "riot-ready",
    title: "최근 경기 리포트",
    timeLabel: "경기 종료 후",
    status: "riot_ready",
    statusLabel: "리포트 준비됨",
    description:
      "Riot 타임라인만으로 대표 장면과 다음 판 목표를 확인할 수 있습니다.",
    evidenceLabel: "Riot-only",
  },
  {
    id: "video-ready",
    title: "영상 근거가 있는 리포트",
    timeLabel: "클립 연결 완료",
    status: "video_ready",
    statusLabel: "영상 근거 있음",
    description:
      "장면 시간과 매치가 맞으면 관련 클립을 함께 보며 복기할 수 있습니다.",
    evidenceLabel: "Riot + Video",
  },
  {
    id: "match-unknown",
    title: "경기 매칭 확인 필요",
    timeLabel: "후보 추정 중",
    status: "match_unknown",
    statusLabel: "확인 필요",
    description:
      "가까운 경기 후보가 여러 개면 영상 근거를 붙이지 않고 확인 상태로 남깁니다.",
    evidenceLabel: "Match unknown",
  },
  {
    id: "riot-fallback",
    title: "영상 연결 실패",
    timeLabel: "안전한 대체 경로",
    status: "riot_fallback",
    statusLabel: "Riot 리포트 제공",
    description:
      "클립을 사용할 수 없어도 분석을 중단하지 않고 Riot-only 리포트로 이어집니다.",
    evidenceLabel: "Fallback",
  },
];

const statusStyles: Record<ReviewFlowStatus, string> = {
  riot_ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
  video_ready: "border-sky-200 bg-sky-50 text-sky-700",
  match_unknown: "border-amber-200 bg-amber-50 text-amber-700",
  riot_fallback: "border-zinc-200 bg-zinc-100 text-zinc-600",
};

export default function RecentReviewFlowPreview() {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Recent Review Flow
            </p>
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold text-zinc-500">
              상태 예시 Preview
            </span>
          </div>
          <h2 className="mt-2 text-lg font-bold text-zinc-950">
            최근 경기 리포트 준비 상태
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-zinc-600">
            자동 수집이 연결되면 최근 경기가 아래 상태를 거쳐 안전한 복기 리포트로 준비됩니다.
          </p>
        </div>
        <p className="max-w-sm text-xs leading-5 text-zinc-500 sm:text-right">
          현재는 제품 흐름을 보여주는 UI Preview이며 실제 저장이나 백그라운드 처리는 하지 않습니다.
        </p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {previewItems.map((item) => (
          <article
            key={item.id}
            className="flex h-full flex-col rounded-xl border border-zinc-200 bg-zinc-50 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span
                className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusStyles[item.status]}`}
              >
                {item.statusLabel}
              </span>
              <span className="text-[11px] font-medium text-zinc-400">
                {item.timeLabel}
              </span>
            </div>

            <h3 className="mt-3 text-sm font-bold text-zinc-950">
              {item.title}
            </h3>
            <p className="mt-2 flex-1 text-xs leading-5 text-zinc-600">
              {item.description}
            </p>
            <p className="mt-3 border-t border-zinc-200 pt-3 text-[11px] font-semibold text-zinc-500">
              근거 상태 · {item.evidenceLabel}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
