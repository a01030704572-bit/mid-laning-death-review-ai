import type { AppMode } from "@/lib/appMode";
import {
  getDebugSceneValenceLabelKo,
  getUserFacingSceneBadge,
  getUserFacingSceneDescription,
  getUserFacingSceneTitle,
  getUserFacingVerificationText,
} from "@/lib/sceneCardCopy";
import type {
  RankedReviewScene,
  SceneBundle,
  SceneValence,
} from "@/types/matchReview";

type RankedSceneCardProps = {
  scene: RankedReviewScene;
  sceneBundle?: SceneBundle;
  showBundleSummary?: boolean;
  appMode?: AppMode;
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

function getUserReason(scene: RankedReviewScene) {
  switch (scene.sceneValence) {
    case "good_decision":
      return "이번 경기에서 다음 판에도 유지할 만한 판단 후보입니다.";
    case "bad_decision":
      return "다음 판에서 같은 조건이 나오면 먼저 체크할 위험 판단 후보입니다.";
    case "missed_opportunity":
      return "이득을 얻은 뒤 다음 행동 선택을 점검할 전환 후보입니다.";
    case "pattern_flag":
      return "반복될 수 있는 판단 습관을 확인할 후보입니다.";
  }
}

function sceneBundleLabelKo(sceneBundle: SceneBundle) {
  switch (sceneBundle.clusterType) {
    case "same_event_multi_type":
      return "같은 순간의 관련 후보";
    case "sequential_events":
      return "연속 판단 후보";
    case "single":
      return null;
  }
}

function hasMixedValence(sceneBundle: SceneBundle) {
  const bundledScenes = [sceneBundle.representative, ...sceneBundle.nearby];
  const hasStrength = bundledScenes.some(
    (bundledScene) => bundledScene.sceneValence === "good_decision"
  );
  const hasImprovement = bundledScenes.some(
    (bundledScene) => bundledScene.sceneValence !== "good_decision"
  );

  return hasStrength && hasImprovement;
}

export default function RankedSceneCard({
  scene,
  sceneBundle,
  showBundleSummary = false,
  appMode = "user",
  isSelected,
  onClick,
}: RankedSceneCardProps) {
  const isDebugMode = appMode === "debug";
  const evidenceBullets = getEvidenceBullets(scene);
  const nearbyScenes = sceneBundle?.nearby ?? [];
  const sceneBundleLabel = sceneBundle ? sceneBundleLabelKo(sceneBundle) : null;
  const shouldShowBundleSummary =
    isDebugMode && showBundleSummary && sceneBundle && nearbyScenes.length > 0;
  const firstConfirmationQuestion = scene.confirmationQuestions[0];
  const userVerificationText = getUserFacingVerificationText(scene);

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
            {isDebugMode && scene.windowSec
              ? ` · ${scene.windowSec}초 window`
              : ""}
          </p>
          <h3 className="mt-1 text-sm font-bold text-zinc-950">
            {isDebugMode ? scene.displayNameKo : getUserFacingSceneTitle(scene)}
          </h3>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold text-zinc-600">
            {isDebugMode
              ? getDebugSceneValenceLabelKo(scene.sceneValence)
              : getUserFacingSceneBadge(scene)}
          </span>
          {scene.confirmationQuestions.length > 0 && isDebugMode && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
              확인 필요
            </span>
          )}
          {scene.confirmationQuestions.length > 0 && !isDebugMode && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
              {userVerificationText}
            </span>
          )}
        </div>
      </div>

      {isDebugMode ? (
        <>
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
        </>
      ) : (
        <div className="mt-3 space-y-2">
          <p className="text-xs leading-5 text-zinc-600">
            {getUserFacingSceneDescription(scene)}
          </p>
          {firstConfirmationQuestion && (
            <p className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
              <span className="font-semibold">확인할 것: </span>
              <span className="hidden">
              <span className="font-semibold">확인할 것: </span>
              </span>
              {firstConfirmationQuestion.questionKo}
            </p>
          )}
        </div>
      )}

      {shouldShowBundleSummary && (
        <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <div className="flex flex-wrap items-center gap-2">
            {sceneBundleLabel && (
              <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-zinc-600">
                {sceneBundleLabel}
              </span>
            )}
            <p className="text-xs font-semibold text-zinc-700">
              근처 관련 후보 {nearbyScenes.length}개가 함께 묶였습니다.
            </p>
          </div>
          {sceneBundle && hasMixedValence(sceneBundle) && (
            <p className="mt-2 text-xs leading-5 text-zinc-600">
              이 장면은 강점과 개선 체크가 함께 있는 복합 장면입니다.
            </p>
          )}
          <ul className="mt-2 space-y-1 text-xs leading-5 text-zinc-500">
            {nearbyScenes.slice(0, 3).map((nearbyScene) => (
              <li key={nearbyScene.sceneId}>- {nearbyScene.displayNameKo}</li>
            ))}
          </ul>
        </div>
      )}
    </button>
  );
}
