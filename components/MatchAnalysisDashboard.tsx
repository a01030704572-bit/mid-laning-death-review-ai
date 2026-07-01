import RankedSceneCard from "@/components/RankedSceneCard";
import type {
  MatchReviewReport,
  RankedReviewScene,
} from "@/types/matchReview";

type MatchAnalysisDashboardProps = {
  report: MatchReviewReport | null;
  selectedScene: RankedReviewScene | null;
  onSelectScene: (scene: RankedReviewScene) => void;
};

export default function MatchAnalysisDashboard({
  report,
  selectedScene,
  onSelectScene,
}: MatchAnalysisDashboardProps) {
  if (!report) return null;

  const topScenes = report.topScenes.slice(0, 5);

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-zinc-950">
            자동 복기 장면 후보
          </h2>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Riot 타임라인 기반으로 복기 가치가 높은 장면을 정렬했습니다.
          </p>
        </div>
        <span className="w-fit rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-600">
          {report.analysisStatus === "complete" ? "분석 완료" : "부분 분석"}
        </span>
      </div>

      {topScenes.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
          분석된 장면이 없습니다.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {topScenes.map((scene) => (
            <RankedSceneCard
              key={scene.sceneId}
              scene={scene}
              isSelected={selectedScene?.sceneId === scene.sceneId}
              onClick={() => onSelectScene(scene)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
