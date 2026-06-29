import type {
  AutoSceneCandidate,
  AutoSceneConfidence,
  AutoSceneEvidence,
  AutoScenePosition,
  AutoSceneTimeWindow,
  AutoSceneType,
} from "@/types/autoScene";

type RiotLikeParticipant = {
  participantId: number;
  teamId?: number;
  individualPosition?: string;
  teamPosition?: string;
  championName?: string;
  puuid?: string;
};

type RiotLikeParticipantFrame = {
  participantId?: number;
  currentGold?: number;
  totalGold?: number;
  minionsKilled?: number;
  jungleMinionsKilled?: number;
  level?: number;
  position?: AutoScenePosition;
};

type RiotLikeTimelineEvent = {
  type?: string;
  timestamp?: number;
  participantId?: number;
  killerId?: number;
  victimId?: number;
  assistingParticipantIds?: number[];
  creatorId?: number;
  wardType?: string;
  position?: AutoScenePosition;
  monsterType?: string;
  buildingType?: string;
  teamId?: number;
  itemId?: number;
  skillSlot?: number;
  levelUpType?: string;
};

type RiotLikeTimelineFrame = {
  timestamp?: number;
  participantFrames?: Record<string, RiotLikeParticipantFrame>;
  events?: RiotLikeTimelineEvent[];
};

export type ExtractAutoSceneCandidatesInput = {
  matchId: string;
  participantId: number;
  championName?: string;
  opponentChampionName?: string;
  matchDetail: {
    info?: {
      gameDuration?: number;
      participants?: RiotLikeParticipant[];
    };
  };
  timeline: {
    info?: {
      frames?: RiotLikeTimelineFrame[];
    };
  };
};

type IndexedEvent = {
  event: RiotLikeTimelineEvent;
  frameTimestampMs: number;
  globalIndex: number;
};

const OBJECTIVE_MONSTER_TYPES = new Set([
  "DRAGON",
  "RIFTHERALD",
  "HORDE",
  "BARON_NASHOR",
  "BARON",
]);

function timestampSec(timestampMs: number | undefined) {
  return Math.max(0, Math.round((timestampMs ?? 0) / 1000));
}

function makeTimeWindow(centerSec: number, beforeSec = 30, afterSec = 30): AutoSceneTimeWindow {
  return {
    startSec: Math.max(0, centerSec - beforeSec),
    endSec: Math.max(0, centerSec + afterSec),
  };
}

function eventParticipantIds(event: RiotLikeTimelineEvent) {
  return Array.from(
    new Set(
      [
        event.victimId,
        event.killerId,
        ...(event.assistingParticipantIds ?? []),
      ].filter((value): value is number => typeof value === "number")
    )
  );
}

function makeRawEventId(event: RiotLikeTimelineEvent, index: number) {
  return `${event.type ?? "UNKNOWN"}:${timestampSec(event.timestamp)}:${index}`;
}

function collectEvents(frames: RiotLikeTimelineFrame[]) {
  const events: IndexedEvent[] = [];
  let globalIndex = 0;

  for (const frame of frames) {
    for (const event of frame.events ?? []) {
      if (typeof event.timestamp !== "number") continue;
      events.push({
        event,
        frameTimestampMs: frame.timestamp ?? event.timestamp,
        globalIndex,
      });
      globalIndex += 1;
    }
  }

  return events.sort(
    (left, right) =>
      (left.event.timestamp ?? left.frameTimestampMs) -
        (right.event.timestamp ?? right.frameTimestampMs) ||
      left.globalIndex - right.globalIndex
  );
}

function findParticipant(
  participants: RiotLikeParticipant[],
  participantId: number
) {
  return (
    participants.find((participant) => participant.participantId === participantId) ??
    null
  );
}

function findEnemyJunglerIds(
  participants: RiotLikeParticipant[],
  targetParticipantId: number
) {
  const target = findParticipant(participants, targetParticipantId);
  if (!target || typeof target.teamId !== "number") return new Set<number>();

  return new Set(
    participants
      .filter((participant) => {
        if (participant.teamId === target.teamId) return false;
        return (
          participant.individualPosition === "JUNGLE" ||
          participant.teamPosition === "JUNGLE"
        );
      })
      .map((participant) => participant.participantId)
  );
}

