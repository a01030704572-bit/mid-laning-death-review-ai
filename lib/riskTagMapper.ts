import { DeathReviewInput, RiskTag } from "@/types/review";

export function generateRiskTags(input: DeathReviewInput): RiskTag[] {
  const tags = new Set<RiskTag>();

  // Pre-lane / level 1 vision or invade risk
  if (
    input.gameTime === "pre_lane" ||
    input.laneState === "pre_lane" ||
    input.beforeDeathAction === "early_jungle_tracking_ward" ||
    input.beforeDeathAction === "deep_warding" ||
    input.deathCause === "pre_lane_vision_invade" ||
    input.deathCause === "early_collapse"
  ) {
    tags.add("PRE_LANE_VISION_RISK");
  }

  if (input.laneState === "pushing") {
    tags.add("UNTRACKED_PUSH");
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
    input.beforeDeathAction === "warding" ||
    input.beforeDeathAction === "early_jungle_tracking_ward" ||
    input.beforeDeathAction === "deep_warding"
  ) {
    tags.add("UNSAFE_WARDING");
  }

  if (input.beforeDeathAction === "chasing") {
    tags.add("CHASE_TUNNEL");
  }

  if (input.beforeDeathAction === "cooldown_down_forward") {
    tags.add("COOLDOWN_DISRESPECT");
  }

  if (input.visionState === "no_river_vision") {
    tags.add("NO_RIVER_VISION");
  }

  if (input.visionState === "one_side_vision") {
    tags.add("ONE_SIDE_VISION_ONLY");
  }

  if (input.enemyJungleLocation === "unknown") {
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

  return Array.from(tags);
}