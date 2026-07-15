export type EvidenceSource =
  | "riot"
  | "overwolf"
  | "video"
  | "manual"
  | "ai_inference";

export type EvidenceConfidence = "low" | "medium" | "high";

export type CoachingSceneType =
  | "death"
  | "solo_kill"
  | "post_kill_conversion"
  | "objective_setup"
  | "jungle_collapse"
  | "support_roam"
  | "roam_timing"
  | "wave_loss"
  | "recall_timing"
  | "vision_timing"
  | "unknown";

export type CoachingEvidenceItem = {
  source: EvidenceSource;
  confidence: EvidenceConfidence;
  labelKo: string;
  detailKo?: string;
  sceneId?: string;
};

export type SceneCoachingReview = {
  sceneId: string;
  titleKo: string;
  sceneType: CoachingSceneType;
  reviewHypothesisKo: string;
  evidence: CoachingEvidenceItem[];
  confidence: EvidenceConfidence;
  goodDecisionKo?: string;
  missedConditionKo?: string;
  correctionKo: string;
  nextActionKo?: string;
};

export type ImprovementCategory =
  | "post_kill_conversion"
  | "jungle_tracking"
  | "wave_management"
  | "objective_setup"
  | "fight_direction"
  | "recall_timing"
  | "vision_timing"
  | "roam_timing"
  | "death_avoidance"
  | "unknown";

export type ImprovementCandidate = {
  id: string;
  category: ImprovementCategory;
  severity: "low" | "medium" | "high";
  repeatScore: number;
  evidenceSceneIds: string[];
  feedbackKo: string;
};

export type CoachingStrength = {
  id: string;
  category:
    | ImprovementCategory
    | "kill_angle"
    | "lane_priority"
    | "survival"
    | "conversion";
  evidenceSceneIds: string[];
  feedbackKo: string;
};

export type RecurringPatternCandidate = {
  id: string;
  category: ImprovementCategory;
  occurrenceCount: number;
  evidenceSceneIds: string[];
  hypothesisKo: string;
  confidence: EvidenceConfidence;
};

export type NextGameGoal = {
  goalKo: string;
  triggerKo: string;
  successConditionKo: string;
  basedOn: {
    sceneIds: string[];
    recurringPatternId?: string;
    improvementCandidateId?: string;
  };
};

export type MatchCoachingSummary = {
  titleKo: string;
  summaryKo: string;
  overallHypothesisKo: string;
  confidence: EvidenceConfidence;
};

export type CoachingFeedback = {
  matchId?: string;
  puuid?: string;
  generatedAtIsoTimestamp: string;
  matchSummary: MatchCoachingSummary;
  sceneReviews: SceneCoachingReview[];
  strengths: CoachingStrength[];
  improvementCandidates: ImprovementCandidate[];
  recurringPatterns: RecurringPatternCandidate[];
  nextGameGoal: NextGameGoal;
  evidenceConfidence: EvidenceConfidence;
  personalization?: {
    profileApplied: boolean;
    profileConfidence?: "insufficient_data" | "tentative" | "moderate";
    styleLabels?: string[];
  };
};
