import type {
  OverwolfAlignmentResult,
  OverwolfCaptureEvent,
  OverwolfCapturePackage,
  OverwolfClip,
  SceneVideoEvidence,
} from "@/types/overwolfCapture";

export function mapOverwolfPackageToSceneVideoEvidence(
  pkg: OverwolfCapturePackage
): SceneVideoEvidence[] {
  const clipsByEventId = new Map<string, OverwolfClip>();
  for (const clip of [...pkg.clips].sort(compareClip)) {
    if (!clipsByEventId.has(clip.triggerEventId)) {
      clipsByEventId.set(clip.triggerEventId, clip);
    }
  }

  return [...pkg.events].sort(compareEvent).map((event) => {
    const clip = clipsByEventId.get(event.id);
    const confidence = videoEvidenceConfidence(event, clip);
    return {
      sceneId: buildSceneId(event),
      ...(clip ? { clip: compactClip(clip) } : {}),
      sourceEvent: compactEvent(event),
      confidence,
      alignment: defaultUnknownAlignment(event),
      noteKo: buildNoteKo(event, clip),
    };
  });
}

function buildSceneId(event: OverwolfCaptureEvent): string {
  const timePart =
    finiteNumber(event.estimatedGameTimeSec) ??
    Math.round(event.localTimestampMs / 1000);
  return `overwolf:${event.type}:${timePart}:${event.id}`;
}

function videoEvidenceConfidence(
  event: OverwolfCaptureEvent,
  clip: OverwolfClip | undefined
): SceneVideoEvidence["confidence"] {
  if (!clip || clip.status === "capture_failed") return "unconfirmed";
  if (clip.status === "capture_partial") return "likely";
  return event.confidence === "high" ? "likely" : "unconfirmed";
}

function buildNoteKo(
  event: OverwolfCaptureEvent,
  clip: OverwolfClip | undefined
): string {
  if (!clip) {
    return "Overwolf 이벤트는 있지만 연결된 클립이 없어 영상 근거로는 아직 확인할 수 없습니다.";
  }

  if (clip.status === "capture_failed") {
    return "Overwolf 이벤트는 감지됐지만 클립 저장에 실패해 영상 근거는 확인되지 않았습니다.";
  }

  if (clip.status === "capture_partial") {
    return "Overwolf 클립이 일부만 저장되어 장면 후보로만 참고해야 합니다.";
  }

  return `${event.summaryKo ?? "Overwolf 이벤트"}에 연결된 클립 후보입니다. 최종 판단 전 Riot/영상 정렬 확인이 필요합니다.`;
}

function defaultUnknownAlignment(
  event: OverwolfCaptureEvent
): OverwolfAlignmentResult {
  return {
    status: "unknown",
    confidence: "unconfirmed",
    matchedOverwolfEventId: event.id,
    reasonKo: "아직 Riot 타임라인과 정렬하지 않은 Overwolf 영상 후보입니다.",
  };
}

function compactEvent(
  event: OverwolfCaptureEvent
): SceneVideoEvidence["sourceEvent"] {
  const { raw: _raw, ...safeEvent } = event;
  return safeEvent;
}

function compactClip(clip: OverwolfClip): SceneVideoEvidence["clip"] {
  const { triggerEventId: _triggerEventId, ...safeClip } = clip;
  return safeClip;
}

function compareEvent(
  left: OverwolfCaptureEvent,
  right: OverwolfCaptureEvent
) {
  return (
    (left.estimatedGameTimeSec ?? Number.POSITIVE_INFINITY) -
      (right.estimatedGameTimeSec ?? Number.POSITIVE_INFINITY) ||
    left.localTimestampMs - right.localTimestampMs ||
    left.id.localeCompare(right.id)
  );
}

function compareClip(left: OverwolfClip, right: OverwolfClip) {
  return (
    left.capturedAtLocalTimestampMs - right.capturedAtLocalTimestampMs ||
    left.id.localeCompare(right.id)
  );
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}
