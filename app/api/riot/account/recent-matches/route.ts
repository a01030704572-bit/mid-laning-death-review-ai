import { NextResponse } from "next/server";
import {
  getAccountByRiotId,
  getRecentMatchIds,
  requireRiotApiKey,
  RiotApiError,
  RiotApiKeyMissingError,
} from "@/lib/riot/client";
import {
  buildRecentMatchIdsResponse,
  mapRecentMatchRiotStatus,
  normalizeRecentMatchLookupRequest,
  RecentMatchLookupValidationError,
  riotRecentMatchErrorMessage,
  safeRecentMatchErrorLog,
} from "@/lib/riot/recentMatchLookup";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lookupRequest = normalizeRecentMatchLookupRequest(searchParams);
    const apiKey = requireRiotApiKey();
    const account = await getAccountByRiotId({
      gameName: lookupRequest.gameName,
      tagLine: lookupRequest.tagLine,
      regionalRoute: lookupRequest.regionalRoute,
      apiKey,
    });
    const matchIds = await getRecentMatchIds({
      puuid: account.puuid,
      regionalRoute: lookupRequest.regionalRoute,
      count: lookupRequest.count,
      apiKey,
    });

    return NextResponse.json(
      buildRecentMatchIdsResponse({
        puuid: account.puuid,
        gameName: account.gameName ?? lookupRequest.gameName,
        tagLine: account.tagLine ?? lookupRequest.tagLine,
        regionalRoute: lookupRequest.regionalRoute,
        matchIds,
      })
    );
  } catch (error) {
    if (error instanceof RecentMatchLookupValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof RiotApiKeyMissingError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (error instanceof RiotApiError) {
      const status = mapRecentMatchRiotStatus(error.status);
      console.warn("Riot recent match IDs request failed.", {
        status: error.status,
        mappedStatus: status,
        message: error.message,
      });
      return NextResponse.json(
        { error: riotRecentMatchErrorMessage(status) },
        { status }
      );
    }

    console.error(
      "Unexpected Riot recent match IDs error.",
      safeRecentMatchErrorLog(error)
    );
    return NextResponse.json(
      { error: "Riot 최근 경기 ID 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}
