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

export type LockedRiotVideoContext = {
  matchId?: string;
  gameTimeSec?: number;
  windowSec?: number;
  playerChampion?: string | null;
  enemyMidChampion?: string | null;
  roster?: Array<{
    championName: string;
    side: "ally" | "enemy";
    role: "top" | "jungle" | "mid" | "bot" | "support" | "unknown";
    isPlayer: boolean;
  }>;
  keyEvents?: Array<{
    type: string;
    gameTimeSec: number;
    descriptionKo?: string;
  }>;
  playerDelta?: {
    cs?: number;
    gold?: number;
    xp?: number;
  };
  enemyMidDelta?: {
    championName?: string | null;
    cs?: number;
    gold?: number;
    xp?: number;
  };
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
