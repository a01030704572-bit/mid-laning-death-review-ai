import type { CaptureSession, CaptureSessionValidationIssue } from "@/types/captureSession";
import type {
  OverwolfCaptureConfidence,
  OverwolfCaptureEvent,
  OverwolfCaptureEventType,
  OverwolfCapturePackage,
  OverwolfClip,
} from "@/types/overwolfCapture";

const MAX_EVENTS = 200;
const MAX_CLIPS = 200;
const RECEIVED_AT_ISO_TIMESTAMP = "1970-01-01T00:00:00.000Z";

const EVENT_TYPES = new Set<OverwolfCaptureEventType>([
  "death",
  "solo_kill",
  "kill",
  "assist",
  "objective",
  "game_end",
  "recall",
  "unknown",
]);

const EVENT_CONFIDENCE = new Set<OverwolfCaptureConfidence>([
  "high",
  "medium",
  "low",
]);

const CLIP_STATUSES = new Set<OverwolfClip["status"]>([
  "captured",
  "capture_failed",
  "capture_partial",
]);

export function validateOverwolfCapturePackage(raw: unknown): {
  session: CaptureSession;
  safe: boolean;
} {
  const issues: CaptureSessionValidationIssue[] = [];

  if (!isRecord(raw)) {
    issues.push({
      field: "package",
      reasonKo: "capture package 형식을 확인할 수 없습니다.",
    });
    return rejectedSession("invalid", issues);
  }

  const packageId = stringValue(raw.packageId);
  if (!packageId) {
    issues.push({
      field: "packageId",
      reasonKo: "packageId가 비어 있거나 문자열이 아닙니다.",
    });
  }

  const source = stringValue(raw.source);
  if (source && source !== "overwolf") {
    issues.push({
      field: "source",
      reasonKo: "source가 overwolf 형식으로 보이지 않습니다.",
    });
  } else if (!source) {
    issues.push({
      field: "source",
      reasonKo: "source가 없어 overwolf로 간주했습니다.",
    });
  }

  const collectedAtLocalTimestampMs = finiteNumber(
    raw.collectedAtLocalTimestampMs
  );
  if (collectedAtLocalTimestampMs === undefined) {
    issues.push({
      field: "collectedAtLocalTimestampMs",
      reasonKo: "수집 시각을 확인할 수 없습니다.",
    });
  }

  const eventsInput = Array.isArray(raw.events) ? raw.events : null;
  if (!eventsInput) {
    issues.push({
      field: "events",
      reasonKo: "events 배열을 확인할 수 없습니다.",
    });
  } else if (eventsInput.length > MAX_EVENTS) {
    issues.push({
      field: "events",
      reasonKo: "events 개수가 허용 범위를 초과했습니다.",
    });
  }

  const clipsInput = Array.isArray(raw.clips) ? raw.clips : null;
  if (!clipsInput) {
    issues.push({
      field: "clips",
      reasonKo: "clips 배열을 확인할 수 없습니다.",
    });
  } else if (clipsInput.length > MAX_CLIPS) {
    issues.push({
      field: "clips",
      reasonKo: "clips 개수가 허용 범위를 초과했습니다.",
    });
  }

  const events = eventsInput
    ? validateEvents(eventsInput, issues)
    : [];
  const clips = clipsInput ? validateClips(clipsInput, issues) : [];
  const hasCriticalIssue = issues.some((issue) =>
    isCriticalField(issue.field)
  );

  if (
    !packageId ||
    collectedAtLocalTimestampMs === undefined ||
    !eventsInput ||
    !clipsInput ||
    hasCriticalIssue
  ) {
    return rejectedSession(packageId ?? "invalid", issues);
  }

  const sourcePackage: OverwolfCapturePackage = {
    packageId,
    source: "overwolf",
    ...(stringValue(raw.matchIdGuess) ? { matchIdGuess: stringValue(raw.matchIdGuess) } : {}),
    ...(stringValue(raw.puuidGuess) ? { puuidGuess: stringValue(raw.puuidGuess) } : {}),
    ...(stringValue(raw.gameNameGuess) ? { gameNameGuess: stringValue(raw.gameNameGuess) } : {}),
    ...(stringValue(raw.tagLineGuess) ? { tagLineGuess: stringValue(raw.tagLineGuess) } : {}),
    ...(stringValue(raw.clientVersion) ? { clientVersion: stringValue(raw.clientVersion) } : {}),
    events,
    clips,
    collectedAtLocalTimestampMs,
  };

  return {
    safe: true,
    session: {
      sessionId: buildSessionId(packageId),
      status: "validated",
      receivedAtIsoTimestamp: RECEIVED_AT_ISO_TIMESTAMP,
      sourcePackage,
      validationIssues: issues,
    },
  };
}

