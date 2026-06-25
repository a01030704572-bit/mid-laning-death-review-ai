import type {
  EnemyMidDelta,
  EventImportance,
  EventKind,
  ObjectiveContext,
  ObjectiveName,
  ActualObjectiveKilledInWindow,
  PlayerDelta,
  RiotEvidenceEvent,
  RiotMatchDetail,
  RiotMatchTimeline,
  RiotParticipant,
  RiotTimelineEvent,
  RiotTimelineFrame,
  RiotTimelineParticipantFrame,
} from "@/types/riot";

const OBJECTIVE_SPAWNS: Array<{ name: ObjectiveName; timestampSec: number }> = [
  { name: "dragon", timestampSec: 300 },
  { name: "horde", timestampSec: 360 },
  { name: "rift_herald", timestampSec: 840 },
  { name: "baron", timestampSec: 1200 },
];

export function findParticipantByPuuid(
  match: RiotMatchDetail,
  puuid: string
) {
  return match.info.participants.find((participant) => participant.puuid === puuid) ?? null;
}

export function findEnemyMidParticipant(
  match: RiotMatchDetail,
  player: RiotParticipant
) {
  return (
    match.info.participants.find((participant) => {
      if (participant.teamId === player.teamId) return false;
      return (
        participant.individualPosition === "MIDDLE" ||
        participant.teamPosition === "MIDDLE"
      );
    }) ?? null
  );
}

function getParticipantFrame(
  frame: RiotTimelineFrame | null,
  participantId: number
) {
  return frame?.participantFrames[String(participantId)] ?? null;
}

export function findFrameAtOrBefore(
  timeline: RiotMatchTimeline,
  timestampMs: number
) {
  let selectedFrame: RiotTimelineFrame | null = null;
  for (const frame of timeline.info.frames) {
    if (frame.timestamp <= timestampMs) selectedFrame = frame;
    else break;
  }
  return selectedFrame;
}

function getCs(frame: RiotTimelineParticipantFrame | null) {
  if (!frame) return 0;
  return (frame.minionsKilled ?? 0) + (frame.jungleMinionsKilled ?? 0);
}

function nonNegativeDelta(after: number, before: number) {
  return Math.max(0, after - before);
}

export function buildPlayerDelta(
  timeline: RiotMatchTimeline,
  participantId: number,
  gameTimeSec: number,
  windowSec: number
): PlayerDelta {
  const before = getParticipantFrame(
    findFrameAtOrBefore(timeline, gameTimeSec * 1000),
    participantId
  );
  const after = getParticipantFrame(
    findFrameAtOrBefore(timeline, (gameTimeSec + windowSec) * 1000),
    participantId
  );
  const csBefore = getCs(before);
  const csAfter = getCs(after);
  const totalGoldBefore = before?.totalGold ?? 0;
  const totalGoldAfter = after?.totalGold ?? totalGoldBefore;
  const currentGoldBefore = before?.currentGold ?? 0;
  const currentGoldAfter = after?.currentGold ?? currentGoldBefore;
  const xpBefore = before?.xp ?? 0;
  const xpAfter = after?.xp ?? xpBefore;
  const levelBefore = before?.level ?? 0;
  const levelAfter = after?.level ?? levelBefore;

  return {
    csBefore,
    csAfter,
    csDelta: nonNegativeDelta(csAfter, csBefore),
    totalGoldBefore,
    totalGoldAfter,
    totalGoldDelta: totalGoldAfter - totalGoldBefore,
    currentGoldBefore,
    currentGoldAfter,
    currentGoldDelta: currentGoldAfter - currentGoldBefore,
    xpBefore,
    xpAfter,
    xpDelta: xpAfter - xpBefore,
    levelBefore,
    levelAfter,
    levelDelta: levelAfter - levelBefore,
    isEstimated: true,
  };
}

