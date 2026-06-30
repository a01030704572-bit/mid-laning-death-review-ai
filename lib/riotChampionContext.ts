import { normalizeChampionName } from "@/lib/championNameNormalizer";

export type RiotChampionParticipantLike = {
  puuid?: unknown;
  teamId?: unknown;
  championName?: unknown;
  teamPosition?: unknown;
  individualPosition?: unknown;
};

export type RiotChampionContextStatus =
  | "no_riot_context"
  | "player_found"
  | "player_puuid_not_found"
  | "player_puuid_missing";

export type RiotMidContextStatus =
  | "not_available"
  | "found"
  | "missing"
  | "ambiguous";

export type RiotChampionContext = {
  status: RiotChampionContextStatus;
  playerChampion: string | null;
  playerChampionKey: string | null;
  enemyMidChampion: string | null;
  enemyMidChampionKey: string | null;
  enemyMidStatus: RiotMidContextStatus;
  participantChampionKeys: string[];
};

export function buildRiotChampionContext(input?: {
  participants?: unknown;
  playerPuuid?: unknown;
}): RiotChampionContext {
  const participants = Array.isArray(input?.participants)
    ? input.participants.filter(isParticipantLike)
    : [];
  if (participants.length === 0) return emptyContext("no_riot_context");

  const participantChampionKeys = Array.from(
    new Set(
      participants
        .map((participant) => normalizeChampionName(participant.championName))
        .filter((key): key is string => Boolean(key))
    )
  );

  if (typeof input?.playerPuuid !== "string" || !input.playerPuuid.trim()) {
    return {
      ...emptyContext("player_puuid_missing"),
      participantChampionKeys,
    };
  }

  const playerParticipant = participants.find(
    (participant) => participant.puuid === input.playerPuuid
  );
  if (!playerParticipant) {
    return {
      ...emptyContext("player_puuid_not_found"),
      participantChampionKeys,
    };
  }

  const playerTeamId = normalizeTeamId(playerParticipant.teamId);
  const enemyMiddleParticipants =
    playerTeamId === null
      ? []
      : participants.filter(
          (participant) =>
            normalizeTeamId(participant.teamId) !== null &&
            normalizeTeamId(participant.teamId) !== playerTeamId &&
            isMiddlePosition(participant.teamPosition, participant.individualPosition)
        );
  const enemyMidStatus = getEnemyMidStatus(playerTeamId, enemyMiddleParticipants);
  const enemyMidParticipant =
    enemyMiddleParticipants.length === 1 ? enemyMiddleParticipants[0] : null;

  return {
    status: "player_found",
    playerChampion:
      typeof playerParticipant.championName === "string"
        ? playerParticipant.championName
        : null,
    playerChampionKey: normalizeChampionName(playerParticipant.championName),
    enemyMidChampion:
      typeof enemyMidParticipant?.championName === "string"
        ? enemyMidParticipant.championName
        : null,
    enemyMidChampionKey: normalizeChampionName(enemyMidParticipant?.championName),
    enemyMidStatus,
    participantChampionKeys,
  };
}

function emptyContext(status: RiotChampionContextStatus): RiotChampionContext {
  return {
    status,
    playerChampion: null,
    playerChampionKey: null,
    enemyMidChampion: null,
    enemyMidChampionKey: null,
    enemyMidStatus: "not_available",
    participantChampionKeys: [],
  };
}

function isParticipantLike(value: unknown): value is RiotChampionParticipantLike {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeTeamId(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isMiddlePosition(...values: unknown[]) {
  return values.some(
    (value) => typeof value === "string" && value.toUpperCase() === "MIDDLE"
  );
}

function getEnemyMidStatus(
  playerTeamId: number | null,
  enemyMiddleParticipants: RiotChampionParticipantLike[]
): RiotMidContextStatus {
  if (playerTeamId === null) return "not_available";
  if (enemyMiddleParticipants.length === 0) return "missing";
  if (enemyMiddleParticipants.length > 1) return "ambiguous";
  return "found";
}
