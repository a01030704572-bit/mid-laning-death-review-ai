import { NextResponse } from "next/server";
import {
  buildMatchListItem,
  getAccountByRiotId,
  getMatchDetail,
  getRecentMatchIds,
  mapRiotErrorStatus,
  requireRiotApiKey,
  RiotApiKeyMissingError,
} from "@/lib/riot/client";
import type { RiotRegionalRoute } from "@/types/riot";

function getRoute(value: string | null): RiotRegionalRoute {
  if (value === "americas" || value === "europe" || value === "sea") return value;
  return "asia";
}

function riotErrorMessage(status: number) {
  switch (status) {
    case 403:
      return "Riot API key가 거부되었습니다. 서버 설정을 확인해 주세요.";
    case 404:
      return "Riot ID 또는 최근 경기 정보를 찾지 못했습니다.";
    case 429:
      return "Riot API rate limit에 도달했습니다. 잠시 후 다시 시도해 주세요.";
    default:
      return "Riot API 조회 중 오류가 발생했습니다.";
  }
}

export async function GET(request: Request) {
  try {
    const apiKey = requireRiotApiKey();
    const { searchParams } = new URL(request.url);
    const gameName = searchParams.get("gameName")?.trim() ?? "";
    const tagLine = searchParams.get("tagLine")?.trim() ?? "";
    const regionalRoute = getRoute(searchParams.get("regionalRoute"));
    const rawCount = Number(searchParams.get("count") ?? 5);
    const count = Number.isFinite(rawCount) ? Math.min(Math.max(rawCount, 1), 5) : 5;

    if (!gameName) {
      return NextResponse.json({ error: "gameName이 필요합니다." }, { status: 400 });
    }
    if (!tagLine) {
      return NextResponse.json({ error: "tagLine이 필요합니다." }, { status: 400 });
    }

    const account = await getAccountByRiotId({
      gameName,
      tagLine,
      regionalRoute,
      apiKey,
    });
    const matchIds = await getRecentMatchIds({
      puuid: account.puuid,
      regionalRoute,
      count,
      apiKey,
    });
    const matches = await Promise.all(
      matchIds.map(async (matchId) => {
        const match = await getMatchDetail({ matchId, regionalRoute, apiKey });
        return buildMatchListItem({ matchId, match, puuid: account.puuid });
      })
    );

    return NextResponse.json({ matches });
  } catch (error) {
    if (error instanceof RiotApiKeyMissingError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const status = mapRiotErrorStatus(error);
    if (status) {
      console.warn("Riot match list request failed.", { status });
      return NextResponse.json({ error: riotErrorMessage(status) }, { status });
    }

    console.error("Unexpected Riot match list error.", error);
    return NextResponse.json(
      { error: "Riot 최근 경기 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}
