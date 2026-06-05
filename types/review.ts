export type LaneStateDetail =
  | "crashed_into_enemy_tower"
  | "slow_pushing_to_enemy"
  | "enemy_freezing"
  | "neutral_middle"
  | "being_pushed_in"
  | "big_wave_bouncing_back"
  | "unknown";

export type AllyJunglePosition =
  | "same_side"
  | "opposite_side"
  | "near_mid"
  | "dead_or_resetting"
  | "unknown";

export type VisionPurpose =
  | "river_control"
  | "enemy_jungle_entrance"
  | "deep_ward"
  | "objective_setup"
  | "protect_roam"
  | "unknown";

export type PostPushIntent =
  | "take_plate"
  | "roam"
  | "recall"
  | "ward"
  | "invade_with_jungle"
  | "hover_side_lane"
  | "stay_for_cs"
  | "unknown";

export type TeamSide =
  | "blue_team"
  | "red_team"
  | "unknown";

export type MapSide =
  | "top_side"
  | "bot_side"
  | "unknown";

export type WardLocationDetail =
  | "own_side_river_bush"
  | "pixel_bush"
  | "enemy_raptor_entrance"
  | "enemy_blue_entrance"
  | "enemy_red_entrance"
  | "enemy_deep_raptor"
  | "enemy_deep_blue"
  | "objective_river"
  | "unknown";

export type EnemyMidState =
  | "visible_under_tower"
  | "visible_in_lane"
  | "missing"
  | "following_me"
  | "resetting_or_dead"
  | "unknown";

export type AllyJungleSideDetail =
  | "top_side_jungle"
  | "bot_side_jungle"
  | "near_mid_top_side"
  | "near_mid_bot_side"
  | "base_or_dead"
  | "unknown";

export type DeathReviewInput = {
  playerTier: string;
  currentOutcome: string;
  myChampion: string;
  enemyChampion: string;
  gameTime: string;

  // 기존 큰 분류
  laneState: string;
  beforeDeathAction: string;
  visionState: string;
  enemyJungleLocation: string;
  survivalResources: string[];
  deathCause: string;
  freeDescription: string;

  // Level 3-C 추가 입력값
  laneStateDetail: LaneStateDetail;
  allyJunglePosition: AllyJunglePosition;
  visionPurpose: VisionPurpose;
  postPushIntent: PostPushIntent;

  // Level 3-C Advanced Context
  teamSide: TeamSide;
  movementSide: MapSide;
  wardLocationDetail: WardLocationDetail;
  enemyMidState: EnemyMidState;
  allyJungleSideDetail: AllyJungleSideDetail;

  enemyKeyCooldownsKnown: string;
  myKeyCooldownsKnown: string;
  matchupNote: string;
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
  | "UNCLEAR_DEATH_CAUSE"
  | "PLATE_GREED_WITHOUT_JUNGLE_COVER"
  | "DEEP_VISION_WITHOUT_COVER"
  | "FREEZE_CS_PRESSURE"
  | "POSSIBLE_GOOD_ROAM_TIMER"
  | "STANDARD_POST_PUSH_VISION"
  | "JUNGLE_COVER_AVAILABLE"
  | "SAFE_RESET_WINDOW_POSSIBLE"
  | "MOVING_BEFORE_WAVE_CRASH"
  | "BOUNCE_BACK_GREED_WINDOW";

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

