import { NextResponse } from "next/server";
import { buildCoachingFeedbackPreviewForMatchReview } from "@/lib/coachingFeedbackResponseAdapter";
import { attachOverwolfEvidenceToRankedScenes } from "@/lib/overwolfSceneEvidenceAttacher";
import { extractAutoSceneCandidates } from "@/lib/riot/autoSceneExtractor";
import {
  getMatchDetail,
  getMatchTimeline,
  mapRiotErrorStatus,
  requireRiotApiKey,
  RiotApiError,
  RiotApiKeyMissingError,
} from "@/lib/riot/client";
import { buildRiotIdentityContext } from "@/lib/riot/riotIdentityContext";
import { rankMatchScenes } from "@/lib/riot/matchSceneRanker";
import type { AutoSceneCandidate } from "@/types/autoScene";
import type { MatchReviewReport, RankedReviewScene } from "@/types/matchReview";
import type { OverwolfCapturePackage } from "@/types/overwolfCapture";
import type {
  RiotMatchDetail,
  RiotMatchTimeline,
  RiotRegionalRoute,
} from "@/types/riot";

class MatchReviewValidationError extends Error {
  status = 400;
}

function normalizeRegionalRoute(value: string | null): RiotRegionalRoute {
  if (value === "americas" || value === "europe" || value === "sea") {
    return value;
  }
  return "asia";
}

function normalizeMatchReviewRequest(searchParams: URLSearchParams) {
  const matchId = searchParams.get("matchId")?.trim() ?? "";
  const puuid = searchParams.get("puuid")?.trim() ?? "";

  if (!matchId) {
    throw new MatchReviewValidationError("matchId가 필요합니다.");
  }
  if (!puuid) {
    throw new MatchReviewValidationError("puuid가 필요합니다.");
  }

  return {
    matchId,
    puuid,
    regionalRoute: normalizeRegionalRoute(searchParams.get("regionalRoute")),
  };
}

async function readOptionalMatchReviewBody(request: Request) {
  if (request.method !== "POST") return null;

  try {
    return (await request.json()) as unknown;
  } catch {
    return null;
  }
}

function extractOptionalOverwolfCapturePackage(
  body: unknown
): OverwolfCapturePackage | null {
  if (!body || typeof body !== "object") return null;
  const overwolfCapturePackage = (body as Record<string, unknown>)
    .overwolfCapturePackage;

  if (!overwolfCapturePackage || typeof overwolfCapturePackage !== "object") {
    return null;
  }

  const record = overwolfCapturePackage as Partial<OverwolfCapturePackage>;
  if (
    record.source !== "overwolf" ||
    typeof record.packageId !== "string" ||
    !Array.isArray(record.events) ||
    !Array.isArray(record.clips) ||
    typeof record.collectedAtLocalTimestampMs !== "number"
  ) {
    return null;
  }

  return record as OverwolfCapturePackage;
}

function riotMatchReviewErrorMessage(status: number) {
  switch (status) {
    case 403:
      return "Riot API key가 거부되었습니다. 서버 설정을 확인해 주세요.";
    case 404:
      return "matchId 또는 timeline 정보를 찾지 못했습니다.";
    case 429:
      return "Riot API rate limit에 도달했습니다. 잠시 후 다시 시도해 주세요.";
    default:
      return "Riot match review 조회 중 오류가 발생했습니다.";
  }
}

function findParticipantByPuuid(match: RiotMatchDetail, puuid: string) {
  return (
    match.info.participants.find((participant) => participant.puuid === puuid) ??
    null
  );
}

function findEnemyMidChampion(
  match: RiotMatchDetail,
  player: NonNullable<ReturnType<typeof findParticipantByPuuid>>
) {
  return match.info.participants.find((participant) => {
    if (participant.teamId === player.teamId) return false;
    return (
      participant.individualPosition === "MIDDLE" ||
      participant.teamPosition === "MIDDLE"
    );
  })?.championName;
}

