export type RiotRecentMatchCandidate = {
  matchId: string;
  puuid?: string;
  gameStartTimestampMs?: number;
  gameEndTimestampMs?: number;
  gameDurationSec?: number;
  championName?: string;
  queueId?: number;
};

export type OverwolfMatchInferenceResult = {
  status: "confirmed" | "likely" | "unknown";
  matchId?: string;
  confidenceScore: number;
  reasonsKo: string[];
  warningsKo: string[];
  candidateCount: number;
};
