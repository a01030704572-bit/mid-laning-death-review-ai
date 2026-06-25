import type {
  RiotMatchDetail,
  RiotMatchListItem,
  RiotMatchTimeline,
  RiotRegionalRoute,
} from "@/types/riot";

export class RiotApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

export class RiotApiKeyMissingError extends Error {}

export function requireRiotApiKey(apiKey = process.env.RIOT_API_KEY) {
  const trimmed = apiKey?.trim();
  if (!trimmed) {
    throw new RiotApiKeyMissingError("RIOT_API_KEY 서버 설정이 필요합니다.");
  }
  return trimmed;
}

function normalizeRegionalRoute(route: string | null | undefined): RiotRegionalRoute {
  if (route === "americas" || route === "europe" || route === "sea") return route;
  return "asia";
}

async function riotFetch<T>(url: string, apiKey: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "X-Riot-Token": apiKey,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new RiotApiError(response.status, `Riot API request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function getAccountByRiotId({
  gameName,
  tagLine,
  regionalRoute,
  apiKey = requireRiotApiKey(),
}: {
  gameName: string;
  tagLine: string;
  regionalRoute?: RiotRegionalRoute;
  apiKey?: string;
}) {
  const route = normalizeRegionalRoute(regionalRoute);
  return riotFetch<{ puuid: string; gameName: string; tagLine: string }>(
    `https://${route}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(
      gameName
    )}/${encodeURIComponent(tagLine)}`,
    apiKey
  );
}

export async function getRecentMatchIds({
  puuid,
  regionalRoute,
  count,
  apiKey = requireRiotApiKey(),
}: {
  puuid: string;
  regionalRoute?: RiotRegionalRoute;
  count: number;
  apiKey?: string;
}) {
  const route = normalizeRegionalRoute(regionalRoute);
  const safeCount = Math.min(Math.max(count, 1), 5);
  return riotFetch<string[]>(
    `https://${route}.api.riotgames.com/lol/match/v5/matches/by-puuid/${encodeURIComponent(
      puuid
    )}/ids?start=0&count=${safeCount}`,
    apiKey
  );
}

export async function getMatchDetail({
  matchId,
  regionalRoute,
  apiKey = requireRiotApiKey(),
}: {
  matchId: string;
  regionalRoute?: RiotRegionalRoute;
  apiKey?: string;
}) {
  const route = normalizeRegionalRoute(regionalRoute);
  return riotFetch<RiotMatchDetail>(
    `https://${route}.api.riotgames.com/lol/match/v5/matches/${encodeURIComponent(matchId)}`,
    apiKey
  );
}

export async function getMatchTimeline({
  matchId,
  regionalRoute,
  apiKey = requireRiotApiKey(),
}: {
  matchId: string;
  regionalRoute?: RiotRegionalRoute;
  apiKey?: string;
}) {
  const route = normalizeRegionalRoute(regionalRoute);
  return riotFetch<RiotMatchTimeline>(
    `https://${route}.api.riotgames.com/lol/match/v5/matches/${encodeURIComponent(
      matchId
    )}/timeline`,
    apiKey
  );
}

export function buildMatchListItem({
  matchId,
  match,
  puuid,
}: {
  matchId: string;
  match: RiotMatchDetail;
  puuid: string;
}): RiotMatchListItem {
  const participant = match.info.participants.find((item) => item.puuid === puuid);
  if (!participant) {
    throw new RiotApiError(404, "Participant was not found in match detail.");
  }

  return {
    matchId,
    gameCreation: match.info.gameCreation,
    gameDuration: match.info.gameDuration,
    championName: participant.championName,
    kills: participant.kills ?? 0,
    deaths: participant.deaths ?? 0,
    assists: participant.assists ?? 0,
    win: participant.win === true,
    puuid,
  };
}

export function mapRiotErrorStatus(error: unknown) {
  if (!(error instanceof RiotApiError)) return null;
  if (error.status === 403) return 403;
  if (error.status === 404) return 404;
  if (error.status === 429) return 429;
  return 500;
}
