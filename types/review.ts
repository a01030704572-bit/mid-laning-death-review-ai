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
  | "trade_setup"
  | "cs_under_pressure"
  | "survive_under_tower"
  | "all_in_or_kill_angle"
  | "escape_or_disengage"
  | "unknown";

export type PostPushIntent =
  | "take_plate"
  | "roam"
  | "recall"
  | "ward"
  | "invade_with_jungle"
  | "hover_side_lane"
  | "stay_for_cs"
  | "short_trade"
  | "all_in"
  | "last_hit_under_pressure"
  | "hold_wave_under_tower"
  | "escape_or_disengage"
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

export type EnemyJungleInfoState =
  | "unknown"
  | "seen_far"
  | "seen_near"
  | "seen_but_ignored"
  | "not_sure";

export type EnemyJungleLastSeenSide =
  | "top_side"
  | "bot_side"
  | "river_top"
  | "river_bot"
  | "mid_near"
  | "unknown";

export type AllyJungleCoverState =
  | "same_side_cover"
  | "opposite_side"
  | "near_mid"
  | "too_far"
  | "unknown";

export type FightDirectionRelativeToCover =
  | "toward_ally_cover"
  | "toward_enemy_jungle"
  | "away_from_enemy_jungle"
  | "center_lane"
  | "unknown";

export type PostKillEscapePlan =
  | "clear_escape_route"
  | "escape_through_ally_side"
  | "escape_through_enemy_side"
  | "no_escape_plan"
  | "unknown";

export type SupportRoamState =
  | "ally_support_can_move"
  | "enemy_support_missing"
  | "enemy_support_can_move_first"
  | "both_supports_unknown"
  | "not_relevant";

export type EnemyJungleInfoBeforeFight =
  | "unknown"
  | "not_seen_recently"
  | "seen_same_side"
  | "seen_opposite_side"
  | "seen_near_mid"
  | "dead_or_recalled";

export type AllyJungleCoverBeforeFight =
  | "unknown"
  | "same_side_near_mid"
  | "same_side_but_far"
  | "opposite_side"
  | "dead_or_recalled"
  | "resetting";

export type FightDirection =
  | "toward_ally_jungle"
  | "toward_enemy_jungle"
  | "toward_top_side"
  | "toward_bot_side"
  | "center_mid"
  | "unknown";

export type EnemySupportStateBeforeFight =
  | "unknown"
  | "seen_bot"
  | "missing"
  | "roaming_mid"
  | "dead_or_recalled";

export type AllySupportStateBeforeFight =
  | "unknown"
  | "can_move_first"
  | "locked_bot"
  | "roaming_mid"
  | "dead_or_recalled";

export type ObjectiveType =
  | "void_grubs"
  | "dragon"
  | "rift_herald"
  | "none"
  | "unknown";

export type TimeToObjective =
  | "ninety_to_sixty"
  | "sixty_to_thirty"
  | "under_thirty"
  | "already_spawned"
  | "unknown";

export type MidPriorityBeforeObjective =
  | "have_prio"
  | "no_prio"
  | "contested"
  | "unknown";

export type ObjectivePrepAction =
  | "pushed_mid"
  | "recalled"
  | "stayed_low_resource"
  | "moved_first"
  | "followed_late"
  | "took_plate_or_cs"
  | "placed_vision"
  | "did_not_prepare"
  | "unknown";

export type AllyJungleObjectiveIntent =
  | "wants_objective"
  | "not_interested"
  | "opposite_side"
  | "dead_or_recalled"
  | "unknown";

export type ResourceBeforeObjective =
  | "healthy"
  | "low_hp"
  | "low_mana_or_energy"
  | "no_flash_or_key_spell"
  | "low_resource"
  | "unknown";

export type AlternativeGainAvailable =
  | "plate"
  | "cs_wave"
  | "opposite_vision"
  | "roam"
  | "reset"
  | "none"
  | "unknown";

export type CurrentOutcome =
  | "death"
  | "solo_kill"
  | "failed_kill_attempt"
  | "survived_but_lost"
  | "fight_advantage"
  | "forced_enemy_recall"
  | "gained_lane_priority"
  | "lost_lane_priority"
  | "plate_or_cs_gain"
  | "plate_or_cs_loss"
  | "unclear_recall_timing"
  | "ganked_and_died"
  | "escaped_gank_but_lost"
  | "ally_jungle_coordination_mismatch"
  | "fought_despite_known_enemy_jungle"
  | "cover_misread"
  | "died_while_warding"
  | "vision_loss"
  | "overextended_for_vision"
  | "unclear_post_vision_decision"
  | "objective_fight_loss"
  | "secured_objective"
  | "objective_trade_gain"
  | "missed_objective_and_lane_gain"
  | "unclear_objective_join_tradeoff"
  | "unknown";

export type SceneOutcomeAssessment =
  | "good_decision"
  | "risky_but_successful"
  | "questionable"
  | "loss"
  | "death"
  | "unclear";

