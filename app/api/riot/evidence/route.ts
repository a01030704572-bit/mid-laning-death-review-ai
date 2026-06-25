import { NextResponse } from "next/server";
import {
  getMatchDetail,
  getMatchTimeline,
  mapRiotErrorStatus,
  requireRiotApiKey,
  RiotApiKeyMissingError,
} from "@/lib/riot/client";
import {
  buildRiotTimelineEvidence,
  normalizeEvidenceRequest,
  RiotEvidenceValidationError,
} from "@/lib/riot/evidenceBuilder";

function riotErrorMessage(status: number) {
  switch (status) {
    case 403:
      return "Riot API key가 거부되었습니다. 서버 설정을 확인해 주세요.";
    case 404:
      return "matchId 또는 timeline 정보를 찾지 못했습니다.";
    case 429:
      return "Riot API rate limit에 도달했습니다. 잠시 후 다시 시도해 주세요.";
    default:
      return "Riot API 조회 중 오류가 발생했습니다.";
  }
}

export async function POST(request: Request) {
  try {
    const apiKey = requireRiotApiKey();
    const body = (await request.json()) as Record<string, unknown>;
    const evidenceRequest = normalizeEvidenceRequest(body);
    const match = await getMatchDetail({
      matchId: evidenceRequest.matchId,
      apiKey,
    });
    const timeline = await getMatchTimeline({
      matchId: evidenceRequest.matchId,
      apiKey,
    });

    return NextResponse.json({
      evidence: buildRiotTimelineEvidence({
        match,
        timeline,
        request: evidenceRequest,
      }),
    });
  } catch (error) {
    if (error instanceof RiotEvidenceValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof RiotApiKeyMissingError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const status = mapRiotErrorStatus(error);
    if (status) {
      console.warn("Riot evidence request failed.", { status });
      return NextResponse.json({ error: riotErrorMessage(status) }, { status });
    }

    console.error("Unexpected Riot evidence error.", error);
    return NextResponse.json(
      { error: "Riot timeline evidence 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
