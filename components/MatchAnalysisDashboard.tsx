import RankedSceneCard from "@/components/RankedSceneCard";
import type {
  MatchReviewReport,
  RankedReviewScene,
  SceneBundle,
} from "@/types/matchReview";

type MatchAnalysisDashboardProps = {
  report: MatchReviewReport | null;
  selectedScene: RankedReviewScene | null;
  onSelectScene: (scene: RankedReviewScene) => void;
};

type SceneSectionProps = {
  title: string;
  description: string;
  scenes: RankedReviewScene[];
  emptyText: string;
  selectedScene: RankedReviewScene | null;
  sceneBundlesByRepresentative: Map<string, SceneBundle>;
  onSelectScene: (scene: RankedReviewScene) => void;
  showBundleSummary?: boolean;
};

function SceneSection({
  title,
  description,
  scenes,
  emptyText,
  selectedScene,
  sceneBundlesByRepresentative,
  onSelectScene,
  showBundleSummary = false,
}: SceneSectionProps) {
  return (
    <section className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
      <div>
        <h3 className="text-sm font-bold text-zinc-950">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-zinc-500">{description}</p>
      </div>

      {scenes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 bg-white p-3 text-xs text-zinc-500">
          {emptyText}
        </p>
      ) : (
        <div className="space-y-2">
          {scenes.map((scene) => (
            <RankedSceneCard
              key={`${title}-${scene.sceneId}`}
              scene={scene}
              sceneBundle={sceneBundlesByRepresentative.get(scene.sceneId)}
              showBundleSummary={showBundleSummary}
              isSelected={selectedScene?.sceneId === scene.sceneId}
              onClick={() => onSelectScene(scene)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default function MatchAnalysisDashboard({
  report,
  selectedScene,
  onSelectScene,
}: MatchAnalysisDashboardProps) {
  if (!report) return null;

  const improvementScenes = report.improvementScenes.slice(0, 5);
  const strengthScenes = report.strengthScenes.slice(0, 3);
  const topScenes = report.topScenes.slice(0, 5);
  const sceneBundlesByRepresentative = new Map(
    (report.sceneBundles ?? []).map((sceneBundle) => [
      sceneBundle.representative.sceneId,
      sceneBundle,
    ])
  );

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

      <div className="mt-4 space-y-3">
        <SceneSection
          title="개선 후보"
          description="이번 경기에서 다시 볼 만한 위험 판단, 놓친 전환, 반복 습관 후보입니다."
          scenes={improvementScenes}
          emptyText="개선 후보로 분리된 장면이 없습니다."
          selectedScene={selectedScene}
          sceneBundlesByRepresentative={sceneBundlesByRepresentative}
          onSelectScene={onSelectScene}
        />
        <SceneSection
          title="강점 후보"
          description="이번 경기에서 유지할 만한 좋은 판단 후보입니다."
          scenes={strengthScenes}
          emptyText="강점 후보로 분리된 장면이 없습니다."
          selectedScene={selectedScene}
          sceneBundlesByRepresentative={sceneBundlesByRepresentative}
          onSelectScene={onSelectScene}
        />
        <SceneSection
          title="대표 장면"
          description="강점과 개선 후보를 섞어 뽑은 대표 복기 장면입니다."
          scenes={topScenes}
          emptyText="분석된 장면이 없습니다."
          selectedScene={selectedScene}
          sceneBundlesByRepresentative={sceneBundlesByRepresentative}
          showBundleSummary
          onSelectScene={onSelectScene}
        />
      </div>
    </section>
  );
}