function isEnemyJunglerInvolved(
  event: RiotLikeTimelineEvent,
  enemyJunglerIds: Set<number>
) {
  return (
    (typeof event.killerId === "number" && enemyJunglerIds.has(event.killerId)) ||
    event.assistingParticipantIds?.some((id) => enemyJunglerIds.has(id)) === true
  );
}

function getParticipantFrame(
  frame: RiotLikeTimelineFrame | null,
  participantId: number
) {
  return frame?.participantFrames?.[String(participantId)] ?? null;
}

function findFrameAtOrBefore(
  frames: RiotLikeTimelineFrame[],
  timestampMs: number
) {
  let selectedFrame: RiotLikeTimelineFrame | null = null;
  for (const frame of frames) {
    if (typeof frame.timestamp !== "number") continue;
    if (frame.timestamp <= timestampMs) selectedFrame = frame;
    else break;
  }
  return selectedFrame;
}

function getCs(frame: RiotLikeParticipantFrame | null) {
  if (!frame) return 0;
  return (frame.minionsKilled ?? 0) + (frame.jungleMinionsKilled ?? 0);
}

function hasLowPostKillGain({
  frames,
  participantId,
  eventTimeMs,
}: {
  frames: RiotLikeTimelineFrame[];
  participantId: number;
  eventTimeMs: number;
}) {
  const before = getParticipantFrame(
    findFrameAtOrBefore(frames, eventTimeMs),
    participantId
  );
  const after = getParticipantFrame(
    findFrameAtOrBefore(frames, eventTimeMs + 90_000),
    participantId
  );

  if (!before || !after) return false;

  // Initial conservative thresholds: less than 300 total gold and less than
  // three CS over 90 seconds after a solo-kill candidate suggests weak timeline
  // conversion, but still needs video/user confirmation for the actual cause.
  const goldGained = (after.totalGold ?? 0) - (before.totalGold ?? 0);
  const csGained = getCs(after) - getCs(before);
  return goldGained < 300 && csGained < 3;
}

function hasTargetDeathWithinWindow({
  events,
  participantId,
  startMs,
  endMs,
}: {
  events: IndexedEvent[];
  participantId: number;
  startMs: number;
  endMs: number;
}) {
  return events.some(({ event }) => {
    const eventTime = event.timestamp ?? 0;
    return (
      event.type === "CHAMPION_KILL" &&
      event.victimId === participantId &&
      eventTime > startMs &&
      eventTime <= endMs
    );
  });
}

function isObjectiveKill(event: RiotLikeTimelineEvent) {
  if (event.type !== "ELITE_MONSTER_KILL") return false;
  if (!event.monsterType) return true;
  return OBJECTIVE_MONSTER_TYPES.has(event.monsterType);
}

function makeCandidate({
  matchId,
  eventTimeSec,
  eventIndex,
  type,
  titleKo,
  confidence,
  reasonKo,
  evidence,
  riskTagSeeds = [],
  sceneCandidateSeeds = [],
  missingInfo,
  currentOutcome,
  primaryCause = "unknown",
  scenarioType,
  noteKo,
  championName,
  opponentChampionName,
  timeWindowSec = makeTimeWindow(eventTimeSec),
}: {
  matchId: string;
  eventTimeSec: number;
  eventIndex: number;
  type: AutoSceneType;
  titleKo: string;
  confidence: AutoSceneConfidence;
  reasonKo: string;
  evidence: AutoSceneEvidence[];
  riskTagSeeds?: string[];
  sceneCandidateSeeds?: string[];
  missingInfo: string[];
  currentOutcome?: string;
  primaryCause?: string;
  scenarioType?: string;
  noteKo: string;
  championName?: string;
  opponentChampionName?: string;
  timeWindowSec?: AutoSceneTimeWindow;
}): AutoSceneCandidate {
  return {
    id: `${matchId}:${type}:${eventTimeSec}:${eventIndex}`,
    matchId,
    gameTimeSec: eventTimeSec,
    type,
    titleKo,
    confidence,
    reasonKo,
    evidence,
    riskTagSeeds,
    sceneCandidateSeeds,
    missingInfo,
    reviewSeed: {
      source: "riot_auto_scene",
      currentOutcome,
      primaryCause,
      scenarioType,
      noteKo,
      championName,
      opponentChampionName,
      timeWindowSec,
    },
  };
}

