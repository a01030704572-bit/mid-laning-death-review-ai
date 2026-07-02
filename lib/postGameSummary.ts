import type { RankedReviewScene } from "@/types/matchReview";

export function formatReviewSceneTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.max(0, seconds % 60);
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function buildNextGameActionGoal(scene?: RankedReviewScene | null) {
  if (!scene) {
    return "다음 판에는 가장 위험했던 장면과 같은 조건이 다시 나오는지 먼저 체크하기.";
  }

  const searchableText = [
    scene.autoSceneType,
    scene.primaryScenarioId,
    scene.sceneValence,
    scene.displayNameKo,
    scene.evidenceSummaryKo,
    ...scene.riotEvidenceSummary,
    ...scene.habitSignals.map((signal) => signal.habitType),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    searchableText.includes("solo_kill") ||
    searchableText.includes("post_kill") ||
    searchableText.includes("conversion") ||
    searchableText.includes("솔킬") ||
    searchableText.includes("전환")
  ) {
    return "솔킬 이후 20초 안에 웨이브, 플레이트, 귀환 중 하나를 선택하기.";
  }

  if (
    searchableText.includes("objective") ||
    searchableText.includes("dragon") ||
    searchableText.includes("baron") ||
    searchableText.includes("오브젝트")
  ) {
    return "오브젝트 60초 전에는 미드 웨이브 상태부터 먼저 확인하기.";
  }

  if (
    searchableText.includes("jungle") ||
    searchableText.includes("gank") ||
    searchableText.includes("death") ||
    searchableText.includes("정글")
  ) {
    return "상대 정글 위치가 확인되기 전까지 시야 없는 쪽으로 압박하지 않기.";
  }

  return "다음 판에는 가장 위험했던 장면과 같은 조건이 다시 나오는지 먼저 체크하기.";
}
