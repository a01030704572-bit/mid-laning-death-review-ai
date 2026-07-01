import type { RankedReviewScene, SceneValence } from "@/types/matchReview";

type RankedSceneCardProps = {
  scene: RankedReviewScene;
  isSelected: boolean;
  onClick: () => void;
};

function sceneValenceLabelKo(sceneValence: SceneValence) {
  switch (sceneValence) {
    case "good_decision":
      return "좋은 판단 후보";
    case "bad_decision":
      return "위험 판단 후보";
    case "missed_opportunity":
      return "놓친 전환 후보";
    case "pattern_flag":
      return "반복 습관 후보";
  }
}

function formatGameTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.max(0, seconds % 60);
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function getEvidenceBullets(scene: RankedReviewScene) {
  const summaries =
    scene.riotEvidenceSummary.length > 0
      ? scene.riotEvidenceSummary
      : [scene.evidenceSummaryKo];

  return summaries.filter(Boolean).slice(0, 3);
}

export default function RankedSceneCard({
  scene,
  isSelected,
  onClick,
}: RankedSceneCardProps) {
  const evidenceBullets = getEvidenceBullets(scene);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition ${
        isSelected
          ? "border-zinc-950 bg-zinc-100 shadow-sm"
          : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium text-zinc-500">
            {formatGameTime(scene.gameTimeSec)}
            {scene.windowSec ? ` · ${scene.windowSec}초 window` : ""}
          </p>
          <h3 className="mt-1 text-sm font-bold text-zinc-950">
            {scene.displayNameKo}
          </h3>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold text-zinc-600">
            {sceneValenceLabelKo(scene.sceneValence)}
          </span>
          {scene.confirmationQuestions.length > 0 && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
              확인 필요
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-zinc-950 px-3 py-1 text-xs font-semibold text-white">
        <span>복기 가치 점수</span>
        <span>{scene.reviewWorthinessScore}</span>
      </div>

      {evidenceBullets.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs leading-5 text-zinc-600">
          {evidenceBullets.map((summary) => (
            <li key={summary}>{summary}</li>
          ))}
        </ul>
      )}
    </button>
  );
}
