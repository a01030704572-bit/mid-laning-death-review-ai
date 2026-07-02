import type {
  AutoSceneCandidate,
  AutoSceneConfidence,
  AutoSceneType,
  RiotIdentityContext,
} from "@/types/autoScene";
import type { SceneScenarioId } from "@/types/coachingMetrics";

export type SceneValence =
  | "good_decision"
  | "bad_decision"
  | "missed_opportunity"
  | "pattern_flag";

export type HabitSignal = {
  habitType: string;
  labelKo: string;
  confidence: AutoSceneConfidence;
  sourceSceneId?: string;
};

export type StrengthSignal = {
  strengthType: string;
  matchId: string;
  gameTimeSec: number;
  evidenceKo: string;
};

export type ConfirmationQuestion = {
  id: string;
  questionKo: string;
  reasonKo?: string;
};

export type SceneScoreBreakdown = {
  baseScore: number;
  evidenceBoosts: Array<{
    id: string;
    boost: number;
    summaryKo: string;
  }>;
  totalScore: number;
};

export type RankedReviewScene = {
  sceneId: string;
  matchId: string;
  gameTimeSec: number;
  windowSec?: number;
  autoSceneType: AutoSceneType;
  primaryScenarioId?: SceneScenarioId | null;
  sceneValence: SceneValence;
  reviewWorthinessScore: number;
  scoreBreakdown: SceneScoreBreakdown;
  riotEvidenceSummary: string[];
  displayNameKo: string;
  evidenceSummaryKo: string;
  confirmationQuestions: ConfirmationQuestion[];
  habitSignals: HabitSignal[];
};

export type SceneBundle = {
  representative: RankedReviewScene;
  nearby: RankedReviewScene[];
  clusterType: "single" | "same_event_multi_type" | "sequential_events";
  startTimeSec?: number;
  endTimeSec?: number;
};

export type MatchReviewReport = {
  matchId: string;
  puuid: string;
  playerChampion?: string;
  enemyMidChampion?: string;
  gameDurationSec?: number;
  rankedScenes: RankedReviewScene[];
  improvementScenes: RankedReviewScene[];
  strengthScenes: RankedReviewScene[];
  topScenes: RankedReviewScene[];
  sceneBundles?: SceneBundle[];
  habitSignals: HabitSignal[];
  weaknessSignals: HabitSignal[];
  strengthSignals: StrengthSignal[];
  analysisStatus: "complete" | "partial" | "failed";
  analysisVersion: string;
  generatedAt: string;
};

export type RankMatchScenesInput = {
  autoSceneCandidates: AutoSceneCandidate[];
  riotIdentityContext: RiotIdentityContext;
  matchId: string;
  puuid: string;
  gameDurationSec?: number;
  maxTopScenes?: number;
};
