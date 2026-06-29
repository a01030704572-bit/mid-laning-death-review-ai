import type {
  AutoScenePosition,
  ObjectiveIdentityType,
  ParticipantRole,
  ParticipantSide,
  RiotIdentityContext,
  RiotObjectiveIdentity,
  RiotParticipantIdentity,
} from "@/types/autoScene";

type RiotLikeParticipant = {
  participantId: number;
  teamId?: number;
  championName?: string;
  puuid?: string;
  individualPosition?: string;
  teamPosition?: string;
  lane?: string;
  role?: string;
  summonerName?: string;
  riotIdGameName?: string;
  riotIdTagline?: string;
};

type RiotLikeObjectiveEvent = {
  type?: string;
  timestamp?: number;
  killerId?: number;
  teamId?: number;
  monsterType?: string;
  monsterSubType?: string;
  position?: AutoScenePosition;
};

type RiotLikeTimelineFrame = {
  timestamp?: number;
  events?: RiotLikeObjectiveEvent[];
};

export type BuildRiotIdentityContextInput = {
  matchId: string;
  participantId: number;
  matchDetail: {
    info?: {
      participants?: RiotLikeParticipant[];
    };
  };
  timeline?: {
    info?: {
      frames?: RiotLikeTimelineFrame[];
    };
  };
};

function normalizeRoleValue(value: string | undefined): ParticipantRole {
  const normalized = value?.trim().toUpperCase();
  switch (normalized) {
    case "TOP":
      return "TOP";
    case "JUNGLE":
      return "JUNGLE";
    case "MIDDLE":
    case "MID":
      return "MIDDLE";
    case "BOTTOM":
    case "BOT":
    case "ADC":
    case "CARRY":
      return "BOTTOM";
    case "UTILITY":
    case "SUPPORT":
    case "SUP":
      return "UTILITY";
    default:
      return "UNKNOWN";
  }
}

export function normalizeParticipantRole(
  participant: Pick<
    RiotLikeParticipant,
    "teamPosition" | "individualPosition" | "lane" | "role"
  >
): ParticipantRole {
  for (const value of [
    participant.teamPosition,
    participant.individualPosition,
    participant.lane,
    participant.role,
  ]) {
    const normalized = normalizeRoleValue(value);
    if (normalized !== "UNKNOWN") return normalized;
  }
  return "UNKNOWN";
}

function getSide({
  participantTeamId,
  targetTeamId,
}: {
  participantTeamId?: number;
  targetTeamId?: number;
}): ParticipantSide {
  if (participantTeamId === undefined || targetTeamId === undefined) {
    return "unknown";
  }
  return participantTeamId === targetTeamId ? "ally" : "enemy";
}

function buildParticipantIdentity({
  participant,
  targetParticipantId,
  targetTeamId,
}: {
  participant: RiotLikeParticipant;
  targetParticipantId: number;
  targetTeamId?: number;
}): RiotParticipantIdentity {
  return {
    participantId: participant.participantId,
    teamId: participant.teamId,
    side: getSide({
      participantTeamId: participant.teamId,
      targetTeamId,
    }),
    championName: participant.championName,
    puuid: participant.puuid,
    role: normalizeParticipantRole(participant),
    teamPosition: participant.teamPosition,
    individualPosition: participant.individualPosition,
    lane: participant.lane,
    rawRole: participant.role,
    summonerName: participant.summonerName,
    riotIdGameName: participant.riotIdGameName,
    riotIdTagline: participant.riotIdTagline,
    isTarget: participant.participantId === targetParticipantId,
  };
}

function seconds(timestampMs: number | undefined) {
  return Math.max(0, Math.round((timestampMs ?? 0) / 1000));
}

