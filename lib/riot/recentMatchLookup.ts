import type { RiotRegionalRoute } from "@/types/riot";

export type RecentMatchLookupRequest = {
  gameName: string;
  tagLine: string;
  regionalRoute: RiotRegionalRoute;
  count: number;
};

export class RecentMatchLookupValidationError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export function normalizeRecentMatchLookupRequest(
  searchParams: URLSearchParams
): RecentMatchLookupRequest {
  const gameName = searchParams.get("gameName")?.trim() ?? "";
  const tagLine = searchParams.get("tagLine")?.trim() ?? "";

  if (!gameName) {
    throw new RecentMatchLookupValidationError("gameName이 필요합니다.");
  }
  if (!tagLine) {
    throw new RecentMatchLookupValidationError("tagLine이 필요합니다.");
  }

  return {
    gameName,
    tagLine,
    regionalRoute: normalizeRegionalRoute(searchParams.get("regionalRoute")),
    count: normalizeRecentMatchCount(searchParams.get("count")),
  };
}

export function normalizeRecentMatchCount(value: string | number | null) {
  const parsed = typeof value === "number" ? value : Number(value ?? 5);
  if (!Number.isFinite(parsed)) return 5;
  return Math.min(Math.max(Math.trunc(parsed), 1), 10);
}

export function buildRecentMatchIdsResponse({
  puuid,
  gameName,
  tagLine,
  regionalRoute,
  matchIds,
}: {
  puuid: string;
  gameName: string;
  tagLine: string;
  regionalRoute: RiotRegionalRoute;
  matchIds: string[];
}) {
  return {
    puuid,
    gameName,
    tagLine,
    regionalRoute,
    matchIds,
  };
}

export function riotRecentMatchErrorMessage(status: number) {
  switch (status) {
    case 400:
      return "Riot API 요청 파라미터를 확인해 주세요.";
    case 403:
      return "Riot API key is invalid or expired.";
    case 404:
      return "Riot ID 또는 최근 경기 정보를 찾지 못했습니다.";
    case 429:
      return "Riot API rate limit에 도달했습니다. 잠시 후 다시 시도해 주세요.";
    default:
      return "Riot API 조회 중 오류가 발생했습니다.";
  }
}

export function mapRecentMatchRiotStatus(status: number) {
  if (status === 401 || status === 403) return 403;
  if (status === 400 || status === 404 || status === 429) return status;
  return 500;
}

export function safeRecentMatchErrorLog(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }
  return {
    message: "Unknown non-error thrown",
  };
}

function normalizeRegionalRoute(value: string | null): RiotRegionalRoute {
  if (value === "americas" || value === "europe" || value === "sea") {
    return value;
  }
  return "asia";
}
