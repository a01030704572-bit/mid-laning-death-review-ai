import type { RiotEvidenceEvent, RiotTimelineEvent } from "@/types/riot";
import type {
  OverwolfAlignmentResult,
  OverwolfCaptureEvent,
} from "@/types/overwolfCapture";

type RiotTimelineEventLike =
  | RiotEvidenceEvent
  | RiotTimelineEvent
  | {
      id?: string;
      timestamp?: number;
      timestampSec?: number;
      gameTimeSec?: number;
      type?: string;
      kind?: string;
    };

type AlignOptions = {
  strictWindowSec?: number;
  looseWindowSec?: number;
};

const DEFAULT_STRICT_WINDOW_SEC = 10;
const DEFAULT_LOOSE_WINDOW_SEC = 30;

export function alignOverwolfEventWithRiotTimeline(
  overwolfEvent: OverwolfCaptureEvent,
  riotEvents: RiotTimelineEventLike[],
  options: AlignOptions = {}
): OverwolfAlignmentResult {
  const strictWindowSec =
    options.strictWindowSec ?? DEFAULT_STRICT_WINDOW_SEC;
  const looseWindowSec = options.looseWindowSec ?? DEFAULT_LOOSE_WINDOW_SEC;
  const overwolfTimeSec = finiteNumber(overwolfEvent.estimatedGameTimeSec);

  if (overwolfTimeSec === undefined) {
    return {
      status: "unknown",
      confidence: "unconfirmed",
      matchedOverwolfEventId: overwolfEvent.id,
      reasonKo: "Overwolf 이벤트의 게임 시간이 없어 Riot 이벤트와 같은 장면인지 확인할 수 없습니다.",
    };
  }

  const nearest = nearestRiotEvent(riotEvents, overwolfTimeSec);
  if (!nearest) {
    return {
      status: "unknown",
      confidence: "unconfirmed",
      matchedOverwolfEventId: overwolfEvent.id,
      reasonKo: "비교할 수 있는 Riot 이벤트 시간이 없어 장면 정렬을 확인할 수 없습니다.",
    };
  }

  const deltaSeconds = Math.abs(overwolfTimeSec - nearest.timeSec);
  const base = {
    deltaSeconds,
    matchedRiotEventId: nearest.id,
    matchedOverwolfEventId: overwolfEvent.id,
  };

  if (deltaSeconds <= strictWindowSec) {
    return {
      ...base,
      status: "aligned",
      toleranceSecUsed: 10,
      confidence: "confirmed",
      reasonKo: "Overwolf 이벤트와 Riot 이벤트 시간이 10초 이내로 가까워 같은 장면 근거로 볼 수 있습니다.",
    };
  }

  if (deltaSeconds <= looseWindowSec) {
    return {
      ...base,
      status: "aligned",
      toleranceSecUsed: 30,
      confidence: "likely",
      reasonKo: "Overwolf 이벤트와 Riot 이벤트 시간이 30초 이내로 가까워 같은 장면 후보로 볼 수 있지만 추가 확인이 필요합니다.",
    };
  }

  return {
    ...base,
    status: "misaligned",
    confidence: "unconfirmed",
    reasonKo: "Overwolf 이벤트와 Riot 이벤트 시간이 30초보다 멀어 같은 장면으로 확정하면 안 됩니다.",
  };
}

function nearestRiotEvent(
  riotEvents: RiotTimelineEventLike[],
  targetTimeSec: number
): { event: RiotTimelineEventLike; id: string; timeSec: number } | null {
  let nearest:
    | { event: RiotTimelineEventLike; id: string; timeSec: number; delta: number }
    | null = null;

  for (const [index, event] of riotEvents.entries()) {
    const timeSec = riotEventTimeSec(event);
    if (timeSec === undefined) continue;

    const delta = Math.abs(targetTimeSec - timeSec);
    if (!nearest || delta < nearest.delta) {
      nearest = {
        event,
        id: riotEventId(event, timeSec, index),
        timeSec,
        delta,
      };
    }
  }

  return nearest
    ? { event: nearest.event, id: nearest.id, timeSec: nearest.timeSec }
    : null;
}

function riotEventTimeSec(event: RiotTimelineEventLike): number | undefined {
  if ("gameTimeSec" in event) return finiteNumber(event.gameTimeSec);
  if ("timestampSec" in event) return finiteNumber(event.timestampSec);
  if ("timestamp" in event) {
    const timestamp = finiteNumber(event.timestamp);
    if (timestamp !== undefined) return Math.round(timestamp / 1000);
  }
  return undefined;
}

function riotEventId(
  event: RiotTimelineEventLike,
  timeSec: number,
  index: number
): string {
  if ("id" in event && typeof event.id === "string" && event.id.length > 0) {
    return event.id;
  }

  const eventType =
    ("type" in event && event.type) || ("kind" in event && event.kind) || "event";
  return `riot:${eventType}:${timeSec}:${index}`;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}