function extractAutoSceneCandidatesSafely({
  matchId,
  player,
  match,
  timeline,
}: {
  matchId: string;
  player: NonNullable<ReturnType<typeof findParticipantByPuuid>>;
  match: RiotMatchDetail;
  timeline: RiotMatchTimeline;
}): AutoSceneCandidate[] {
  try {
    return extractAutoSceneCandidates({
      matchId,
      participantId: player.participantId,
      championName: player.championName,
      opponentChampionName: findEnemyMidChampion(match, player),
      matchDetail: match,
      timeline,
    });
  } catch (error) {
    console.warn("Riot match review auto scene extraction failed.", {
      matchId,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return [];
  }
}

function attachOverwolfEvidenceSafely(
  report: MatchReviewReport,
  overwolfCapturePackage: OverwolfCapturePackage | null
) {
  if (!overwolfCapturePackage) return report;

  try {
    const attachScenes = (scenes: RankedReviewScene[]) =>
      attachOverwolfEvidenceToRankedScenes(scenes, overwolfCapturePackage);

    return {
      ...report,
      rankedScenes: attachScenes(report.rankedScenes),
      improvementScenes: attachScenes(report.improvementScenes),
      strengthScenes: attachScenes(report.strengthScenes),
      topScenes: attachScenes(report.topScenes),
      sceneBundles: report.sceneBundles?.map((bundle) => ({
        ...bundle,
        representative: attachScenes([bundle.representative])[0],
        nearby: attachScenes(bundle.nearby),
      })),
    };
  } catch (error) {
    console.warn("Overwolf evidence attachment failed.", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return report;
  }
}

async function handleMatchReview(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reviewRequest = normalizeMatchReviewRequest(searchParams);
    const requestBody = await readOptionalMatchReviewBody(request);
    const overwolfCapturePackage =
      extractOptionalOverwolfCapturePackage(requestBody);
    const apiKey = requireRiotApiKey();
    const match = await getMatchDetail({
      matchId: reviewRequest.matchId,
      regionalRoute: reviewRequest.regionalRoute,
      apiKey,
    });
    const timeline = await getMatchTimeline({
      matchId: reviewRequest.matchId,
      regionalRoute: reviewRequest.regionalRoute,
      apiKey,
    });
    const player = findParticipantByPuuid(match, reviewRequest.puuid);

    if (!player) {
      throw new RiotApiError(404, "Participant was not found in match detail.");
    }

    const riotIdentityContext = buildRiotIdentityContext({
      matchId: reviewRequest.matchId,
      participantId: player.participantId,
      matchDetail: match,
      timeline,
    });
    const autoSceneCandidates = extractAutoSceneCandidatesSafely({
      matchId: reviewRequest.matchId,
      player,
      match,
      timeline,
    });
    const report = rankMatchScenes({
      autoSceneCandidates,
      riotIdentityContext,
      matchId: reviewRequest.matchId,
      puuid: reviewRequest.puuid,
      gameDurationSec: match.info.gameDuration,
    });
    const responseReport = attachOverwolfEvidenceSafely(
      report,
      overwolfCapturePackage
    );
    const coachingFeedbackPreview =
      buildCoachingFeedbackPreviewForMatchReview({
        report: responseReport,
        generatedAtIsoTimestamp: responseReport.generatedAt,
      });

    return NextResponse.json({
      report: responseReport,
      ...coachingFeedbackPreview,
    });
  } catch (error) {
    if (error instanceof MatchReviewValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    if (error instanceof RiotApiKeyMissingError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const status = mapRiotErrorStatus(error);
    if (status) {
      console.warn("Riot match review request failed.", {
        status,
        message: error instanceof Error ? error.message : "Unknown error",
      });
      return NextResponse.json(
        { error: riotMatchReviewErrorMessage(status) },
        { status }
      );
    }

    console.error(
      "Unexpected Riot match review error.",
      error instanceof Error ? error.message : "Unknown error"
    );
    return NextResponse.json(
      { error: "Riot match review 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return handleMatchReview(request);
}

export async function POST(request: Request) {
  return handleMatchReview(request);
}
