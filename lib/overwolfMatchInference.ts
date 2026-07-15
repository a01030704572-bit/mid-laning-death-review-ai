import type { RiotRecentMatchCandidate, OverwolfMatchInferenceResult } from "@/types/matchCandidate";
import type { OverwolfCapturePackage } from "@/types/overwolfCapture";

type InferOptions = {
  maxTimeDeltaMs?: number;
  likelyTimeDeltaMs?: number;
};

type ScoredCandidate = {
  candidate: RiotRecentMatchCandidate;
  deltaMs: number;
  score: number;
  puuidMatches: boolean;
  puuidMismatches: boolean;
};

const DEFAULT_CONFIRMED_WINDOW_MS = 10 * 60 * 1000;
const DEFAULT_LIKELY_WINDOW_MS = 30 * 60 * 1000;
const AMBIGUOUS_UNKNOWN_CONFIDENCE_CAP = 0.49;

export function inferRiotMatchFromOverwolfPackage(
  overwolfPackage: OverwolfCapturePackage,
  candidates: RiotRecentMatchCandidate[],
  options: InferOptions = {}
): OverwolfMatchInferenceResult {
  const confirmedWindowMs =
    options.maxTimeDeltaMs ?? DEFAULT_CONFIRMED_WINDOW_MS;
  const likelyWindowMs =
    options.likelyTimeDeltaMs ?? DEFAULT_LIKELY_WINDOW_MS;
  const packageTimeMs = inferPackageReferenceTimeMs(overwolfPackage);

  if (candidates.length === 0) {
    return {
      status: "unknown",
      confidenceScore: 0,
      reasonsKo: [],
      warningsKo: ["비교할 Riot 최근 경기 후보가 없습니다."],
      candidateCount: 0,
    };
  }

  if (packageTimeMs === undefined) {
    return {
      status: "unknown",
      confidenceScore: 0,
      reasonsKo: [],
      warningsKo: ["Overwolf capture package에서 비교할 시간 정보를 찾지 못했습니다."],
      candidateCount: candidates.length,
    };
  }

  const warningsKo: string[] = [];
  const scoredCandidates = candidates
    .map((candidate) => scoreCandidate({
      candidate,
      packageTimeMs,
      packagePuuid: overwolfPackage.puuidGuess,
      confirmedWindowMs,
      likelyWindowMs,
    }))
    .filter((candidate): candidate is ScoredCandidate => Boolean(candidate))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (left.deltaMs !== right.deltaMs) return left.deltaMs - right.deltaMs;
      return left.candidate.matchId.localeCompare(right.candidate.matchId);
    });

  if (scoredCandidates.length === 0) {
    return {
      status: "unknown",
      confidenceScore: 0,
      reasonsKo: [],
      warningsKo: ["시간대가 가까운 Riot 매치 후보를 찾지 못했습니다."],
      candidateCount: candidates.length,
    };
  }

  const closeCandidates = scoredCandidates.filter(
    (candidate) => candidate.deltaMs <= likelyWindowMs
  );
  const strongCandidates = closeCandidates.filter(
    (candidate) =>
      candidate.deltaMs <= confirmedWindowMs &&
      candidate.puuidMatches &&
      !candidate.puuidMismatches
  );
  const best = scoredCandidates[0];

  if (!overwolfPackage.puuidGuess) {
    warningsKo.push("puuid가 없어 시간 기준으로만 추정했습니다.");
  }
  if (best.puuidMismatches) {
    warningsKo.push("가장 가까운 시간대 후보의 puuid가 capture package와 다릅니다.");
  }
  if (closeCandidates.length > 1) {
    warningsKo.push("후보가 여러 개라 확정할 수 없습니다.");
  }

  if (strongCandidates.length === 1 && closeCandidates.length === 1) {
    return {
      status: "confirmed",
      matchId: best.candidate.matchId,
      confidenceScore: roundScore(best.score),
      reasonsKo: [
        "puuid가 일치하고 시간대가 10분 이내로 가까운 매치 후보입니다.",
        `가장 가까운 후보와의 시간 차이는 ${formatMinutes(best.deltaMs)}입니다.`,
      ],
      warningsKo,
      candidateCount: candidates.length,
    };
  }

  if (
    closeCandidates.length === 1 &&
    best.deltaMs <= likelyWindowMs &&
    !best.puuidMismatches
  ) {
    return {
      status: "likely",
      matchId: best.candidate.matchId,
      confidenceScore: roundScore(best.score),
      reasonsKo: [
        "시간대가 가장 가까운 매치 후보입니다.",
        `가장 가까운 후보와의 시간 차이는 ${formatMinutes(best.deltaMs)}입니다.`,
      ],
      warningsKo,
      candidateCount: candidates.length,
    };
  }

  return {
    status: "unknown",
    confidenceScore: roundScore(
      closeCandidates.length > 1
        ? Math.min(best.score, AMBIGUOUS_UNKNOWN_CONFIDENCE_CAP)
        : best.score
    ),
    reasonsKo: [
      "시간대가 가까운 후보는 있지만 단일 매치로 확정하기 어렵습니다.",
    ],
    warningsKo,
    candidateCount: candidates.length,
  };
}

