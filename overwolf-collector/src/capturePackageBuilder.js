(function attachCapturePackageBuilder(globalScope) {
  const EVENT_TYPES = new Set([
    "death",
    "solo_kill",
    "kill",
    "assist",
    "objective",
    "recall",
    "unknown",
  ]);

  function createEmptyCapturePackage(options = {}) {
    const collectedAtLocalTimestampMs = safeNumber(
      options.collectedAtLocalTimestampMs,
      safeNowMs()
    );

    return {
      packageId:
        safeString(options.packageId) ||
        `ow-capture-${collectedAtLocalTimestampMs}`,
      source: "overwolf",
      ...(safeString(options.matchIdGuess)
        ? { matchIdGuess: safeString(options.matchIdGuess) }
        : {}),
      ...(safeString(options.puuidGuess)
        ? { puuidGuess: safeString(options.puuidGuess) }
        : {}),
      ...(safeString(options.gameNameGuess)
        ? { gameNameGuess: safeString(options.gameNameGuess) }
        : {}),
      ...(safeString(options.tagLineGuess)
        ? { tagLineGuess: safeString(options.tagLineGuess) }
        : {}),
      ...(safeString(options.clientVersion)
        ? { clientVersion: safeString(options.clientVersion) }
        : {}),
      events: [],
      clips: [],
      collectedAtLocalTimestampMs,
    };
  }

  function addCaptureEvent(packageState, event) {
    const nextEvent = normalizeCaptureEvent(event);
    if (!nextEvent) return clonePackage(packageState);

    return {
      ...clonePackage(packageState),
      events: [...(packageState.events || []), nextEvent],
    };
  }

  function addClip(packageState, clip) {
    const nextClip = normalizeClip(clip);
    if (!nextClip) return clonePackage(packageState);

    return {
      ...clonePackage(packageState),
      clips: [...(packageState.clips || []), nextClip],
    };
  }

  function toSerializableCapturePackage(packageState) {
    return {
      ...clonePackage(packageState),
      events: (packageState.events || [])
        .map(normalizeCaptureEvent)
        .filter(Boolean),
      clips: (packageState.clips || []).map(normalizeClip).filter(Boolean),
    };
  }

  function normalizeEventType(value) {
    const normalized = safeString(value);
    return normalized && EVENT_TYPES.has(normalized) ? normalized : "unknown";
  }

  function safeNowMs() {
    return Date.now();
  }

  function normalizeCaptureEvent(event = {}) {
    const id = safeString(event.id);
    if (!id) return null;

    return {
      id,
      type: normalizeEventType(event.type),
      localTimestampMs: safeNumber(event.localTimestampMs, safeNowMs()),
      ...(typeof event.estimatedGameTimeSec === "number" &&
      Number.isFinite(event.estimatedGameTimeSec) &&
      event.estimatedGameTimeSec >= 0
        ? { estimatedGameTimeSec: event.estimatedGameTimeSec }
        : {}),
      confidence: normalizeConfidence(event.confidence),
      ...(safeString(event.rawEventName)
        ? { rawEventName: safeString(event.rawEventName) }
        : {}),
      ...(safeString(event.summaryKo)
        ? { summaryKo: safeString(event.summaryKo) }
        : {}),
    };
  }

  function normalizeClip(clip = {}) {
    const id = safeString(clip.id);
    const triggerEventId = safeString(clip.triggerEventId);
    if (!id || !triggerEventId) return null;

    return {
      id,
      triggerEventId,
      pastDurationMs: safeNumber(clip.pastDurationMs, 0),
      futureDurationMs: safeNumber(clip.futureDurationMs, 0),
      capturedAtLocalTimestampMs: safeNumber(
        clip.capturedAtLocalTimestampMs,
        safeNowMs()
      ),
      status: normalizeClipStatus(clip.status),
    };
  }

  function normalizeConfidence(value) {
    return value === "high" || value === "medium" || value === "low"
      ? value
      : "low";
  }

  function normalizeClipStatus(value) {
    return value === "captured" ||
      value === "capture_failed" ||
      value === "capture_partial"
      ? value
      : "capture_partial";
  }

  function clonePackage(packageState = {}) {
    return {
      packageId: safeString(packageState.packageId) || "ow-capture-unknown",
      source: "overwolf",
      ...(safeString(packageState.matchIdGuess)
        ? { matchIdGuess: safeString(packageState.matchIdGuess) }
        : {}),
      ...(safeString(packageState.puuidGuess)
        ? { puuidGuess: safeString(packageState.puuidGuess) }
        : {}),
      ...(safeString(packageState.gameNameGuess)
        ? { gameNameGuess: safeString(packageState.gameNameGuess) }
        : {}),
      ...(safeString(packageState.tagLineGuess)
        ? { tagLineGuess: safeString(packageState.tagLineGuess) }
        : {}),
      ...(safeString(packageState.clientVersion)
        ? { clientVersion: safeString(packageState.clientVersion) }
        : {}),
      events: Array.isArray(packageState.events) ? [...packageState.events] : [],
      clips: Array.isArray(packageState.clips) ? [...packageState.clips] : [],
      collectedAtLocalTimestampMs: safeNumber(
        packageState.collectedAtLocalTimestampMs,
        safeNowMs()
      ),
    };
  }

  function safeString(value) {
    return typeof value === "string" && value.trim().length > 0
      ? value.trim()
      : undefined;
  }

  function safeNumber(value, fallback) {
    return typeof value === "number" && Number.isFinite(value)
      ? value
      : fallback;
  }

  const api = {
    createEmptyCapturePackage,
    addCaptureEvent,
    addClip,
    toSerializableCapturePackage,
    normalizeEventType,
    safeNowMs,
  };

  globalScope.MidLaneReviewCapturePackageBuilder = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