function validateEvents(
  values: unknown[],
  issues: CaptureSessionValidationIssue[]
): OverwolfCaptureEvent[] {
  return values.flatMap((value, index) => {
    const field = `events[${index}]`;
    if (!isRecord(value)) {
      issues.push({
        field,
        reasonKo: "event 형식을 확인할 수 없습니다.",
      });
      return [];
    }

    const id = stringValue(value.id);
    const type = stringValue(value.type);
    const localTimestampMs = finiteNumber(value.localTimestampMs);
    const estimatedGameTimeSec =
      value.estimatedGameTimeSec === undefined
        ? undefined
        : finiteNumber(value.estimatedGameTimeSec);
    const confidence = stringValue(value.confidence);

    if (!id) {
      issues.push({ field: `${field}.id`, reasonKo: "event id가 비어 있습니다." });
    }
    if (!type || !EVENT_TYPES.has(type as OverwolfCaptureEventType)) {
      issues.push({
        field: `${field}.type`,
        reasonKo: "event type을 확인할 수 없습니다.",
      });
    }
    if (localTimestampMs === undefined) {
      issues.push({
        field: `${field}.localTimestampMs`,
        reasonKo: "event local timestamp를 확인할 수 없습니다.",
      });
    }
    if (
      value.estimatedGameTimeSec !== undefined &&
      (estimatedGameTimeSec === undefined || estimatedGameTimeSec < 0)
    ) {
      issues.push({
        field: `${field}.estimatedGameTimeSec`,
        reasonKo: "event 게임 시간이 유효하지 않습니다.",
      });
    }
    if (
      !confidence ||
      !EVENT_CONFIDENCE.has(confidence as OverwolfCaptureConfidence)
    ) {
      issues.push({
        field: `${field}.confidence`,
        reasonKo: "event confidence를 확인할 수 없습니다.",
      });
    }

    if (
      !id ||
      !type ||
      !EVENT_TYPES.has(type as OverwolfCaptureEventType) ||
      localTimestampMs === undefined ||
      !confidence ||
      !EVENT_CONFIDENCE.has(confidence as OverwolfCaptureConfidence) ||
      (value.estimatedGameTimeSec !== undefined &&
        (estimatedGameTimeSec === undefined || estimatedGameTimeSec < 0))
    ) {
      return [];
    }

    return [
      {
        id,
        type: type as OverwolfCaptureEventType,
        localTimestampMs,
        ...(estimatedGameTimeSec !== undefined ? { estimatedGameTimeSec } : {}),
        confidence: confidence as OverwolfCaptureConfidence,
        ...(stringValue(value.rawEventName) ? { rawEventName: stringValue(value.rawEventName) } : {}),
        ...(stringValue(value.summaryKo) ? { summaryKo: stringValue(value.summaryKo) } : {}),
      },
    ];
  });
}

function validateClips(
  values: unknown[],
  issues: CaptureSessionValidationIssue[]
): OverwolfClip[] {
  return values.flatMap((value, index) => {
    const field = `clips[${index}]`;
    if (!isRecord(value)) {
      issues.push({
        field,
        reasonKo: "clip 형식을 확인할 수 없습니다.",
      });
      return [];
    }

    const id = stringValue(value.id);
    const triggerEventId = stringValue(value.triggerEventId);
    const status = stringValue(value.status);
    const pastDurationMs = finiteNumber(value.pastDurationMs);
    const futureDurationMs = finiteNumber(value.futureDurationMs);
    const capturedAtLocalTimestampMs = finiteNumber(
      value.capturedAtLocalTimestampMs
    );

    if (!id) {
      issues.push({ field: `${field}.id`, reasonKo: "clip id가 비어 있습니다." });
    }
    if (!triggerEventId) {
      issues.push({
        field: `${field}.triggerEventId`,
        reasonKo: "clip trigger event id가 비어 있습니다.",
      });
    }
    if (!status || !CLIP_STATUSES.has(status as OverwolfClip["status"])) {
      issues.push({
        field: `${field}.status`,
        reasonKo: "clip status를 확인할 수 없습니다.",
      });
    }
    if (pastDurationMs === undefined || pastDurationMs < 0) {
      issues.push({
        field: `${field}.pastDurationMs`,
        reasonKo: "clip 이전 저장 시간이 유효하지 않습니다.",
      });
    }
    if (futureDurationMs === undefined || futureDurationMs < 0) {
      issues.push({
        field: `${field}.futureDurationMs`,
        reasonKo: "clip 이후 저장 시간이 유효하지 않습니다.",
      });
    }
    if (
      capturedAtLocalTimestampMs === undefined ||
      capturedAtLocalTimestampMs < 0
    ) {
      issues.push({
        field: `${field}.capturedAtLocalTimestampMs`,
        reasonKo: "clip 저장 시각이 유효하지 않습니다.",
      });
    }

    if (
      !id ||
      !triggerEventId ||
      !status ||
      !CLIP_STATUSES.has(status as OverwolfClip["status"]) ||
      pastDurationMs === undefined ||
      pastDurationMs < 0 ||
      futureDurationMs === undefined ||
      futureDurationMs < 0 ||
      capturedAtLocalTimestampMs === undefined ||
      capturedAtLocalTimestampMs < 0
    ) {
      return [];
    }

    return [
      {
        id,
        triggerEventId,
        pastDurationMs,
        futureDurationMs,
        capturedAtLocalTimestampMs,
        status: status as OverwolfClip["status"],
      },
    ];
  });
}

function rejectedSession(
  packageId: string,
  validationIssues: CaptureSessionValidationIssue[]
) {
  return {
    safe: false,
    session: {
      sessionId: buildSessionId(packageId),
      status: "rejected" as const,
      receivedAtIsoTimestamp: RECEIVED_AT_ISO_TIMESTAMP,
      validationIssues,
    },
  };
}

function isCriticalField(field: string) {
  return (
    field === "events" ||
    field === "clips" ||
    field.startsWith("events[") ||
    field.startsWith("clips[")
  );
}

function buildSessionId(packageId: string) {
  return `capture-session:${packageId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function finiteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}