function formatTimeKo(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const secondsPart = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${secondsPart}`;
}

function normalizeObjectiveType(
  event: RiotLikeObjectiveEvent
): ObjectiveIdentityType {
  switch (event.monsterType) {
    case "DRAGON":
      return event.monsterSubType === "ELDER_DRAGON" ? "elder_dragon" : "dragon";
    case "HORDE":
      return "void_grub";
    case "RIFTHERALD":
      return "rift_herald";
    case "BARON_NASHOR":
    case "BARON":
      return "baron";
    default:
      return "unknown";
  }
}

function objectiveLabelKo(objectiveType: ObjectiveIdentityType) {
  switch (objectiveType) {
    case "dragon":
      return "드래곤";
    case "elder_dragon":
      return "장로 드래곤";
    case "void_grub":
      return "공허 유충";
    case "rift_herald":
      return "협곡의 전령";
    case "baron":
      return "바론";
    default:
      return "오브젝트";
  }
}

function buildObjectiveSummaryKo(objective: RiotObjectiveIdentity) {
  const timeLabel = formatTimeKo(objective.eventTimeSec);
  if (objective.objectiveType === "unknown") {
    return `Riot timeline 기준 ${timeLabel}에 오브젝트 처치 이벤트가 확인되었지만 종류 확인이 필요합니다.`;
  }
  return `Riot timeline 기준 ${timeLabel}에 ${objectiveLabelKo(
    objective.objectiveType
  )} 처치 이벤트가 확인되었습니다.`;
}

function collectObjectives(
  frames: RiotLikeTimelineFrame[],
  missingInfo: string[]
): RiotObjectiveIdentity[] {
  const objectives: RiotObjectiveIdentity[] = [];

  for (const frame of frames) {
    for (const event of frame.events ?? []) {
      if (event.type !== "ELITE_MONSTER_KILL") continue;

      const objectiveType = normalizeObjectiveType(event);
      const objective: RiotObjectiveIdentity = {
        objectiveType,
        eventTimeSec: seconds(event.timestamp ?? frame.timestamp),
        killerId: event.killerId,
        killerTeamId: event.teamId,
        monsterType: event.monsterType,
        monsterSubType: event.monsterSubType,
        position: event.position,
        source: "riot_timeline",
        certainty:
          objectiveType === "unknown"
            ? "inferred_from_timeline"
            : "confirmed_by_riot",
        summaryKo: "",
      };
      objective.summaryKo = buildObjectiveSummaryKo(objective);
      objectives.push(objective);

      if (objectiveType === "unknown") {
        missingInfo.push(
          `${objective.eventTimeSec}초 오브젝트 처치 이벤트의 monsterType 확인이 필요합니다.`
        );
      }
    }
  }

  return objectives.sort(
    (left, right) => left.eventTimeSec - right.eventTimeSec
  );
}

function findBySideAndRole(
  participants: RiotParticipantIdentity[],
  side: ParticipantSide,
  role: ParticipantRole
) {
  return participants.find(
    (participant) => participant.side === side && participant.role === role
  );
}

export function buildRiotIdentityContext(
  input: BuildRiotIdentityContextInput
): RiotIdentityContext {
  const missingInfo: string[] = [];
  const rawParticipants = input.matchDetail.info?.participants ?? [];
  const targetRaw = rawParticipants.find(
    (participant) => participant.participantId === input.participantId
  );

  if (!targetRaw) {
    missingInfo.push("target participant를 matchDetail에서 찾지 못했습니다.");
  }
  if (targetRaw && targetRaw.teamId === undefined) {
    missingInfo.push("target participant의 teamId가 없어 ally/enemy 구분이 제한됩니다.");
  }

  const targetTeamId = targetRaw?.teamId;
  const participants = rawParticipants.map((participant) =>
    buildParticipantIdentity({
      participant,
      targetParticipantId: input.participantId,
      targetTeamId,
    })
  );

  for (const participant of participants) {
    if (participant.role === "UNKNOWN") {
      missingInfo.push(
        `participant ${participant.participantId}의 포지션/역할 확인이 필요합니다.`
      );
    }
    if (participant.teamId === undefined) {
      missingInfo.push(
        `participant ${participant.participantId}의 teamId 확인이 필요합니다.`
      );
    }
  }

  const frames = input.timeline?.info?.frames ?? [];
  if (frames.length === 0) {
    missingInfo.push("timeline frames가 없어 오브젝트 이벤트를 확인하지 못했습니다.");
  }

  const participantsById: Record<number, RiotParticipantIdentity> = {};
  for (const participant of participants) {
    participantsById[participant.participantId] = participant;
  }

  return {
    matchId: input.matchId,
    targetParticipantId: input.participantId,
    targetTeamId,
    target: participants.find((participant) => participant.isTarget),
    participants,
    allies: participants.filter((participant) => participant.side === "ally"),
    enemies: participants.filter((participant) => participant.side === "enemy"),
    participantsById,
    allyMid: findBySideAndRole(participants, "ally", "MIDDLE"),
    enemyMid: findBySideAndRole(participants, "enemy", "MIDDLE"),
    allyJungler: findBySideAndRole(participants, "ally", "JUNGLE"),
    enemyJungler: findBySideAndRole(participants, "enemy", "JUNGLE"),
    allySupport: findBySideAndRole(participants, "ally", "UTILITY"),
    enemySupport: findBySideAndRole(participants, "enemy", "UTILITY"),
    objectives: collectObjectives(frames, missingInfo),
    missingInfo,
  };
}
