import type {
  EnemyMidDelta,
  GainLossDraft,
  PlayerDelta,
  RiotEvidenceRequest,
  RiotMatchDetail,
  RiotMatchTimeline,
  RiotTimelineEvidence,
} from "@/types/riot";
import {
  buildEnemyMidDelta,
  buildObjectiveContext,
  buildPlayerDelta,
  findEnemyMidParticipant,
  findParticipantByPuuid,
  normalizeTimelineEvents,
} from "@/lib/riot/timelineParser";

export class RiotEvidenceValidationError extends Error {
  status = 400;
}

export function normalizeEvidenceRequest(
  input: Partial<RiotEvidenceRequest>
): RiotEvidenceRequest & { windowSec: number } {
  const matchId = typeof input.matchId === "string" ? input.matchId.trim() : "";
  const puuid = typeof input.puuid === "string" ? input.puuid.trim() : "";
  const gameTimeSec = Number(input.gameTimeSec);
  const windowSec = input.windowSec === undefined ? 60 : Number(input.windowSec);

  if (!matchId) throw new RiotEvidenceValidationError("matchId가 필요합니다.");
  if (!puuid) throw new RiotEvidenceValidationError("puuid가 필요합니다.");
  if (!Number.isFinite(gameTimeSec) || gameTimeSec < 0) {
    throw new RiotEvidenceValidationError("gameTimeSec는 0 이상이어야 합니다.");
  }
  if (!Number.isFinite(windowSec) || windowSec <= 0) {
    throw new RiotEvidenceValidationError("windowSec는 0보다 커야 합니다.");
  }
  if (windowSec > 300) {
    throw new RiotEvidenceValidationError("windowSec는 최대 300초까지 가능합니다.");
  }

  return {
    matchId,
    puuid,
    gameTimeSec,
    windowSec,
    championName:
      typeof input.championName === "string" ? input.championName.trim() : undefined,
  };
}

function hasEvent(events: RiotTimelineEvidence["events"], kind: string) {
  return events.some((event) => event.kind === kind);
}

function buildPlayerLosses(playerDelta: PlayerDelta, hasDeath: boolean) {
  const losses: string[] = [];
  if (hasDeath) {
    losses.push("사망으로 인한 복귀 템포 손실");
    if (playerDelta.csDelta <= 2) {
      losses.push("CS 손실 가능성 (Riot timeline 기준 추정)");
    }
    if (playerDelta.xpDelta <= 120) {
      losses.push("경험치 손실 가능성 (Riot timeline 기준 추정)");
    }
  } else {
    if (playerDelta.csDelta <= 2) {
      losses.push("CS 전환이 크지 않았을 가능성 (Riot timeline 기준 추정)");
    }
    if (playerDelta.xpDelta <= 120) {
      losses.push("경험치 전환이 크지 않았을 가능성 (Riot timeline 기준 추정)");
    }
  }
  if (losses.length === 0) {
    losses.push("Riot timeline 기준 직접 손실은 제한적이며 후속 전환 확인 필요");
  }
  return losses;
}

function buildEnemyGains(
  enemyMidDelta: EnemyMidDelta,
  hasDeath: boolean,
  hasPlate: boolean
) {
  const gains: string[] = [];
  if (hasDeath) gains.push("상대 킬 골드 획득");
  if (hasPlate) {
    gains.push("포탑 플레이트 파괴 이벤트 발생");
    gains.push("어느 팀의 이득인지는 추가 확인 필요");
  }
  if (
    enemyMidDelta.csDelta !== null &&
    enemyMidDelta.xpDelta !== null &&
    (enemyMidDelta.csDelta > 0 || enemyMidDelta.xpDelta > 0)
  ) {
    gains.push("상대 미드 CS/XP 이득 가능성");
  }
  return gains;
}

function buildGainLossDraft({
  playerDelta,
  enemyMidDelta,
  objectiveImpact,
  uncertainInfo,
  hasDeath,
  hasPlate,
}: {
  playerDelta: PlayerDelta;
  enemyMidDelta: EnemyMidDelta;
  objectiveImpact: string;
  uncertainInfo: string[];
  hasDeath: boolean;
  hasPlate: boolean;
}): GainLossDraft {
  const playerLosses = buildPlayerLosses(playerDelta, hasDeath);
  const enemyGains = buildEnemyGains(enemyMidDelta, hasDeath, hasPlate);
  const tempoImpact = hasDeath
    ? "사망으로 인한 복귀 템포 손실"
    : "Riot timeline 기준 후속 tempo 전환은 추가 확인 필요";
  const swingParts = [];
  if (hasDeath) swingParts.push("킬 골드");
  if (
    hasDeath &&
    playerLosses.some((loss) => loss.includes("CS 손실"))
  ) {
    swingParts.push("웨이브 손실");
  }
  if (hasPlate) swingParts.push("플레이트 이벤트");

  return {
    playerLosses,
    enemyGains,
    tempoImpact,
    objectiveImpact,
    swingSummary:
      hasDeath && swingParts.length > 0
        ? `이 장면은 단순 데스가 아니라 ${swingParts.join(" + ")}까지 연결된 손해 장면입니다.`
        : swingParts.length > 0
          ? `Riot timeline에서 ${swingParts.join(" + ")}가 확인됩니다. 이득/손해 귀속은 영상과 수동 입력으로 추가 확인이 필요합니다.`
          : "이 장면의 손익 구조는 Riot timeline 기준 추가 확인이 필요합니다.",
    confidence: uncertainInfo.length >= 2 ? "low" : "medium",
  };
}

export function buildRiotTimelineEvidence({
  match,
  timeline,
  request,
}: {
  match: RiotMatchDetail;
  timeline: RiotMatchTimeline;
  request: RiotEvidenceRequest & { windowSec: number };
}): RiotTimelineEvidence {
  const uncertainInfo: string[] = [];
  const player = findParticipantByPuuid(match, request.puuid);
  if (!player) {
    throw new RiotEvidenceValidationError("match에서 puuid 참가자를 찾지 못했습니다.");
  }

  const enemyMid = findEnemyMidParticipant(match, player);
  if (!enemyMid) {
    uncertainInfo.push("상대 미드 participantId를 특정하지 못했습니다.");
  }

  const events = normalizeTimelineEvents(
    timeline,
    player.participantId,
    request.gameTimeSec,
    request.windowSec,
    enemyMid?.participantId ?? null
  );
  const playerDelta = buildPlayerDelta(
    timeline,
    player.participantId,
    request.gameTimeSec,
    request.windowSec
  );
  const enemyMidDelta = buildEnemyMidDelta(
    timeline,
    enemyMid,
    request.gameTimeSec,
    request.windowSec
  );
  const objectiveContext = buildObjectiveContext(
    timeline,
    request.gameTimeSec,
    request.windowSec
  );
  const objectiveImpact =
    objectiveContext.impactsDeath || objectiveContext.objectiveKilledInWindow
      ? "오브젝트 준비 턴 영향 가능성"
      : "직접 오브젝트 영향은 낮거나 추가 확인 필요";

  if (objectiveContext.nearestObjective === "none") {
    uncertainInfo.push("가장 가까운 오브젝트 스폰 타이밍을 추정하지 못했습니다.");
  }

  return {
    events,
    playerDelta,
    enemyMidDelta,
    objectiveContext,
    gainLossDraft: buildGainLossDraft({
      playerDelta,
      enemyMidDelta,
      objectiveImpact,
      uncertainInfo,
      hasDeath: hasEvent(events, "death"),
      hasPlate: hasEvent(events, "turret_plate"),
    }),
    uncertainInfo,
  };
}
