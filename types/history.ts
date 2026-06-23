import type {
  CurrentOutcome,
  DeathReviewInput,
  ReviewResult,
  RiskTag,
  SceneOutcomeAssessment,
  ScenarioType,
} from "@/types/review";

export type ReviewSceneSourceType = "manual" | "video_review";

export type ReviewSceneMetadataInput = {
  sourceType: ReviewSceneSourceType;
  sourceLabel: string;
  sceneTime: string;
  sceneIndex: string;
};

export type ReviewSceneRecord = {
  id: string;
  createdAt: string;
  sourceType: ReviewSceneSourceType;
  sourceId?: string;
  sourceLabel?: string;
  reviewSessionId?: string;
  sceneIndex?: number;
  sceneTime?: string;
  champion: string;
  enemyChampion: string;
  gameTime: string;
  playerTier: string;
  currentOutcome: CurrentOutcome;
  sceneOutcomeAssessment?: SceneOutcomeAssessment;
  routedScenario: ScenarioType;
  riskTags: RiskTag[];
  primaryMistakeSummary?: string;
  nextGameGoal?: string;
  rawInputSnapshot: DeathReviewInput;
};

export type ReviewSceneCompletion = {
  input: DeathReviewInput;
  riskTags: RiskTag[];
  scenarioType: ScenarioType;
  result: ReviewResult;
  sourceMetadata?: ReviewSceneMetadataInput;
};

export type HabitPatternLevel =
  | "possible_one_off"
  | "warning"
  | "repeated"
  | "core";

export type HabitRiskCount = {
  tag: RiskTag;
  count: number;
  ratio: number;
};

export type HabitPattern = HabitRiskCount & {
  label: string;
  level: HabitPatternLevel;
};

export type PrimaryHabitFocus = HabitPattern & {
  message: string;
};

export type HabitPatternAnalysis = {
  recentSceneCount: number;
  topRiskTags: HabitRiskCount[];
  repeatedPatterns: HabitPattern[];
  primaryHabitFocus: PrimaryHabitFocus | null;
  nextReviewGoal: string | null;
  sampleSizeWarning: string | null;
};