function scoreCandidate({
  candidate,
  packageTimeMs,
  packagePuuid,
  confirmedWindowMs,
  likelyWindowMs,
}: {
  candidate: RiotRecentMatchCandidate;
  packageTimeMs: number;
  packagePuuid?: string;
  confirmedWindowMs: number;
  likelyWindowMs: number;
}): ScoredCandidate | null {
  const candidateEndTimeMs = inferCandidateEndTimeMs(candidate);
  if (candidateEndTimeMs === undefined) return null;

  const deltaMs = Math.abs(packageTimeMs - candidateEndTimeMs);
  if (deltaMs > likelyWindowMs) {
    return {
      candidate,
      deltaMs,
      score: 0,
      puuidMatches: false,
      puuidMismatches: Boolean(packagePuuid && candidate.puuid),
    };
  }

  const puuidMatches = Boolean(
    packagePuuid && candidate.puuid && packagePuuid === candidate.puuid
  );
  const puuidMismatches = Boolean(
    packagePuuid && candidate.puuid && packagePuuid !== candidate.puuid
  );
  const timeScore =
    deltaMs <= confirmedWindowMs
      ? 0.78 + (1 - deltaMs / confirmedWindowMs) * 0.12
      : 0.45 + (1 - (deltaMs - confirmedWindowMs) / (likelyWindowMs - confirmedWindowMs)) * 0.2;
  const puuidScore = puuidMatches ? 0.1 : puuidMismatches ? -0.25 : 0;

  return {
    candidate,
    deltaMs,
    score: clampScore(timeScore + puuidScore),
    puuidMatches,
    puuidMismatches,
  };
}

function inferPackageReferenceTimeMs(
  overwolfPackage: OverwolfCapturePackage
): number | undefined {
  const collectedAt = finiteNumber(overwolfPackage.collectedAtLocalTimestampMs);
  if (collectedAt !== undefined) return collectedAt;

  const eventTimes = (overwolfPackage.events ?? [])
    .map((event) => finiteNumber(event.localTimestampMs))
    .filter((value): value is number => value !== undefined);
  const clipTimes = (overwolfPackage.clips ?? [])
    .map((clip) => finiteNumber(clip.capturedAtLocalTimestampMs))
    .filter((value): value is number => value !== undefined);
  const allTimes = [...eventTimes, ...clipTimes];
  if (allTimes.length === 0) return undefined;
  return Math.max(...allTimes);
}

function inferCandidateEndTimeMs(
  candidate: RiotRecentMatchCandidate
): number | undefined {
  const explicitEnd = finiteNumber(candidate.gameEndTimestampMs);
  if (explicitEnd !== undefined) return explicitEnd;

  const start = finiteNumber(candidate.gameStartTimestampMs);
  const durationSec = finiteNumber(candidate.gameDurationSec);
  if (start === undefined || durationSec === undefined) return undefined;

  return start + durationSec * 1000;
}

function formatMinutes(deltaMs: number) {
  const minutes = Math.round(deltaMs / 60_000);
  if (minutes <= 0) return "1분 미만";
  return `${minutes}분`;
}

function roundScore(score: number) {
  return Math.round(clampScore(score) * 100) / 100;
}

function clampScore(score: number) {
  return Math.min(Math.max(score, 0), 1);
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}
