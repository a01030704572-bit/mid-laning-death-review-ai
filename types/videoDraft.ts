import type {
  AllyJungleCoverBeforeFight,
  EnemyJungleInfoBeforeFight,
  EnemyMidState,
  LaneStateDetail,
  MapSide,
  MidPriorityBeforeObjective,
  ObjectivePrepAction,
  ObjectiveType,
  PostPushIntent,
  SceneOutcomeAssessment,
  ScenarioType,
  TimeToObjective,
  CurrentOutcome,
} from "@/types/review";

export type VideoDraftSuggestedFields = {
  currentOutcome?: CurrentOutcome;
  objectiveType?: ObjectiveType;
  lanePriority?: MidPriorityBeforeObjective;
  laneStateDetail?: LaneStateDetail;
  enemyMidState?: EnemyMidState;
  timeToObjective?: TimeToObjective;
  objectivePrepAction?: ObjectivePrepAction;
  movementDirection?: MapSide;
  enemyJungleInfo?: EnemyJungleInfoBeforeFight;
  allyJungleCover?: AllyJungleCoverBeforeFight;
  postPushIntent?: PostPushIntent;
};

export type VideoReviewDraft = {
  suggestedScenarioType: ScenarioType | null;
  suggestedSceneOutcomeAssessment: SceneOutcomeAssessment | null;
  summary: string;
  keyFacts: string[];
  uncertainFacts: string[];
  suggestedFreeDescription: string;
  suggestedFields: VideoDraftSuggestedFields;
  confidenceNote: string;
};
