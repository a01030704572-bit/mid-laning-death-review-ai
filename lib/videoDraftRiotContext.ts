import type { RiotTimelineEvidence } from "@/types/riot";
import type { LockedRiotVideoContext } from "@/types/videoDraft";

type RiotRosterParticipantLike = {
  puuid?: unknown;
  teamId?: unknown;
  championName?: unknown;
  teamPosition?: unknown;
  individualPosition?: unknown;
  lane?: unknown;
  role?: unknown;
};

type BuildLockedRiotVideoContextInput = {
  evidence: RiotTimelineEvidence | null;
  matchId?: string;
  gameTimeSec?: number;
  windowSec?: number;
  playerChampion?: string | null;
  roster?: LockedRiotVideoContext["roster"] | null;
};

function finiteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function compactText(value: unknown, maxLength = 180) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength)}...` : trimmed;
}

function compactRole(value: unknown): NonNullable<LockedRiotVideoContext["roster"]>[number]["role"] {
  if (typeof value !== "string") return "unknown";
  switch (value.trim().toUpperCase()) {
    case "TOP":
      return "top";
    case "JUNGLE":
      return "jungle";
    case "MIDDLE":
    case "MID":
      return "mid";
    case "BOTTOM":
    case "BOT":
    case "ADC":
    case "CARRY":
      return "bot";
    case "UTILITY":
    case "SUPPORT":
    case "SUP":
      return "support";
    default:
      return "unknown";
  }
}

function participantRole(participant: RiotRosterParticipantLike) {
  for (const value of [
    participant.teamPosition,
    participant.individualPosition,
    participant.lane,
    participant.role,
  ]) {
    const role = compactRole(value);
    if (role !== "unknown") return role;
  }
  return "unknown";
}

function compactRoster(
  roster: LockedRiotVideoContext["roster"] | null | undefined
): LockedRiotVideoContext["roster"] | undefined {
  if (!Array.isArray(roster)) return undefined;
  const compacted = roster
    .filter(
      (participant) =>
        participant &&
        typeof participant.championName === "string" &&
        participant.championName.trim()
    )
    .slice(0, 10)
    .map((participant) => ({
      championName: compactText(participant.championName, 40) ?? "Unknown",
      side: participant.side === "enemy" ? ("enemy" as const) : ("ally" as const),
      role: compactRole(participant.role),
      isPlayer: participant.isPlayer === true,
    }));

  return compacted.length > 0 ? compacted : undefined;
}

export function buildCompactRiotRoster(input: {
  participants?: unknown;
  playerPuuid?: unknown;
}): LockedRiotVideoContext["roster"] {
  const participants = Array.isArray(input.participants)
    ? input.participants.filter(
        (participant): participant is RiotRosterParticipantLike =>
          Boolean(participant) &&
          typeof participant === "object" &&
          !Array.isArray(participant)
      )
    : [];
  const player =
    typeof input.playerPuuid === "string"
      ? participants.find((participant) => participant.puuid === input.playerPuuid)
      : undefined;
  const playerTeamId =
    typeof player?.teamId === "number" && Number.isFinite(player.teamId)
      ? player.teamId
      : undefined;

  return participants
    .filter(
      (participant) =>
        typeof participant.championName === "string" &&
        participant.championName.trim()
    )
    .slice(0, 10)
    .map((participant) => ({
      championName: compactText(participant.championName, 40) ?? "Unknown",
      side:
        typeof participant.teamId === "number" &&
        playerTeamId !== undefined &&
        participant.teamId !== playerTeamId
          ? ("enemy" as const)
          : ("ally" as const),
      role: participantRole(participant),
      isPlayer:
        typeof input.playerPuuid === "string" &&
        participant.puuid === input.playerPuuid,
    }));
}

export function buildLockedRiotVideoContext({
  evidence,
  matchId,
  gameTimeSec,
  windowSec,
  playerChampion,
  roster,
}: BuildLockedRiotVideoContextInput): LockedRiotVideoContext | null {
  if (!evidence) return null;

  const keyEvents = evidence.events
    .filter((event) => event.importance !== "minor")
    .slice(0, 6)
    .map((event) => ({
      type: event.kind,
      gameTimeSec: event.timestampSec,
      descriptionKo: compactText(event.description),
    }));
  const context: LockedRiotVideoContext = {
    matchId: compactText(matchId, 80),
    gameTimeSec: finiteNumber(gameTimeSec),
    windowSec: finiteNumber(windowSec),
    playerChampion: compactText(playerChampion, 40) ?? null,
    enemyMidChampion: compactText(evidence.enemyMidDelta.championName, 40) ?? null,
    roster: compactRoster(roster),
    keyEvents,
    playerDelta: {
      cs: finiteNumber(evidence.playerDelta.csDelta),
      gold: finiteNumber(evidence.playerDelta.totalGoldDelta),
      xp: finiteNumber(evidence.playerDelta.xpDelta),
    },
    enemyMidDelta: {
      championName: compactText(evidence.enemyMidDelta.championName, 40) ?? null,
      cs: finiteNumber(evidence.enemyMidDelta.csDelta),
      gold: finiteNumber(evidence.enemyMidDelta.totalGoldDelta),
      xp: finiteNumber(evidence.enemyMidDelta.xpDelta),
    },
  };

  if (
    !context.matchId &&
    !context.playerChampion &&
    !context.enemyMidChampion &&
    !context.roster?.length &&
    context.keyEvents?.length === 0
  ) {
    return null;
  }

  return context;
}

export function parseLockedRiotVideoContext(
  value: unknown
): LockedRiotVideoContext | null {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    return normalizeLockedRiotVideoContext(JSON.parse(value));
  } catch {
    return null;
  }
}

export function normalizeLockedRiotVideoContext(
  value: unknown
): LockedRiotVideoContext | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const keyEvents = Array.isArray(source.keyEvents)
    ? source.keyEvents
        .filter((event) => event && typeof event === "object" && !Array.isArray(event))
        .slice(0, 6)
        .map((event) => {
          const record = event as Record<string, unknown>;
          return {
            type: compactText(record.type, 40) ?? "event",
            gameTimeSec: finiteNumber(record.gameTimeSec) ?? 0,
            descriptionKo: compactText(record.descriptionKo),
          };
        })
    : [];
  const roster = compactRoster(source.roster as LockedRiotVideoContext["roster"]);
  const playerDelta =
    source.playerDelta && typeof source.playerDelta === "object"
      ? (source.playerDelta as Record<string, unknown>)
      : {};
  const enemyMidDelta =
    source.enemyMidDelta && typeof source.enemyMidDelta === "object"
      ? (source.enemyMidDelta as Record<string, unknown>)
      : {};
  const context: LockedRiotVideoContext = {
    matchId: compactText(source.matchId, 80),
    gameTimeSec: finiteNumber(source.gameTimeSec),
    windowSec: finiteNumber(source.windowSec),
    playerChampion: compactText(source.playerChampion, 40) ?? null,
    enemyMidChampion: compactText(source.enemyMidChampion, 40) ?? null,
    roster,
    keyEvents,
    playerDelta: {
      cs: finiteNumber(playerDelta.cs),
      gold: finiteNumber(playerDelta.gold),
      xp: finiteNumber(playerDelta.xp),
    },
    enemyMidDelta: {
      championName:
        compactText(enemyMidDelta.championName, 40) ??
        compactText(source.enemyMidChampion, 40) ??
        null,
      cs: finiteNumber(enemyMidDelta.cs),
      gold: finiteNumber(enemyMidDelta.gold),
      xp: finiteNumber(enemyMidDelta.xp),
    },
  };

  if (
    !context.matchId &&
    !context.playerChampion &&
    !context.enemyMidChampion &&
    !context.roster?.length &&
    context.keyEvents?.length === 0
  ) {
    return null;
  }

  return context;
}
