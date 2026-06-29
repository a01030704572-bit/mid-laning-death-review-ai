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

export type PlayerTierGroup =
  | "iron_silver"
  | "gold_platinum"
  | "emerald_diamond"
  | "master_plus";

export type TierNextGameGoalStyle =
  | "basic_survival"
  | "conditional_decision"
  | "tempo_and_cover"
  | "optimization";

export type TierEvidenceRequirement =
  | "riot_only_ok"
  | "video_recommended"
  | "video_required"
  | "user_confirmation_required";

export type AutoScenePosition = {
  x: number;
  y: number;
};

export type RiotTeamId = 100 | 200;

export type ParticipantSide = "ally" | "enemy" | "unknown";

export type ParticipantRole =
  | "TOP"
  | "JUNGLE"
  | "MIDDLE"
  | "BOTTOM"
  | "UTILITY"
  | "UNKNOWN";

export type ObjectiveIdentityType =
  | "dragon"
  | "elder_dragon"
  | "void_grub"
  | "rift_herald"
  | "baron"
  | "unknown";

export type RiotParticipantIdentity = {
  participantId: number;
  teamId?: number;
  side: ParticipantSide;
  championName?: string;
  puuid?: string;
  role: ParticipantRole;
  teamPosition?: string;
  individualPosition?: string;
  lane?: string;
  rawRole?: string;
  summonerName?: string;
  riotIdGameName?: string;
  riotIdTagline?: string;
  isTarget: boolean;
};

export type RiotObjectiveIdentity = {
  objectiveType: ObjectiveIdentityType;
  eventTimeSec: number;
  killerId?: number;
  killerTeamId?: number;
  monsterType?: string;
  monsterSubType?: string;
  position?: AutoScenePosition;
  source: "riot_timeline";
  certainty: "confirmed_by_riot" | "inferred_from_timeline";
  summaryKo: string;
};

export type RiotIdentityContext = {
  matchId: string;
  targetParticipantId: number;
  targetTeamId?: number;
  target?: RiotParticipantIdentity;
  participants: RiotParticipantIdentity[];
  allies: RiotParticipantIdentity[];
  enemies: RiotParticipantIdentity[];
  participantsById: Record<number, RiotParticipantIdentity>;
  allyMid?: RiotParticipantIdentity;
  enemyMid?: RiotParticipantIdentity;
  allyJungler?: RiotParticipantIdentity;
  enemyJungler?: RiotParticipantIdentity;
  allySupport?: RiotParticipantIdentity;
  enemySupport?: RiotParticipantIdentity;
  objectives: RiotObjectiveIdentity[];
  missingInfo: string[];
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

export type TierAwarePatternCriteria = {
  tierGroup: PlayerTierGroup;
  groupType: AutoSceneGroupType;
  priorityFactors: string[];
  avoidOverCoaching: string[];
  nextGameGoalStyle: TierNextGameGoalStyle;
  riotOnlySignals: string[];
  videoRequiredSignals: string[];
  userConfirmationQuestions: string[];
  evidenceRequirement: TierEvidenceRequirement;
  cautionKo: string;
};

export type TierConfidenceRule = {
  tierGroup: PlayerTierGroup;
  strongThreshold: number;
  mediumThreshold: number;
  weakThresholdMax: number;
  highConfidenceRequires: string[];
  mediumConfidenceAllows: string[];
  cautionKo: string;
};

export type TierNextGameGoalTemplate = {
  tierGroup: PlayerTierGroup;
  groupType: AutoSceneGroupType;
  style: TierNextGameGoalStyle;
  templateKo: string;
};

export type TierAdjustedPatternSignal = {
  factorLabelKo: string;
  tierPriority: number;
  adjustedConfidence: AutoSceneConfidence;
  evidenceRequirement: TierEvidenceRequirement;
  reasonKo: string;
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
