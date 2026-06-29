export type AutoSceneConfidence = "high" | "medium" | "low";

export type AutoSceneType =
  | "death_review_candidate"
  | "jungle_gank_death_candidate"
  | "solo_kill_candidate"
  | "post_kill_conversion_candidate"
  | "objective_setup_failure_candidate"
  | "unsafe_warding_candidate"
  | "no_flash_fight_candidate"
  | "support_roam_collapse_candidate"
  | "tempo_loss_candidate"
  | "wave_management_error_candidate"
  | "blind_roaming_candidate"
  | "poor_resource_management_candidate";

export type AutoSceneGroupType =
  | "push_gank_like"
  | "solo_kill_conversion_like"
  | "objective_setup_like"
  | "no_flash_fight_like"
  | "support_roam_collapse_like"
  | "unsafe_warding_like"
  | "information_gathering_failure_like"
  | "wave_management_error_like"
  | "resource_management_error_like"
  | "tempo_loss_like"
  | "blind_roaming_like";

export type AutoSceneEvidenceSource =
  | "riot_timeline"
  | "riot_match_detail"
  | "video_clip"
  | "user_confirmation";

export type AutoSceneEvidenceCertainty =
  | "confirmed_by_riot"
  | "inferred_from_timeline"
  | "confirmed_by_video"
  | "confirmed_by_user"
  | "needs_video_or_user_confirmation";

export type AutoScenePosition = {
  x: number;
  y: number;
};

export type AutoSceneTimeWindow = {
  startSec: number;
  endSec: number;
};

export type AutoSceneEvidence = {
  source: AutoSceneEvidenceSource;
  certainty: AutoSceneEvidenceCertainty;
  eventTimeSec?: number;
  timeWindowSec?: AutoSceneTimeWindow;
  eventTypes: string[];
  participantIds?: number[];
  position?: AutoScenePosition;
  summaryKo: string;
  rawEventIds?: string[];
};

export type AutoSceneReviewSeed = {
  source: "riot_auto_scene";
  currentOutcome?: string;
  primaryCause?: string;
  scenarioType?: string;
  noteKo: string;
  championName?: string;
  opponentChampionName?: string;
  timeWindowSec: AutoSceneTimeWindow;
};

export type AutoSceneCandidate = {
  id: string;
  matchId: string;
  gameTimeSec: number;
  type: AutoSceneType;
  titleKo: string;
  confidence: AutoSceneConfidence;
  reasonKo: string;
  evidence: AutoSceneEvidence[];
  riskTagSeeds: string[];
  sceneCandidateSeeds: string[];
  missingInfo: string[];
  reviewSeed: AutoSceneReviewSeed;
};

export type SimilarSceneCommonFactor = {
  labelKo: string;
  count: number;
  ratio: number;
  evidenceCertainty: AutoSceneEvidenceCertainty;
  relatedRiskTags?: string[];
};

export type SimilarSceneGroup = {
  id: string;
  groupType: AutoSceneGroupType;
  titleKo: string;
  scenes: AutoSceneCandidate[];
  commonFactors: SimilarSceneCommonFactor[];
  variableFactors: string[];
};

export type EliminatedFactor = {
  labelKo: string;
  reasonKo: string;
  sceneCount: number;
  totalScenes: number;
};

export type EliminationPatternResult = {
  groupId: string;
  primaryPatternKo: string;
  confidence: AutoSceneConfidence;
  commonFactors: Array<{
    labelKo: string;
    sceneCount: number;
    totalScenes: number;
    evidenceCertainty: AutoSceneEvidenceCertainty;
  }>;
  eliminatedFactors: EliminatedFactor[];
  nextGameGoalKo: string;
  reviewNoteKo: string;
  trackingMetricKo?: string;
};

export const AUTO_SCENE_TYPES = [
  "death_review_candidate",
  "jungle_gank_death_candidate",
  "solo_kill_candidate",
  "post_kill_conversion_candidate",
  "objective_setup_failure_candidate",
  "unsafe_warding_candidate",
  "no_flash_fight_candidate",
  "support_roam_collapse_candidate",
  "tempo_loss_candidate",
  "wave_management_error_candidate",
  "blind_roaming_candidate",
  "poor_resource_management_candidate",
] as const satisfies readonly AutoSceneType[];

export const AUTO_SCENE_GROUP_TYPES = [
  "push_gank_like",
  "solo_kill_conversion_like",
  "objective_setup_like",
  "no_flash_fight_like",
  "support_roam_collapse_like",
  "unsafe_warding_like",
  "information_gathering_failure_like",
  "wave_management_error_like",
  "resource_management_error_like",
  "tempo_loss_like",
  "blind_roaming_like",
] as const satisfies readonly AutoSceneGroupType[];

export const AUTO_SCENE_EVIDENCE_SOURCES = [
  "riot_timeline",
  "riot_match_detail",
  "video_clip",
  "user_confirmation",
] as const satisfies readonly AutoSceneEvidenceSource[];

export const AUTO_SCENE_EVIDENCE_CERTAINTIES = [
  "confirmed_by_riot",
  "inferred_from_timeline",
  "confirmed_by_video",
  "confirmed_by_user",
  "needs_video_or_user_confirmation",
] as const satisfies readonly AutoSceneEvidenceCertainty[];
