import PostGameSummaryCard from "@/components/PostGameSummaryCard";
import RankedSceneCard from "@/components/RankedSceneCard";
import type { AppMode } from "@/lib/appMode";
import type {
  MatchReviewReport,
  RankedReviewScene,
  SceneBundle,
} from "@/types/matchReview";

type MatchAnalysisDashboardProps = {
  report: MatchReviewReport | null;
  selectedScene: RankedReviewScene | null;
  onSelectScene: (scene: RankedReviewScene) => void;
  appMode?: AppMode;
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
  appMode?: AppMode;
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
  appMode = "user",
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
              appMode={appMode}
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
  appMode = "user",
}: MatchAnalysisDashboardProps) {
  if (!report) return null;

  const isDebugMode = appMode === "debug";
  const topScenes = report.topScenes.slice(0, isDebugMode ? 5 : 3);
  const topSceneIds = new Set(topScenes.map((scene) => scene.sceneId));
  const improvementScenes = (
    isDebugMode
      ? report.improvementScenes
      : report.improvementScenes.filter(
          (scene) => !topSceneIds.has(scene.sceneId)
        )
  ).slice(0, isDebugMode ? 5 : 3);
  const strengthScenes = report.strengthScenes.slice(0, 3);
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
            Riot 타임라인 기반으로 이번 경기에서 먼저 볼 만한 장면을 정렬했습니다.
          </p>
        </div>
        <span className="w-fit rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-600">
          {report.analysisStatus === "complete" ? "분석 완료" : "부분 분석"}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        <PostGameSummaryCard
          topScenes={topScenes}
          strengthScenes={strengthScenes}
          improvementScenes={improvementScenes}
        />
        <SceneSection
          title="대표 장면"
          description="이번 경기에서 가장 먼저 복기할 핵심 장면입니다."
          scenes={topScenes}
          emptyText="아직 분석된 대표 장면이 없습니다."
          selectedScene={selectedScene}
          sceneBundlesByRepresentative={sceneBundlesByRepresentative}
          showBundleSummary
          appMode={appMode}
          onSelectScene={onSelectScene}
        />
        {(isDebugMode || strengthScenes.length > 0) && (
          <SceneSection
            title="유지할 좋은 판단"
            description="다음 판에도 유지할 만한 좋은 판단 후보입니다."
            scenes={strengthScenes}
            emptyText="아직 자동으로 분리된 강점 후보가 없습니다."
            selectedScene={selectedScene}
            sceneBundlesByRepresentative={sceneBundlesByRepresentative}
            appMode={appMode}
            onSelectScene={onSelectScene}
          />
        )}
        <SceneSection
          title="다음에 체크할 후보"
          description="위험 판단, 놓친 전환, 반복 습관으로 이어질 수 있는 후보입니다."
          scenes={improvementScenes}
          emptyText="아직 다음에 체크할 후보가 없습니다."
          selectedScene={selectedScene}
          sceneBundlesByRepresentative={sceneBundlesByRepresentative}
          appMode={appMode}
          onSelectScene={onSelectScene}
        />
      </div>
    </section>
  );
}
