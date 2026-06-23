import type { CurrentOutcome, ScenarioType } from "@/types/review";

export type FormScenario = ScenarioType | "NOT_SURE";

const ALL_SCENARIOS: FormScenario[] = [
  "PRE_LANE_VISION",
  "GANKED_WHILE_PUSHING",
  "SOLO_KILL_TRADE",
  "RECALL_GREED",
  "UNSAFE_WARDING",
  "ADVANTAGE_CONVERSION",
  "OBJECTIVE_PREP_TURN",
  "MID_ROAM_FIGHT_JOIN",
  "NOT_SURE",
];

const OBJECTIVE_OUTCOMES = new Set<CurrentOutcome>([
  "objective_fight_loss",
  "secured_objective",
  "objective_trade_gain",
  "missed_objective_and_lane_gain",
  "unclear_objective_join_tradeoff",
]);

const VISION_OUTCOMES = new Set<CurrentOutcome>([
  "died_while_warding",
  "vision_loss",
  "overextended_for_vision",
  "unclear_post_vision_decision",
]);

const JUNGLE_OUTCOMES = new Set<CurrentOutcome>([
  "ganked_and_died",
  "escaped_gank_but_lost",
  "ally_jungle_coordination_mismatch",
  "fought_despite_known_enemy_jungle",
  "cover_misread",
]);

const LANE_OUTCOMES = new Set<CurrentOutcome>([
  "gained_lane_priority",
  "lost_lane_priority",
  "plate_or_cs_gain",
  "plate_or_cs_loss",
  "unclear_recall_timing",
]);

export function getVisibleScenarioValues(
  outcome: CurrentOutcome
): FormScenario[] {
  if (outcome === "unknown") return ALL_SCENARIOS;

  if (OBJECTIVE_OUTCOMES.has(outcome)) {
    return [
      "OBJECTIVE_PREP_TURN",
      "MID_ROAM_FIGHT_JOIN",
      "ADVANTAGE_CONVERSION",
      "RECALL_GREED",
      "NOT_SURE",
    ];
  }

  if (VISION_OUTCOMES.has(outcome)) {
    return [
      "UNSAFE_WARDING",
      "PRE_LANE_VISION",
      "GANKED_WHILE_PUSHING",
      "NOT_SURE",
    ];
  }

  if (JUNGLE_OUTCOMES.has(outcome)) {
    return [
      "GANKED_WHILE_PUSHING",
      "MID_ROAM_FIGHT_JOIN",
      "SOLO_KILL_TRADE",
      "UNSAFE_WARDING",
      "ADVANTAGE_CONVERSION",
      "NOT_SURE",
    ];
  }

  if (LANE_OUTCOMES.has(outcome)) {
    return [
      "ADVANTAGE_CONVERSION",
      "MID_ROAM_FIGHT_JOIN",
      "RECALL_GREED",
      "GANKED_WHILE_PUSHING",
      "SOLO_KILL_TRADE",
      "NOT_SURE",
    ];
  }

  if (outcome === "death") {
    return [
      "SOLO_KILL_TRADE",
      "MID_ROAM_FIGHT_JOIN",
      "GANKED_WHILE_PUSHING",
      "RECALL_GREED",
      "UNSAFE_WARDING",
      "PRE_LANE_VISION",
      "NOT_SURE",
    ];
  }

  if (outcome === "solo_kill" || outcome === "fight_advantage") {
    return [
      "SOLO_KILL_TRADE",
      "ADVANTAGE_CONVERSION",
      "MID_ROAM_FIGHT_JOIN",
      "NOT_SURE",
    ];
  }

  if (outcome === "failed_kill_attempt") {
    return [
      "SOLO_KILL_TRADE",
      "MID_ROAM_FIGHT_JOIN",
      "GANKED_WHILE_PUSHING",
      "NOT_SURE",
    ];
  }

  return [
    "SOLO_KILL_TRADE",
    "GANKED_WHILE_PUSHING",
    "MID_ROAM_FIGHT_JOIN",
    "RECALL_GREED",
    "ADVANTAGE_CONVERSION",
    "NOT_SURE",
  ];
}
