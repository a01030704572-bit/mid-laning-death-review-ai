import { DeathReviewInput, RiskTag } from "@/types/review";

export function generateRiskTags(input: DeathReviewInput): RiskTag[] {
  const tags = new Set<RiskTag>();


  const isSoloKillContext =
    input.currentOutcome === "solo_kill" ||
    input.deathCause === "solo_kill";
  const enemyJungleInfoState = input.enemyJungleInfoState ?? "unknown";
  const hasNearbyKnownThreat =
    enemyJungleInfoState === "seen_near" ||
    enemyJungleInfoState === "seen_but_ignored";
  const hasAllyCover =
    input.allyJungleCoverState === "same_side_cover" ||
    input.allyJungleCoverState === "near_mid" ||
    input.allyJungleCoverBeforeFight === "same_side_near_mid";
  const hasGoodPostKillEscape =
    input.postKillEscapePlan === "escape_through_ally_side" ||
    input.postKillEscapePlan === "clear_escape_route";
  const explicitEnemyJungleInfo = input.enemyJungleInfoBeforeFight;
  const explicitAllyJungleCover = input.allyJungleCoverBeforeFight;
  const explicitFightDirection = input.fightDirection;
  const explicitEnemySupport = input.enemySupportStateBeforeFight;
  const explicitAllySupport = input.allySupportStateBeforeFight;
  const hasExplicitEnemyJungleBeforeFightInfo =
    explicitEnemyJungleInfo !== undefined &&
    explicitEnemyJungleInfo !== "unknown";
  const knownEnemyJungleBeforeFight =
    explicitEnemyJungleInfo === "seen_same_side" ||
    explicitEnemyJungleInfo === "seen_near_mid";
  const foughtTowardMapSide =
    explicitFightDirection === "toward_top_side" ||
    explicitFightDirection === "toward_bot_side";
  const foughtTowardEnemyCover =
    input.fightDirectionRelativeToCover === "toward_enemy_jungle" ||
    explicitFightDirection === "toward_enemy_jungle" ||
    (explicitEnemyJungleInfo === "seen_same_side" && foughtTowardMapSide);
  const foughtTowardAllyCover =
    input.fightDirectionRelativeToCover === "toward_ally_cover" ||
    explicitFightDirection === "toward_ally_jungle";
  const foughtWithoutAllyCover =
    input.allyJungleCoverState === "opposite_side" ||
    input.allyJungleCoverState === "too_far" ||
    explicitAllyJungleCover === "opposite_side" ||
    explicitAllyJungleCover === "dead_or_recalled" ||
    explicitAllyJungleCover === "resetting";
  const knownEnemyCoverNearby =
    hasNearbyKnownThreat || knownEnemyJungleBeforeFight;

  // Pre-lane / level 1 vision or invade risk
  if (input.gameTime === "pre_lane" ||
    input.laneState === "pre_lane" ||
    input.deathCause === "pre_lane_vision_invade" ||
    input.deathCause === "early_collapse"
  ) {
    tags.add("PRE_LANE_VISION_RISK");
  }

  if (input.laneState === "pushing") {
    tags.add("UNTRACKED_PUSH");
  }

  if (enemyJungleInfoState === "unknown" && !hasExplicitEnemyJungleBeforeFightInfo) {
    tags.add("ENEMY_JUNGLER_UNKNOWN");
  }

  if (enemyJungleInfoState === "seen_near") {
    tags.add("ENEMY_JUNGLER_NEARBY");
  }

  if (enemyJungleInfoState === "seen_but_ignored") {
    tags.add("KNOWN_JUNGLE_THREAT_IGNORED");
  }

  if (hasAllyCover) {
    tags.add("ALLY_JUNGLE_COVER_AVAILABLE");
  }

  if (
    input.allyJungleCoverState === "opposite_side" ||
    input.allyJungleCoverState === "too_far"
  ) {
    tags.add("NO_ALLY_COVER");
  }

  if (foughtTowardAllyCover) {
    tags.add("FIGHT_TOWARD_ALLY_COVER");
  }

  if (input.fightDirectionRelativeToCover === "toward_enemy_jungle") {
    tags.add("FIGHT_TOWARD_ENEMY_JUNGLE");
  }

  if (input.postKillEscapePlan === "escape_through_ally_side") {
    tags.add("ESCAPE_ROUTE_TO_ALLY_SIDE");
  }

  if (
    input.postKillEscapePlan === "escape_through_enemy_side" ||
    input.postKillEscapePlan === "no_escape_plan"
  ) {
    tags.add("POST_KILL_ESCAPE_RISK");
  }

  if (input.postKillEscapePlan === "no_escape_plan") {
    tags.add("NO_ESCAPE_PLAN");
  }

  if (input.supportRoamState === "ally_support_can_move") {
    tags.add("SUPPORT_ROAM_WINDOW");
  }

  if (
    input.supportRoamState === "enemy_support_can_move_first" ||
    input.supportRoamState === "enemy_support_missing"
  ) {
    tags.add("ENEMY_SUPPORT_MOVE_FIRST");
  }

  if (
    hasNearbyKnownThreat &&
    hasAllyCover &&
    foughtTowardAllyCover &&
    hasGoodPostKillEscape
  ) {
    tags.add("REASONABLE_COVERED_KILL_ATTEMPT");
  }

  if (foughtTowardEnemyCover && knownEnemyCoverNearby) {
    tags.add("FOUGHT_TOWARD_ENEMY_COVER");
  }

  if (foughtWithoutAllyCover) {
    tags.add("FOUGHT_WITHOUT_ALLY_COVER");
  }

  if (
    enemyJungleInfoState === "seen_but_ignored" ||
    explicitEnemyJungleInfo === "seen_same_side" ||
    explicitEnemyJungleInfo === "seen_near_mid"
  ) {
    tags.add("IGNORED_KNOWN_ENEMY_JUNGLE");
  }

  if (
    explicitEnemySupport === "missing" ||
    explicitEnemySupport === "roaming_mid"
  ) {
    tags.add("ENEMY_SUPPORT_ROAM_WINDOW");
  }

  if (
    explicitAllySupport === "locked_bot" ||
    explicitAllySupport === "dead_or_recalled"
  ) {
    tags.add("ALLY_SUPPORT_CANNOT_MOVE");
  }

  if (foughtTowardEnemyCover && foughtWithoutAllyCover) {
    tags.add("FIGHT_DIRECTION_MISMATCH");
  }

  const coreCoverRiskCount = [
    "FOUGHT_TOWARD_ENEMY_COVER",
    "FOUGHT_WITHOUT_ALLY_COVER",
    "IGNORED_KNOWN_ENEMY_JUNGLE",
    "FIGHT_DIRECTION_MISMATCH",
  ].filter((tag) => tags.has(tag as RiskTag)).length;

  if (coreCoverRiskCount >= 2) {
    tags.add("MID_JUNGLE_COVER_MISREAD");
  }

  if (input.laneState === "enemy_tower_side") {
    tags.add("BAD_WAVE_POSITION");
  }

  if (input.laneState === "big_wave_crash") {
    tags.add("GREEDY_CRASH_ATTEMPT");
  }

  if (input.beforeDeathAction === "cs_greed") {
    tags.add("CS_GREED");
  }

  if (input.beforeDeathAction === "kill_angle") {
    tags.add("KILL_ANGLE_TUNNEL");
  }

  if (input.beforeDeathAction === "delayed_recall") {
    tags.add("RECALL_GREED");
  }

  if (
    !isSoloKillContext &&
    (
      input.beforeDeathAction === "early_jungle_tracking_ward" ||
      input.beforeDeathAction === "deep_warding"
    )
) {
  tags.add("UNSAFE_WARDING");
}

  if (input.beforeDeathAction === "chasing") {
    tags.add("CHASE_TUNNEL");
  }

  if (input.beforeDeathAction === "cooldown_down_forward") {
    tags.add("COOLDOWN_DISRESPECT");
  }

  if (input.visionState === "no_river_vision" && !knownEnemyJungleBeforeFight) {
    tags.add("NO_RIVER_VISION");
  }

  if (input.visionState === "one_side_vision") {
    tags.add("ONE_SIDE_VISION_ONLY");
  }

  if (
    input.enemyJungleLocation === "unknown" &&
    !hasExplicitEnemyJungleBeforeFightInfo &&
    (enemyJungleInfoState === "unknown" || enemyJungleInfoState === "not_sure")
  ) {
    tags.add("ENEMY_JUNGLER_UNKNOWN");
  }

  if (input.enemyJungleLocation === "outdated") {
    tags.add("OUTDATED_JUNGLE_INFO");
  }

  if (input.enemyJungleLocation === "did_not_think") {
    tags.add("UNTRACKED_PUSH");
  }

  if (input.survivalResources.includes("no_flash")) {
    tags.add("NO_FLASH_WINDOW");
  }

  if (input.survivalResources.includes("no_escape")) {
    tags.add("NO_ESCAPE_TOOL");
  }

  if (input.survivalResources.includes("low_hp")) {
    tags.add("LOW_HP_STAY");
  }

  if (input.survivalResources.includes("low_resource")) {
    tags.add("LOW_RESOURCE_STAY");
  }

  if (input.survivalResources.includes("key_cooldown_down")) {
    tags.add("COOLDOWN_DISRESPECT");
  }

  if (input.deathCause === "jungle_gank") {
    tags.add("POSSIBLE_GANK_SETUP");
  }

  if (input.deathCause === "mid_jungle") {
    tags.add("MID_JUNGLE_COLLAPSE");
  }

  if (input.deathCause === "support_roam") {
    tags.add("SIDE_PRESSURE_UNTRACKED");
  }

  if (input.deathCause === "chasing_death") {
    tags.add("CHASE_TUNNEL");
  }

  if (input.deathCause === "warding_death") {
    tags.add("UNSAFE_WARDING");
  }

  if (input.deathCause === "recall_greed") {
    tags.add("RECALL_GREED");
  }

  if (input.deathCause === "joined_jungle_fight") {
    tags.add("SIDE_PRESSURE_UNTRACKED");
  }

  if (input.deathCause === "unknown") {
    tags.add("UNCLEAR_DEATH_CAUSE");
  }

  // Level 3-C: detailed lane state / jungle cover / intent logic

  if (
    input.laneStateDetail === "crashed_into_enemy_tower" &&
    input.postPushIntent === "take_plate" &&
    (input.allyJunglePosition === "opposite_side" ||
      input.allyJunglePosition === "dead_or_resetting" ||
      input.allyJunglePosition === "unknown")) {
    tags.add("PLATE_GREED_WITHOUT_JUNGLE_COVER");
  }

  if (
    (input.visionPurpose === "deep_ward" ||
      input.wardLocationDetail === "enemy_deep_raptor" ||
      input.wardLocationDetail === "enemy_deep_blue") &&
    input.allyJunglePosition !== "same_side" &&
    input.allyJunglePosition !== "near_mid" &&
    input.allyJungleSideDetail !== "near_mid_top_side" &&
    input.allyJungleSideDetail !== "near_mid_bot_side"
  ) {
    tags.add("DEEP_VISION_WITHOUT_COVER");
  }

  if (
    input.laneStateDetail === "enemy_freezing" &&
    input.postPushIntent === "stay_for_cs"
  ) {
    tags.add("FREEZE_CS_PRESSURE");
  }

  if (
    input.laneStateDetail === "crashed_into_enemy_tower" &&
    input.postPushIntent === "roam" &&
  (
    input.allyJunglePosition === "same_side" ||
    input.allyJunglePosition === "near_mid" ||
    input.allyJungleSideDetail === "near_mid_top_side" ||
    input.allyJungleSideDetail === "near_mid_bot_side"
  ) &&
    input.enemyMidState !== "following_me"
  ) {
    tags.add("POSSIBLE_GOOD_ROAM_TIMER");
  }

  if (
  input.laneStateDetail === "crashed_into_enemy_tower" &&
  input.postPushIntent === "ward" &&
  (
    input.visionPurpose === "river_control" ||
    input.wardLocationDetail === "own_side_river_bush" ||
    input.wardLocationDetail === "pixel_bush" ||
    input.wardLocationDetail === "objective_river"
  )
) {
  tags.add("STANDARD_POST_PUSH_VISION");
}

  if (
  input.allyJunglePosition === "same_side" ||
  input.allyJunglePosition === "near_mid" ||
  input.allyJungleSideDetail === "near_mid_top_side" ||
  input.allyJungleSideDetail === "near_mid_bot_side"
) {
  tags.add("JUNGLE_COVER_AVAILABLE");
}

  if (
    input.laneStateDetail === "crashed_into_enemy_tower" &&
    input.postPushIntent === "recall"
  ) {
    tags.add("SAFE_RESET_WINDOW_POSSIBLE");
  }

  if (
    input.laneStateDetail === "slow_pushing_to_enemy" &&
    (input.postPushIntent === "ward" ||
      input.postPushIntent === "roam" ||
      input.postPushIntent === "take_plate")
  ) {
    tags.add("MOVING_BEFORE_WAVE_CRASH");
  }

  if (
    input.laneStateDetail === "big_wave_bouncing_back" &&
    input.postPushIntent === "stay_for_cs"
  ) {
    tags.add("BOUNCE_BACK_GREED_WINDOW");
  }

  // Level 3-F: objective preparation from the mid-lane turn only.
  const hasObjectiveContext =
    input.deathCause === "objective_prep_turn" ||
    Boolean(
      input.objectiveType &&
      input.objectiveType !== "unknown" &&
      input.objectiveType !== "none"
    );

  if (hasObjectiveContext) {
    const joinedObjective =
      input.objectivePrepAction === "moved_first" ||
      input.objectivePrepAction === "followed_late";
    const allyJungleUnavailable =
      input.allyJungleObjectiveIntent === "not_interested" ||
      input.allyJungleObjectiveIntent === "opposite_side" ||
      input.allyJungleObjectiveIntent === "dead_or_recalled";
    const lowObjectiveResources =
      input.resourceBeforeObjective === "low_hp" ||
      input.resourceBeforeObjective === "low_mana_or_energy" ||
      input.resourceBeforeObjective === "no_flash_or_key_spell" ||
      input.resourceBeforeObjective === "low_resource";
    const hasAlternativeGain =
      input.alternativeGainAvailable !== "unknown" &&
      input.alternativeGainAvailable !== "none";
    const contestWasUnrealistic =
      input.midPriorityBeforeObjective === "no_prio" ||
      allyJungleUnavailable ||
      lowObjectiveResources;

    if (
      input.midPriorityBeforeObjective === "no_prio" &&
      input.objectivePrepAction === "moved_first"
    ) {
      tags.add("OBJECTIVE_FORCED_WITHOUT_MID_PRIO");
    }

    if (
      input.objectivePrepAction === "recalled" &&
      (input.timeToObjective === "under_thirty" ||
        input.timeToObjective === "already_spawned")
    ) {
      tags.add("BAD_RECALL_BEFORE_OBJECTIVE");
    }

    if (
      lowObjectiveResources &&
      input.objectivePrepAction !== "recalled"
    ) {
      tags.add("STAYED_LOW_RESOURCE_BEFORE_OBJECTIVE");
    }

    if (
      input.midPriorityBeforeObjective === "no_prio" &&
      input.objectivePrepAction === "followed_late"
    ) {
      tags.add("JOINED_OBJECTIVE_WITH_BAD_WAVE");
    }

    if (allyJungleUnavailable && joinedObjective) {
      tags.add("IGNORED_ALLY_JUNGLE_INTENT");
    }

    if (contestWasUnrealistic && joinedObjective && hasAlternativeGain) {
      tags.add("OBJECTIVE_TRADEOFF_MISREAD");
    }

    if (
      hasAlternativeGain &&
      (input.objectivePrepAction === "did_not_prepare" ||
        tags.has("OBJECTIVE_TRADEOFF_MISREAD"))
    ) {
      tags.add("MISSED_ALTERNATIVE_GAIN");
    }

    const madeUsefulPrepAction =
      input.objectivePrepAction === "pushed_mid" ||
      input.objectivePrepAction === "moved_first" ||
      input.objectivePrepAction === "placed_vision";

    if (
      input.midPriorityBeforeObjective === "have_prio" &&
      input.allyJungleObjectiveIntent === "wants_objective" &&
      input.resourceBeforeObjective === "healthy" &&
      madeUsefulPrepAction &&
      input.timeToObjective !== "already_spawned" &&
      input.timeToObjective !== "unknown"
    ) {
      tags.add("GOOD_OBJECTIVE_PREP_TURN");
    }
  }

  return Array.from(tags);
}