export function buildEnemyMidDelta(
  timeline: RiotMatchTimeline,
  enemyMid: RiotParticipant | null,
  gameTimeSec: number,
  windowSec: number
): EnemyMidDelta {
  if (!enemyMid) {
    return {
      participantId: null,
      championName: null,
      csBefore: null,
      csAfter: null,
      csDelta: null,
      totalGoldDelta: null,
      xpDelta: null,
      isEstimated: true,
    };
  }

  const delta = buildPlayerDelta(
    timeline,
    enemyMid.participantId,
    gameTimeSec,
    windowSec
  );

  return {
    participantId: enemyMid.participantId,
    championName: enemyMid.championName,
    csBefore: delta.csBefore,
    csAfter: delta.csAfter,
    csDelta: delta.csDelta,
    totalGoldDelta: delta.totalGoldDelta,
    xpDelta: delta.xpDelta,
    isEstimated: true,
  };
}

function normalizeObjectiveName(monsterType: string | undefined): ObjectiveName {
  switch (monsterType) {
    case "DRAGON":
      return "dragon";
    case "HORDE":
      return "horde";
    case "RIFTHERALD":
      return "rift_herald";
    case "BARON_NASHOR":
      return "baron";
    default:
      return "none";
  }
}

function eventKind(event: RiotTimelineEvent, playerParticipantId: number): EventKind | null {
  switch (event.type) {
    case "CHAMPION_KILL":
      return event.victimId === playerParticipantId ? "death" : "kill";
    case "ELITE_MONSTER_KILL":
      return "objective";
    case "BUILDING_KILL":
      return "building";
    case "TURRET_PLATE_DESTROYED":
      return "turret_plate";
    case "WARD_PLACED":
    case "WARD_KILL":
      return "ward";
    case "ITEM_PURCHASED":
      return "item";
    case "LEVEL_UP":
      return "level";
    default:
      return null;
  }
}

function isPlayerInvolved(event: RiotTimelineEvent, playerParticipantId: number) {
  return (
    event.participantId === playerParticipantId ||
    event.creatorId === playerParticipantId ||
    event.killerId === playerParticipantId ||
    event.victimId === playerParticipantId ||
    event.assistingParticipantIds?.includes(playerParticipantId) === true
  );
}

function isParticipantInvolved(event: RiotTimelineEvent, participantId: number | null) {
  if (!participantId) return false;
  return (
    event.participantId === participantId ||
    event.creatorId === participantId ||
    event.killerId === participantId ||
    event.victimId === participantId ||
    event.assistingParticipantIds?.includes(participantId) === true
  );
}

function getEventImportance({
  event,
  kind,
  playerParticipantId,
  enemyMidParticipantId,
}: {
  event: RiotTimelineEvent;
  kind: EventKind;
  playerParticipantId: number;
  enemyMidParticipantId?: number | null;
}): EventImportance {
  if (
    kind === "death" ||
    (kind === "kill" && isPlayerInvolved(event, playerParticipantId))
  ) {
    return "primary";
  }
  if (
    kind === "objective" ||
    kind === "building" ||
    kind === "turret_plate" ||
    (kind === "kill" && isParticipantInvolved(event, enemyMidParticipantId ?? null))
  ) {
    return "secondary";
  }
  return "minor";
}

function describeEvent(event: RiotTimelineEvent, kind: EventKind) {
  const timestampSec = Math.round(event.timestamp / 1000);
  switch (kind) {
    case "death":
      return `${timestampSec}초: 플레이어 사망`;
    case "kill":
      return `${timestampSec}초: 챔피언 처치 또는 교전 관여`;
    case "objective": {
      const objective = normalizeObjectiveName(event.monsterType);
      const label =
        objective === "dragon"
          ? "드래곤"
          : objective === "horde"
            ? "공허 유충"
            : objective === "rift_herald"
              ? "협곡의 전령"
              : objective === "baron"
                ? "바론"
                : "오브젝트";
      return `${timestampSec}초: ${label} 처치`;
    }
    case "building":
      if (event.buildingType === "TOWER_BUILDING") {
        return `${timestampSec}초: 포탑 파괴 (${event.laneType ?? "lane 확인 필요"})`;
      }
      if (event.buildingType === "INHIBITOR_BUILDING") {
        return `${timestampSec}초: 억제기 파괴`;
      }
      if (event.towerType === "NEXUS_TURRET") {
        return `${timestampSec}초: 넥서스 포탑 파괴`;
      }
      return `${timestampSec}초: 구조물 파괴`;
    case "turret_plate":
      return `${timestampSec}초: 포탑 플레이트 파괴`;
    case "ward":
      return `${timestampSec}초: 시야 이벤트`;
    case "item":
      return `${timestampSec}초: 아이템 구매`;
    case "level":
      return `${timestampSec}초: 레벨 상승`;
  }
}

