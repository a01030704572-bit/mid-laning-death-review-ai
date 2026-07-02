import type { AutoSceneCandidate } from "@/types/autoScene";
import type { LockedRiotVideoContext } from "@/types/videoDraft";

export type RiotRegionalRoute = "asia" | "americas" | "europe" | "sea";

export type RiotMatchListResponse = {
  matches: RiotMatchListItem[];
};

export type RiotMatchListItem = {
  matchId: string;
  gameCreation: number;
  gameDuration: number;
  championName: string;
  kills: number;
  deaths: number;
  assists: number;
  win: boolean;
  puuid: string;
};

export type RiotEvidenceRequest = {
  matchId: string;
  puuid: string;
  gameTimeSec: number;
  windowSec?: number;
  championName?: string;
};

export type RiotTimelineEvidenceResponse = {
  evidence: RiotTimelineEvidence;
  autoSceneCandidates?: AutoSceneCandidate[];
  videoContextRoster?: LockedRiotVideoContext["roster"];
};

export type RiotTimelineEvidence = {
  events: RiotEvidenceEvent[];
  playerDelta: PlayerDelta;
  enemyMidDelta: EnemyMidDelta;
  objectiveContext: ObjectiveContext;
  gainLossDraft: GainLossDraft;
  uncertainInfo: string[];
};

export type EventKind =
  | "kill"
  | "death"
  | "objective"
  | "building"
  | "turret_plate"
  | "ward"
  | "item"
  | "level";

export type EventImportance = "primary" | "secondary" | "minor";

export type RiotEvidenceEvent = {
  timestampSec: number;
  kind: EventKind;
  importance: EventImportance;
  description: string;
  isPlayerInvolved: boolean;
  uncertainInfo: string[];
};

export type PlayerDelta = {
  csBefore: number;
  csAfter: number;
  csDelta: number;
  totalGoldBefore: number;
  totalGoldAfter: number;
  totalGoldDelta: number;
  currentGoldBefore: number;
  currentGoldAfter: number;
  currentGoldDelta: number;
  xpBefore: number;
  xpAfter: number;
  xpDelta: number;
  levelBefore: number;
  levelAfter: number;
  levelDelta: number;
  isEstimated: boolean;
};

export type EnemyMidDelta = {
  participantId: number | null;
  championName: string | null;
  csBefore: number | null;
  csAfter: number | null;
  csDelta: number | null;
  totalGoldDelta: number | null;
  xpDelta: number | null;
  isEstimated: boolean;
};

export type ObjectiveName = "dragon" | "horde" | "rift_herald" | "baron" | "none";

export type ActualObjectiveKilledInWindow = {
  type: Exclude<ObjectiveName, "none">;
  timestampSec: number;
  killerTeamId?: 100 | 200 | null;
};

export type ObjectiveContext = {
  nearestObjective: ObjectiveName;
  timeToObjectiveSec: number | null;
  objectiveKilledInWindow: boolean;
  actualObjectivesKilledInWindow: ActualObjectiveKilledInWindow[];
  impactsDeath: boolean;
  isEstimated: boolean;
};

export type GainLossDraft = {
  playerLosses: string[];
  enemyGains: string[];
  tempoImpact: string;
  objectiveImpact: string;
  swingSummary: string;
  confidence: "high" | "medium" | "low";
};

export type RiotParticipant = {
  puuid: string;
  participantId: number;
  teamId: number;
  championName: string;
  individualPosition?: string;
  teamPosition?: string;
  kills?: number;
  deaths?: number;
  assists?: number;
  win?: boolean;
};

export type RiotMatchDetail = {
  metadata?: {
    matchId?: string;
    participants?: string[];
  };
  info: {
    gameCreation: number;
    gameDuration: number;
    participants: RiotParticipant[];
  };
};

export type RiotTimelineParticipantFrame = {
  participantId?: number;
  minionsKilled?: number;
  jungleMinionsKilled?: number;
  totalGold?: number;
  currentGold?: number;
  xp?: number;
  level?: number;
};

export type RiotTimelineEvent = {
  timestamp: number;
  type: string;
  participantId?: number;
  creatorId?: number;
  killerId?: number;
  victimId?: number;
  assistingParticipantIds?: number[];
  teamId?: number;
  monsterType?: string;
  buildingType?: string;
  towerType?: string;
  laneType?: string;
  itemId?: number;
  levelUpType?: string;
  wardType?: string;
};

export type RiotTimelineFrame = {
  timestamp: number;
  participantFrames: Record<string, RiotTimelineParticipantFrame>;
  events: RiotTimelineEvent[];
};

export type RiotMatchTimeline = {
  metadata?: {
    matchId?: string;
  };
  info: {
    frames: RiotTimelineFrame[];
  };
};
