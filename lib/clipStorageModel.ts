import type {
  ClipStorageProvider,
  ClipUploadPlan,
  ClipUploadRecord,
} from "@/types/clipStorage";
import type { OverwolfCapturePackage, OverwolfClip } from "@/types/overwolfCapture";

const DEFAULT_TIMESTAMP = "1970-01-01T00:00:00.000Z";

export function createClipUploadRecord(input: {
  clipId: string;
  triggerEventId: string;
  packageId?: string;
  matchId?: string;
  provider?: ClipStorageProvider;
  durationMs?: number;
  startedAtLocalTimestampMs?: number;
  endedAtLocalTimestampMs?: number;
  nowIsoTimestamp?: string;
}): ClipUploadRecord {
  const now = input.nowIsoTimestamp ?? DEFAULT_TIMESTAMP;
  const clipId = safeString(input.clipId) ?? "invalid-clip";
  const triggerEventId = safeString(input.triggerEventId) ?? "invalid-trigger";
  const hasRequiredIds =
    safeString(input.clipId) !== undefined &&
    safeString(input.triggerEventId) !== undefined;

  return {
    clipId,
    triggerEventId,
    ...(safeString(input.packageId) ? { packageId: safeString(input.packageId) } : {}),
    ...(safeString(input.matchId) ? { matchId: safeString(input.matchId) } : {}),
    provider: input.provider ?? "unknown",
    status: hasRequiredIds ? "pending" : "skipped",
    ...(finiteNumber(input.durationMs) !== undefined
      ? { durationMs: finiteNumber(input.durationMs) }
      : {}),
    ...(finiteNumber(input.startedAtLocalTimestampMs) !== undefined
      ? { startedAtLocalTimestampMs: finiteNumber(input.startedAtLocalTimestampMs) }
      : {}),
    ...(finiteNumber(input.endedAtLocalTimestampMs) !== undefined
      ? { endedAtLocalTimestampMs: finiteNumber(input.endedAtLocalTimestampMs) }
      : {}),
    ...(!hasRequiredIds
      ? {
          errorCode: "INVALID_CLIP_REFERENCE",
          errorKo: "clip id 또는 trigger event id가 없어 업로드를 건너뜁니다.",
        }
      : {}),
    createdAtIsoTimestamp: now,
    updatedAtIsoTimestamp: now,
  };
}

export function buildClipUploadPlanFromOverwolfPackage(input: {
  overwolfPackage: OverwolfCapturePackage;
  matchId?: string;
  provider?: ClipStorageProvider;
  nowIsoTimestamp?: string;
}): ClipUploadPlan {
  const provider = input.provider ?? "unknown";
  const warningsKo: string[] = [];
  const records = (input.overwolfPackage.clips ?? []).map((clip, index) => {
    const record = createRecordFromClip({
      clip,
      packageId: input.overwolfPackage.packageId,
      matchId: input.matchId,
      provider,
      nowIsoTimestamp: input.nowIsoTimestamp,
    });

    if (record.status === "skipped") {
      warningsKo.push(`clips[${index}]는 업로드할 수 없어 건너뜁니다.`);
    }

    return record;
  });

  return {
    packageId: input.overwolfPackage.packageId,
    ...(safeString(input.matchId) ? { matchId: safeString(input.matchId) } : {}),
    provider,
    records,
    warningsKo,
  };
}

export function markClipUploadRecordUploaded(
  record: ClipUploadRecord,
  input: {
    storageKey: string;
    playbackUrl?: string;
    uploadUrl?: string;
    updatedAtIsoTimestamp?: string;
  }
): ClipUploadRecord {
  return {
    ...record,
    status: "uploaded",
    storageKey: input.storageKey,
    ...(safeString(input.playbackUrl) ? { playbackUrl: safeString(input.playbackUrl) } : {}),
    ...(safeString(input.uploadUrl) ? { uploadUrl: safeString(input.uploadUrl) } : {}),
    errorCode: undefined,
    errorKo: undefined,
    updatedAtIsoTimestamp:
      input.updatedAtIsoTimestamp ?? record.updatedAtIsoTimestamp,
  };
}

export function markClipUploadRecordFailed(
  record: ClipUploadRecord,
  input: {
    errorCode: string;
    errorKo: string;
    updatedAtIsoTimestamp?: string;
  }
): ClipUploadRecord {
  return {
    ...record,
    status: "failed",
    errorCode: input.errorCode,
    errorKo: input.errorKo,
    updatedAtIsoTimestamp:
      input.updatedAtIsoTimestamp ?? record.updatedAtIsoTimestamp,
  };
}

function createRecordFromClip(input: {
  clip: OverwolfClip;
  packageId?: string;
  matchId?: string;
  provider: ClipStorageProvider;
  nowIsoTimestamp?: string;
}) {
  const durationMs = sumDurations(input.clip.pastDurationMs, input.clip.futureDurationMs);
  const startedAtLocalTimestampMs =
    finiteNumber(input.clip.capturedAtLocalTimestampMs) !== undefined &&
    finiteNumber(input.clip.pastDurationMs) !== undefined
      ? input.clip.capturedAtLocalTimestampMs - input.clip.pastDurationMs
      : undefined;
  const endedAtLocalTimestampMs =
    finiteNumber(input.clip.capturedAtLocalTimestampMs) !== undefined &&
    finiteNumber(input.clip.futureDurationMs) !== undefined
      ? input.clip.capturedAtLocalTimestampMs + input.clip.futureDurationMs
      : undefined;

  const record = createClipUploadRecord({
    clipId: input.clip.id,
    triggerEventId: input.clip.triggerEventId,
    packageId: input.packageId,
    matchId: input.matchId,
    provider: input.provider,
    durationMs,
    startedAtLocalTimestampMs,
    endedAtLocalTimestampMs,
    nowIsoTimestamp: input.nowIsoTimestamp,
  });

  if (input.clip.status === "capture_failed") {
    return {
      ...record,
      status: "skipped" as const,
      errorCode: "CLIP_CAPTURE_FAILED",
      errorKo: "클립 저장에 실패해 업로드를 건너뜁니다.",
    };
  }

  return record;
}

function sumDurations(left: unknown, right: unknown) {
  const leftMs = finiteNumber(left);
  const rightMs = finiteNumber(right);
  if (leftMs === undefined || rightMs === undefined) return undefined;
  return leftMs + rightMs;
}

function safeString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function finiteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}
