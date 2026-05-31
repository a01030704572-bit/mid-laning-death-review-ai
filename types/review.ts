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

export type RiskFactor = {
  tag: string;
  explanation: string;
};

export type CoachFeedback = {
  coreFeedback: string;
  whatWentWell: string;
  whatToImprove: string;
  oneActionForNextGame: string;
};

export type ReviewResult = {
  coachFeedback: CoachFeedback;
  situationUnderstanding: string;
  decisionFlowAnalysis: string;
  possibleRiskFactors: RiskFactor[];
  uncertainInfo: string[];
  sceneCheckpoints: string[];
  nextGameGoals: string[];
  tierAdvice: string;
  longTermPatternTags: string[];
  confidenceNote: string;
};