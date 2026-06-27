export type CoachingTierBand =
  | "iron_silver"
  | "gold_platinum"
  | "emerald_diamond"
  | "master_plus";

export type CoachingConceptId =
  | "wave_management"
  | "jungle_tracking"
  | "support_roam"
  | "recall_timing"
  | "vision"
  | "trading_positioning"
  | "objective_setup"
  | "kill_to_value_conversion";

export type AutomationSource =
  | "riot_api"
  | "video_analysis"
  | "app_history"
  | "user_confirmation"
  | "derived";

export type Reliability = "high" | "medium" | "low";

export type MvpPriority = "high" | "medium" | "low";

export type CoachingMetric = {
  id: string;
  concept: CoachingConceptId;
  displayNameKo: string;
  coachConceptKo: string;
  tierExplanations: Record<CoachingTierBand, string>;
  riotSignals: string[];
  videoSignals: string[];
  appHistorySignals: string[];
  unreliableVideoClaims?: string[];
  reliability: Reliability;
  mvpPriority: MvpPriority;
  userFacingGoalKo: string;
  relatedRiskTags: string[];
  relatedScenarios: string[];
};

export type SceneScenarioId =
  | "ganked_while_pushing"
  | "enemy_support_roam_collapse"
  | "fight_with_unknown_enemy_jungler"
  | "fight_without_flash_or_escape"
  | "unsafe_warding_into_fog"
  | "solo_kill_attempt_failed"
  | "successful_solo_kill_good_conversion"
  | "successful_solo_kill_poor_conversion"
  | "death_before_objective"
  | "bad_recall_before_objective"
  | "late_rotation_to_objective"
  | "side_lane_overextension"
  | "overstay_after_wave_crash"
  | "missed_reset_timing"
  | "poor_wave_state_before_roaming"
  | "objective_trade_decision"
  | "positive_reinforcement_scene";

export type SceneScenario = {
  id: SceneScenarioId;
  displayNameKo: string;
  definitionKo: string;
  riotEvidence: string[];
  videoEvidence: string[];
  uncertaintyCases: string[];
  relatedRiskTags: string[];
  repeatedHabitPatternId?: string;
  tierFeedbackKo: Record<CoachingTierBand, string>;
  nextGameGoalKo: string;
  mvpPriority: MvpPriority;
};

export type HabitPattern = {
  id: string;
  displayNameKo: string;
  definitionKo: string;
  identifyingRiskTags: string[];
  identifyingScenarios: SceneScenarioId[];
  threshold: {
    windowGames: number;
    minOccurrences: number;
  };
  userFacingGoalKo: string;
  mvpPriority: MvpPriority;
};
