import type { RankedReviewScene, SceneValence } from "@/types/matchReview";

export function getUserFacingSceneTitle(scene: RankedReviewScene) {
  if (isJungleScene(scene)) return "정글 위치 확인이 필요한 장면";
  if (isObjectiveScene(scene)) return "오브젝트 전 준비를 볼 장면";
  if (isSoloKillScene(scene)) return "교전 이득을 만든 장면";
  if (isConversionScene(scene)) return "이득 전환을 확인할 장면";
  if (scene.autoSceneType === "unsafe_warding_candidate") {
    return "시야 확인이 필요한 장면";
  }
  if (scene.autoSceneType === "no_flash_fight_candidate") {
    return "스펠 없이 이어진 교전";
  }
  if (scene.autoSceneType === "support_roam_collapse_candidate") {
    return "합류 방향을 확인할 장면";
  }
  if (scene.autoSceneType === "tempo_loss_candidate") {
    return "템포 손실을 확인할 장면";
  }
  if (scene.autoSceneType === "wave_management_error_candidate") {
    return "웨이브 관리가 흔들린 장면";
  }
  if (scene.autoSceneType === "blind_roaming_candidate") {
    return "로밍 전 조건을 확인할 장면";
  }
  if (scene.autoSceneType === "poor_resource_management_candidate") {
    return "자원 상태를 확인할 장면";
  }
  if (scene.autoSceneType === "death_review_candidate") {
    return "사망 원인을 확인할 장면";
  }

  return scene.sceneValence === "good_decision" ? "유지할 판단" : "복기할 장면";
}

export function getUserFacingSceneBadge(scene: RankedReviewScene) {
  if (scene.sceneValence === "good_decision") return "유지할 판단";
  if (scene.sceneValence === "missed_opportunity") return "전환 체크";
  if (scene.sceneValence === "pattern_flag") return "반복 체크";
  return "다음 판에 조심";
}

export function getUserFacingSceneDescription(scene: RankedReviewScene) {
  if (scene.sceneValence === "good_decision") {
    return "다음 판에도 유지할 만한 판단입니다.";
  }
  if (isJungleScene(scene)) {
    return "압박하거나 교전을 이어가기 전에 상대 정글 위치를 확인했는지 먼저 볼 만합니다.";
  }
  if (isObjectiveScene(scene)) {
    return "오브젝트 전에 웨이브, 귀환, 시야 준비가 맞았는지 확인해보세요.";
  }
  if (isSoloKillScene(scene)) {
    return "교전 이득을 만든 뒤 어떤 선택으로 이어졌는지 같이 보면 좋습니다.";
  }
  if (isConversionScene(scene)) {
    return "이득을 만든 뒤 웨이브, 플레이트, 귀환 중 무엇을 선택했는지 확인해보세요.";
  }
  if (scene.sceneValence === "missed_opportunity") {
    return "이득을 더 크게 만들 수 있었는지 확인할 장면입니다.";
  }
  if (scene.sceneValence === "pattern_flag") {
    return "비슷한 조건이 반복되는지 체크할 만한 장면입니다.";
  }

  return "다음 판에 같은 조건이 나오면 먼저 체크할 장면입니다.";
}

export function getUserFacingVerificationText(scene: RankedReviewScene) {
  if (scene.confirmationQuestions.length === 0) return null;
  if (isObjectiveScene(scene)) return "오브젝트 전 상황 확인";
  if (isJungleScene(scene)) return "정글 위치는 영상으로 확인";
  return "복기 필요";
}

export function getDebugSceneValenceLabelKo(sceneValence: SceneValence) {
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

function isJungleScene(scene: RankedReviewScene) {
  return (
    scene.autoSceneType === "jungle_gank_death_candidate" ||
    scene.primaryScenarioId === "fight_with_unknown_enemy_jungler" ||
    scene.primaryScenarioId === "ganked_while_pushing"
  );
}

function isObjectiveScene(scene: RankedReviewScene) {
  return (
    scene.autoSceneType === "objective_setup_failure_candidate" ||
    scene.primaryScenarioId === "death_before_objective" ||
    scene.primaryScenarioId === "objective_trade_decision" ||
    scene.primaryScenarioId === "bad_recall_before_objective"
  );
}

function isSoloKillScene(scene: RankedReviewScene) {
  return scene.autoSceneType === "solo_kill_candidate";
}

function isConversionScene(scene: RankedReviewScene) {
  return (
    scene.autoSceneType === "post_kill_conversion_candidate" ||
    scene.primaryScenarioId === "successful_solo_kill_poor_conversion"
  );
}