export type DeathReviewInput = {
  playerTier: string;
  currentOutcome: CurrentOutcome;
  sceneOutcomeAssessment?: SceneOutcomeAssessment;
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

  // Level 3-E Jungle / Support Cover & Fight Direction
  enemyJungleInfoState: EnemyJungleInfoState;
  enemyJungleLastSeenSide: EnemyJungleLastSeenSide;
  allyJungleCoverState: AllyJungleCoverState;
  fightDirectionRelativeToCover: FightDirectionRelativeToCover;
  postKillEscapePlan: PostKillEscapePlan;
  supportRoamState: SupportRoamState;

  // Level 3-E explicit before-fight cover context
  enemyJungleInfoBeforeFight?: EnemyJungleInfoBeforeFight;
  allyJungleCoverBeforeFight?: AllyJungleCoverBeforeFight;
  fightDirection?: FightDirection;
  enemySupportStateBeforeFight?: EnemySupportStateBeforeFight;
  allySupportStateBeforeFight?: AllySupportStateBeforeFight;

  // Level 3-F Objective Preparation / Tradeoff Decision
  objectiveType: ObjectiveType;
  timeToObjective: TimeToObjective;
  midPriorityBeforeObjective: MidPriorityBeforeObjective;
  objectivePrepAction: ObjectivePrepAction;
  allyJungleObjectiveIntent: AllyJungleObjectiveIntent;
  resourceBeforeObjective: ResourceBeforeObjective;
  alternativeGainAvailable: AlternativeGainAvailable;

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
  | "BOUNCE_BACK_GREED_WINDOW"
  | "KNOWN_JUNGLE_THREAT_IGNORED"
  | "ENEMY_JUNGLER_NEARBY"
  | "NO_ALLY_COVER"
  | "FIGHT_TOWARD_ENEMY_JUNGLE"
  | "POST_KILL_ESCAPE_RISK"
  | "NO_ESCAPE_PLAN"
  | "ENEMY_SUPPORT_MOVE_FIRST"
  | "ALLY_JUNGLE_COVER_AVAILABLE"
  | "FIGHT_TOWARD_ALLY_COVER"
  | "ESCAPE_ROUTE_TO_ALLY_SIDE"
  | "SUPPORT_ROAM_WINDOW"
  | "REASONABLE_COVERED_KILL_ATTEMPT"
  | "FOUGHT_TOWARD_ENEMY_COVER"
  | "FOUGHT_WITHOUT_ALLY_COVER"
  | "IGNORED_KNOWN_ENEMY_JUNGLE"
  | "ENEMY_SUPPORT_ROAM_WINDOW"
  | "ALLY_SUPPORT_CANNOT_MOVE"
  | "FIGHT_DIRECTION_MISMATCH"
  | "MID_JUNGLE_COVER_MISREAD"
  | "OBJECTIVE_FORCED_WITHOUT_MID_PRIO"
  | "BAD_RECALL_BEFORE_OBJECTIVE"
  | "STAYED_LOW_RESOURCE_BEFORE_OBJECTIVE"
  | "JOINED_OBJECTIVE_WITH_BAD_WAVE"
  | "IGNORED_ALLY_JUNGLE_INTENT"
  | "OBJECTIVE_TRADEOFF_MISREAD"
  | "MISSED_ALTERNATIVE_GAIN"
  | "GOOD_OBJECTIVE_PREP_TURN";

export type ScenarioType =
  | "PRE_LANE_VISION"
  | "GANKED_WHILE_PUSHING"
  | "SOLO_KILL_TRADE"
  | "RECALL_GREED"
  | "UNSAFE_WARDING"
  | "ADVANTAGE_CONVERSION"
  | "OBJECTIVE_PREP_TURN"
  | "MID_ROAM_FIGHT_JOIN"
  | "GENERAL_LANING_DEATH";

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
  scenario_type: ScenarioType;
  main_question: string;
  follow_up_questions: string[];
  possible_risk_factors: RiskFactor[];
  goodDecisionSummary?: string;
  improvementFocus?: string;
  coverAndEscapeAnalysis?: string;
  next_laning_goal: string;
  risk_checklist: string[];
  confidence_note: string;
  keySkillHypotheses?: {
    skill: string;
    source: "known_champion_db" | "model_inferred";
    status: "confirmed_by_evidence" | "hypothesis" | "no_evidence";
    reasonKo?: string;
  }[];
  // 하위 호환 유지용 (기존 UI 필드)
  coachFeedback?: CoachFeedback;
  situationUnderstanding?: string;
  decisionFlowAnalysis?: string;
  possibleRiskFactors?: RiskFactor[];
  uncertainInfo?: string[];
  sceneCheckpoints?: string[];
  nextGameGoals?: string[];
  tierAdvice?: string;
  longTermPatternTags?: string[];
  confidenceNote?: string;
};

