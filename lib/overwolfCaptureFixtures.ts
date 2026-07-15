import type { OverwolfCapturePackage } from "@/types/overwolfCapture";

const BASE_LOCAL_TIME_MS = 1_800_000;

export const overwolfDeathCapturePackage: OverwolfCapturePackage = {
  packageId: "fixture-overwolf-death",
  source: "overwolf",
  matchIdGuess: "KR_OW_DEATH",
  puuidGuess: "fixture-puuid",
  gameNameGuess: "MidReviewer",
  tagLineGuess: "KR1",
  clientVersion: "fixture",
  collectedAtLocalTimestampMs: BASE_LOCAL_TIME_MS + 20_000,
  events: [
    {
      id: "ow-event-death-600",
      type: "death",
      localTimestampMs: BASE_LOCAL_TIME_MS,
      estimatedGameTimeSec: 600,
      confidence: "high",
      rawEventName: "death",
      summaryKo: "플레이어 사망 이벤트",
      raw: { debugPayload: "fixture-only" },
    },
  ],
  clips: [
    {
      id: "ow-clip-death-600",
      triggerEventId: "ow-event-death-600",
      filePathOrUrl: "file:///clips/death-600.mp4",
      pastDurationMs: 15_000,
      futureDurationMs: 10_000,
      capturedAtLocalTimestampMs: BASE_LOCAL_TIME_MS + 500,
      status: "captured",
    },
  ],
};

export const overwolfSoloKillCapturePackage: OverwolfCapturePackage = {
  packageId: "fixture-overwolf-solo-kill",
  source: "overwolf",
  matchIdGuess: "KR_OW_SOLO_KILL",
  puuidGuess: "fixture-puuid",
  gameNameGuess: "MidReviewer",
  tagLineGuess: "KR1",
  clientVersion: "fixture",
  collectedAtLocalTimestampMs: BASE_LOCAL_TIME_MS + 50_000,
  events: [
    {
      id: "ow-event-solo-kill-720",
      type: "solo_kill",
      localTimestampMs: BASE_LOCAL_TIME_MS + 30_000,
      estimatedGameTimeSec: 720,
      confidence: "high",
      rawEventName: "kill",
      summaryKo: "솔로킬 후보 이벤트",
      raw: { debugPayload: "fixture-only" },
    },
  ],
  clips: [
    {
      id: "ow-clip-solo-kill-720",
      triggerEventId: "ow-event-solo-kill-720",
      filePathOrUrl: "file:///clips/solo-kill-720.mp4",
      pastDurationMs: 12_000,
      futureDurationMs: 12_000,
      capturedAtLocalTimestampMs: BASE_LOCAL_TIME_MS + 30_400,
      status: "captured",
    },
  ],
};

export const overwolfFailedClipCapturePackage: OverwolfCapturePackage = {
  packageId: "fixture-overwolf-failed-clip",
  source: "overwolf",
  matchIdGuess: "KR_OW_FAILED_CLIP",
  puuidGuess: "fixture-puuid",
  gameNameGuess: "MidReviewer",
  tagLineGuess: "KR1",
  clientVersion: "fixture",
  collectedAtLocalTimestampMs: BASE_LOCAL_TIME_MS + 80_000,
  events: [
    {
      id: "ow-event-death-900",
      type: "death",
      localTimestampMs: BASE_LOCAL_TIME_MS + 60_000,
      estimatedGameTimeSec: 900,
      confidence: "medium",
      rawEventName: "death",
      summaryKo: "플레이어 사망 이벤트",
      raw: { debugPayload: "fixture-only" },
    },
  ],
  clips: [
    {
      id: "ow-clip-failed-900",
      triggerEventId: "ow-event-death-900",
      pastDurationMs: 15_000,
      futureDurationMs: 10_000,
      capturedAtLocalTimestampMs: BASE_LOCAL_TIME_MS + 60_500,
      status: "capture_failed",
    },
  ],
};

export const overwolfCaptureFixturePackages = [
  overwolfDeathCapturePackage,
  overwolfSoloKillCapturePackage,
  overwolfFailedClipCapturePackage,
] as const;
