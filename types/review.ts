export type DeathReviewInput = {
  playerTier: string;
  currentOutcome: string;
  myChampion: string;
  enemyChampion: string;
  gameTime: string;
  laneState: string;
  beforeDeathAction: string;
  visionState: string;
  enemyJungleLocation: string;
  survivalResources: string[];
  deathCause: string;
  freeDescription: string;
};

export type RiskTag =
  | "PRE_LANE_VISION_RISK"
  | "UNTRACKED_PUSH"
  | "NO_RIVER_VISION"
  | "ONE_SIDE_VISION_ONLY"
  | "ENEMY_JUNGLER_UNKNOWN"
  | "OUTDATED_JUNGLE_INFO"
  | "NO_FLASH_WINDOW"
  | "NO_ESCAPE_TOOL"
  | "LOW_HP_STAY"
  | "LOW_RESOURCE_STAY"
  | "RECALL_GREED"
  | "KILL_ANGLE_TUNNEL"
  | "CHASE_TUNNEL"
  | "CS_GREED"
  | "UNSAFE_WARDING"
  | "POSSIBLE_GANK_SETUP"
  | "BAD_WAVE_POSITION"
  | "GREEDY_CRASH_ATTEMPT"
  | "COOLDOWN_DISRESPECT"
  | "MID_JUNGLE_COLLAPSE"
  | "SIDE_PRESSURE_UNTRACKED"
  | "UNCLEAR_DEATH_CAUSE";

export type ReviewResult = {
  possible_risk_factors: {
    tag: string;
    explanation: string;
  }[];
  review_questions: string[];
  next_laning_goal: string;
  risk_checklist: string[];
  confidence_note: string;
};