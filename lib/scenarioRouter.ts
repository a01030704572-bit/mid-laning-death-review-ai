import { DeathReviewInput, RiskTag, ScenarioType } from "@/types/review";

const ADVANTAGE_OUTCOMES = new Set([
  "forced_enemy_recall",
  "solo_kill",
  "gained_lane_priority",
  "plate_or_cs_gain",
]);

const PRE_LANE_DEATH_CAUSES = new Set([
  "pre_lane_vision_invade",
  "early_collapse",
]);

const WARDING_ACTIONS = new Set([
  "warding",
  "deep_warding",
  "early_jungle_tracking_ward",
]);

const TRADE_ACTIONS = new Set(["trade", "kill_angle"]);

const GANK_RISK_TAGS = new Set<RiskTag>([
  "ENEMY_JUNGLER_UNKNOWN",
  "ENEMY_JUNGLER_NEARBY",
  "KNOWN_JUNGLE_THREAT_IGNORED",
  "NO_RIVER_VISION",
  "POSSIBLE_GANK_SETUP",
]);

export function determineScenarioType(
  input: DeathReviewInput,
  riskTags: RiskTag[]
): ScenarioType {
  const tagSet = new Set<RiskTag>(riskTags);
  
// 1. Strong solo-kill signal should override stale pre-lane defaults.
  if (
  input.deathCause === "solo_kill" ||
  input.currentOutcome === "solo_kill"
) {
  return "SOLO_KILL_TRADE";
}

  if (input.deathCause === "mid_roam_fight_join") {
    return "MID_ROAM_FIGHT_JOIN";
  }

  if (
    input.deathCause === "objective_prep_turn" ||
    (input.objectiveType &&
      input.objectiveType !== "unknown" &&
      input.objectiveType !== "none")
  ) {
    return "OBJECTIVE_PREP_TURN";
  }

  // 1. PRE_LANE_VISION — 가장 먼저 체크 (UNSAFE_WARDING보다 우선)
  if (
    input.gameTime === "pre_lane" ||
    input.laneState === "pre_lane" ||
    tagSet.has("PRE_LANE_VISION_RISK") ||
    PRE_LANE_DEATH_CAUSES.has(input.deathCause)
  ) {
    return "PRE_LANE_VISION";
  }

  // 2. ADVANTAGE_CONVERSION — 이득 상황은 일반 사망 로직보다 먼저
  if (ADVANTAGE_OUTCOMES.has(input.currentOutcome)) {
    return "ADVANTAGE_CONVERSION";
  }

  // 3. GANKED_WHILE_PUSHING
  if (
    input.laneState === "pushing" &&
    riskTags.some((tag) => GANK_RISK_TAGS.has(tag))
  ) {
    return "GANKED_WHILE_PUSHING";
  }

  // 4. SOLO_KILL_TRADE
  if (
    input.deathCause === "solo_kill" ||
    TRADE_ACTIONS.has(input.beforeDeathAction)
  ) {
    return "SOLO_KILL_TRADE";
  }

  // 5. RECALL_GREED
  if (
    input.beforeDeathAction === "delayed_recall" ||
    input.deathCause === "recall_greed" ||
    tagSet.has("RECALL_GREED")
  ) {
    return "RECALL_GREED";
  }

  // 6. UNSAFE_WARDING
  if (
    WARDING_ACTIONS.has(input.beforeDeathAction) ||
    input.deathCause === "warding_death" ||
    tagSet.has("UNSAFE_WARDING")
  ) {
    return "UNSAFE_WARDING";
  }

  // 7. 기본값
  return "GENERAL_LANING_DEATH";
}