function makeKillEvidence({
  event,
  eventIndex,
  summaryKo,
  certainty = "confirmed_by_riot",
}: {
  event: RiotLikeTimelineEvent;
  eventIndex: number;
  summaryKo: string;
  certainty?: AutoSceneEvidence["certainty"];
}): AutoSceneEvidence {
  const eventTimeSec = timestampSec(event.timestamp);
  return {
    source: "riot_timeline",
    certainty,
    eventTimeSec,
    timeWindowSec: makeTimeWindow(eventTimeSec),
    eventTypes: [event.type ?? "CHAMPION_KILL"],
    participantIds: eventParticipantIds(event),
    position: event.position,
    summaryKo,
    rawEventIds: [makeRawEventId(event, eventIndex)],
  };
}

function pushUniqueCandidate(
  candidates: AutoSceneCandidate[],
  seenKeys: Set<string>,
  candidate: AutoSceneCandidate
) {
  const key = `${candidate.type}:${candidate.gameTimeSec}:${candidate.id}`;
  if (seenKeys.has(key)) return;
  seenKeys.add(key);
  candidates.push(candidate);
}

export function extractAutoSceneCandidates(
  input: ExtractAutoSceneCandidatesInput
): AutoSceneCandidate[] {
  const frames = [...(input.timeline.info?.frames ?? [])].sort(
    (left, right) => (left.timestamp ?? 0) - (right.timestamp ?? 0)
  );
  if (frames.length === 0) return [];

  const events = collectEvents(frames);
  if (events.length === 0) return [];

  const participants = input.matchDetail.info?.participants ?? [];
  const enemyJunglerIds = findEnemyJunglerIds(participants, input.participantId);
  const candidates: AutoSceneCandidate[] = [];
  const seenKeys = new Set<string>();

  for (const indexedEvent of events) {
    const { event, globalIndex } = indexedEvent;
    if (event.type !== "CHAMPION_KILL") continue;

    const eventTimeSec = timestampSec(event.timestamp);

    if (event.victimId === input.participantId) {
      const deathEvidence = makeKillEvidence({
        event,
        eventIndex: globalIndex,
        summaryKo: `${eventTimeSec}초에 Riot timeline 기준 플레이어 사망 이벤트가 확인되었습니다.`,
      });

      pushUniqueCandidate(
        candidates,
        seenKeys,
        makeCandidate({
          matchId: input.matchId,
          eventTimeSec,
          eventIndex: globalIndex,
          type: "death_review_candidate",
          titleKo: "사망 복기 후보",
          confidence: "high",
          reasonKo:
            "Riot timeline에서 플레이어 사망 이벤트가 확인되어 복기 후보로 생성했습니다.",
          evidence: [deathEvidence],
          missingInfo: [
            "사망 직전 라인 상태",
            "시야 상태",
            "교전 방향",
            "플레이어가 상대 위치를 알고 있었는지",
          ],
          currentOutcome: "death",
          scenarioType: "death_review",
          noteKo:
            "Riot timeline 기반 사망 복기 후보입니다. 실제 판단 이유와 시야 상태는 영상이나 사용자 확인이 필요합니다.",
          championName: input.championName,
          opponentChampionName: input.opponentChampionName,
        })
      );

      if (isEnemyJunglerInvolved(event, enemyJunglerIds)) {
        pushUniqueCandidate(
          candidates,
          seenKeys,
          makeCandidate({
            matchId: input.matchId,
            eventTimeSec,
            eventIndex: globalIndex,
            type: "jungle_gank_death_candidate",
            titleKo: "정글 개입 사망 후보",
            confidence: "high",
            reasonKo:
              "사망 이벤트의 킬 또는 어시스트에 상대 정글러가 포함되어 정글 개입 사망 후보로 생성했습니다.",
            evidence: [
              {
                ...deathEvidence,
                summaryKo: `${eventTimeSec}초 사망 이벤트에 상대 정글러의 킬/어시스트 관여가 확인되었습니다.`,
              },
            ],
            riskTagSeeds: ["ENEMY_JUNGLER_UNKNOWN", "NO_RIVER_VISION"],
            sceneCandidateSeeds: ["fight_with_unknown_enemy_jungler"],
            missingInfo: [
              "실제 라인 푸시 상태",
              "시야 상태",
              "교전 방향",
              "플레이어가 상대 정글 위치를 알고 있었는지",
            ],
            currentOutcome: "death",
            primaryCause: "enemy_jungle_involved",
            scenarioType: "jungle_gank_death_review",
            noteKo:
              "Riot timeline에서 상대 정글러의 사망 관여가 확인된 복기 후보입니다. 시야 미확인이나 정글 추적 실패는 아직 가설입니다.",
            championName: input.championName,
            opponentChampionName: input.opponentChampionName,
          })
        );
      }
    }

    const assists = event.assistingParticipantIds ?? [];
    if (event.killerId === input.participantId && assists.length === 0) {
      const soloKillEvidence = makeKillEvidence({
        event,
        eventIndex: globalIndex,
        summaryKo: `${eventTimeSec}초에 Riot timeline 기준 아군 어시스트 없는 킬이 확인되었습니다.`,
      });

      pushUniqueCandidate(
        candidates,
        seenKeys,
        makeCandidate({
          matchId: input.matchId,
          eventTimeSec,
          eventIndex: globalIndex,
          type: "solo_kill_candidate",
          titleKo: "솔로킬 복기 후보",
          confidence: "high",
          reasonKo:
            "Riot timeline에서 아군 어시스트 없는 킬이 확인되어 솔로킬 후보로 생성했습니다.",
          evidence: [soloKillEvidence],
          missingInfo: [
            "킬 이후 웨이브 상태",
            "귀환 타이밍",
            "플레이트 또는 CS 전환",
            "정글 커버와 탈출 경로",
          ],
          currentOutcome: "solo_kill",
          scenarioType: "solo_kill_review",
          noteKo:
            "Riot timeline 기준 솔로킬 후보입니다. 후속 복기에서는 웨이브, 리콜, 플레이트, 정글 커버, 이득 전환을 확인해야 합니다.",
          championName: input.championName,
          opponentChampionName: input.opponentChampionName,
        })
      );

      const eventTimeMs = event.timestamp ?? 0;
      const diedAfterKill = hasTargetDeathWithinWindow({
        events,
        participantId: input.participantId,
        startMs: eventTimeMs,
        endMs: eventTimeMs + 90_000,
      });
      const lowGainAfterKill = hasLowPostKillGain({
        frames,
        participantId: input.participantId,
        eventTimeMs,
      });

      if (diedAfterKill || lowGainAfterKill) {
        pushUniqueCandidate(
          candidates,
          seenKeys,
          makeCandidate({
            matchId: input.matchId,
            eventTimeSec,
            eventIndex: globalIndex,
            type: "post_kill_conversion_candidate",
            titleKo: "킬 이후 이득 전환 후보",
            confidence: "medium",
            reasonKo:
              "솔로킬 이후 90초 안의 사망 또는 낮은 골드/CS 증가가 보여 이득 전환 점검 후보로 생성했습니다.",
            evidence: [
              soloKillEvidence,
              {
                source: "riot_timeline",
                certainty: "inferred_from_timeline",
                eventTimeSec,
                timeWindowSec: {
                  startSec: eventTimeSec,
                  endSec: eventTimeSec + 90,
                },
                eventTypes: ["CHAMPION_KILL", "TIMELINE_FRAME_DELTA"],
                participantIds: [input.participantId],
                summaryKo:
                  "솔로킬 이후 timeline 변화에서 약한 이득 전환 가능성이 추론되었습니다.",
              },
            ],
            riskTagSeeds: ["POST_KILL_ESCAPE_RISK", "NO_ESCAPE_PLAN"],
            sceneCandidateSeeds: ["successful_solo_kill_poor_conversion"],
            missingInfo: [
              "실제 웨이브 크래시 상태",
              "귀환 타이밍 의도",
              "상대 정글 압박",
              "플레이트 기회",
              "라인에 남은 선택이 의도였는지",
            ],
            currentOutcome: "solo_kill",
            primaryCause: "post_kill_conversion_uncertain",
            scenarioType: "post_kill_conversion_review",
            noteKo:
              "Riot timeline에서 추론한 킬 이후 이득 전환 후보입니다. 웨이브가 박혔는지와 귀환 의도는 영상 또는 사용자 확인이 필요합니다.",
            championName: input.championName,
            opponentChampionName: input.opponentChampionName,
            timeWindowSec: {
              startSec: eventTimeSec,
              endSec: eventTimeSec + 90,
            },
          })
        );
      }
    }
  }

  const targetDeathEvents = events.filter(
    ({ event }) =>
      event.type === "CHAMPION_KILL" && event.victimId === input.participantId
  );

  for (const objectiveEvent of events.filter(({ event }) => isObjectiveKill(event))) {
    const objectiveTimeMs = objectiveEvent.event.timestamp ?? 0;
    const matchingDeaths = targetDeathEvents.filter(({ event }) => {
      const deathTimeMs = event.timestamp ?? 0;
      return (
        deathTimeMs >= objectiveTimeMs - 90_000 &&
        deathTimeMs <= objectiveTimeMs
      );
    });

    for (const deathEvent of matchingDeaths) {
      const deathTimeSec = timestampSec(deathEvent.event.timestamp);
      const objectiveTimeSec = timestampSec(objectiveEvent.event.timestamp);
      pushUniqueCandidate(
        candidates,
        seenKeys,
        makeCandidate({
          matchId: input.matchId,
          eventTimeSec: deathTimeSec,
          eventIndex: objectiveEvent.globalIndex,
          type: "objective_setup_failure_candidate",
          titleKo: "오브젝트 준비 턴 사망 후보",
          confidence: "medium",
          reasonKo:
            "플레이어가 오브젝트 처치 90초 이내에 사망해 오브젝트 준비 턴에 영향을 줬을 가능성이 있습니다.",
          evidence: [
            makeKillEvidence({
              event: deathEvent.event,
              eventIndex: deathEvent.globalIndex,
              summaryKo: `${deathTimeSec}초에 오브젝트 전 사망 이벤트가 확인되었습니다.`,
            }),
            {
              source: "riot_timeline",
              certainty: "confirmed_by_riot",
              eventTimeSec: objectiveTimeSec,
              timeWindowSec: makeTimeWindow(objectiveTimeSec),
              eventTypes: [objectiveEvent.event.type ?? "ELITE_MONSTER_KILL"],
              participantIds: eventParticipantIds(objectiveEvent.event),
              position: objectiveEvent.event.position,
              summaryKo: `${objectiveTimeSec}초에 오브젝트 처치 이벤트가 확인되었습니다.`,
              rawEventIds: [
                makeRawEventId(objectiveEvent.event, objectiveEvent.globalIndex),
              ],
            },
          ],
          riskTagSeeds: ["OBJECTIVE_TRADEOFF_MISREAD"],
          sceneCandidateSeeds: ["death_before_objective"],
          missingInfo: [
            "사망 직전 웨이브 상태",
            "팀의 오브젝트 의도",
            "정글/서포터 준비 상태",
            "시야 상태",
            "실제로 contest 계획이 있었는지",
          ],
          currentOutcome: "death",
          primaryCause: "objective_setup_uncertain",
          scenarioType: "objective_setup_failure_review",
          noteKo:
            "Riot timeline 기준 오브젝트 전 사망 복기 후보입니다. 이 사망이 오브젝트 손실의 원인인지는 추가 확인이 필요합니다.",
          championName: input.championName,
          opponentChampionName: input.opponentChampionName,
          timeWindowSec: {
            startSec: Math.max(0, deathTimeSec - 30),
            endSec: objectiveTimeSec,
          },
        })
      );
    }
  }

  return candidates.sort(
    (left, right) =>
      left.gameTimeSec - right.gameTimeSec || left.id.localeCompare(right.id)
  );
}