export function normalizeTimelineEvents(
  timeline: RiotMatchTimeline,
  playerParticipantId: number,
  gameTimeSec: number,
  windowSec: number,
  enemyMidParticipantId?: number | null
): RiotEvidenceEvent[] {
  const startMs = gameTimeSec * 1000;
  const endMs = (gameTimeSec + windowSec) * 1000;
  const events: RiotEvidenceEvent[] = [];

  for (const frame of timeline.info.frames) {
    for (const event of frame.events) {
      if (event.timestamp < startMs || event.timestamp > endMs) continue;
      const kind = eventKind(event, playerParticipantId);
      if (!kind) continue;
      events.push({
        timestampSec: Math.round(event.timestamp / 1000),
        kind,
        importance: getEventImportance({
          event,
          kind,
          playerParticipantId,
          enemyMidParticipantId,
        }),
        description: describeEvent(event, kind),
        isPlayerInvolved: isPlayerInvolved(event, playerParticipantId),
        uncertainInfo: [],
      });
    }
  }

  const importanceOrder: Record<EventImportance, number> = {
    primary: 0,
    secondary: 1,
    minor: 2,
  };

  return events.sort((left, right) => {
    const importanceDiff =
      importanceOrder[left.importance] - importanceOrder[right.importance];
    return importanceDiff || left.timestampSec - right.timestampSec;
  });
}

function collectActualObjectivesKilledInWindow(
  timeline: RiotMatchTimeline,
  startMs: number,
  endMs: number
): ActualObjectiveKilledInWindow[] {
  const actualObjectives: ActualObjectiveKilledInWindow[] = [];

  for (const frame of timeline.info.frames) {
    for (const event of frame.events) {
      if (
        event.type !== "ELITE_MONSTER_KILL" ||
        event.timestamp < startMs ||
        event.timestamp > endMs
      ) {
        continue;
      }

      const objectiveType = normalizeObjectiveName(event.monsterType);
      if (objectiveType === "none") continue;
      actualObjectives.push({
        type: objectiveType,
        timestampSec: Math.round(event.timestamp / 1000),
        killerTeamId:
          event.teamId === 100 || event.teamId === 200 ? event.teamId : null,
      });
    }
  }

  return actualObjectives;
}

export function buildObjectiveContext(
  timeline: RiotMatchTimeline,
  gameTimeSec: number,
  windowSec: number
): ObjectiveContext {
  const upcomingObjective = OBJECTIVE_SPAWNS.find(
    (objective) => objective.timestampSec > gameTimeSec
  );
  const startMs = gameTimeSec * 1000;
  const endMs = (gameTimeSec + windowSec) * 1000;
  const actualObjectivesKilledInWindow = collectActualObjectivesKilledInWindow(
    timeline,
    startMs,
    endMs
  );
  const killedInWindow = actualObjectivesKilledInWindow.length > 0;

  if (!upcomingObjective) {
    return {
      nearestObjective: "none",
      timeToObjectiveSec: null,
      objectiveKilledInWindow: killedInWindow,
      actualObjectivesKilledInWindow,
      impactsDeath: false,
      isEstimated: true,
    };
  }

  const timeToObjectiveSec = upcomingObjective.timestampSec - gameTimeSec;
  return {
    nearestObjective: upcomingObjective.name,
    timeToObjectiveSec,
    objectiveKilledInWindow: killedInWindow,
    actualObjectivesKilledInWindow,
    impactsDeath: timeToObjectiveSec >= 30 && timeToObjectiveSec <= 90,
    isEstimated: true,
  };
}
