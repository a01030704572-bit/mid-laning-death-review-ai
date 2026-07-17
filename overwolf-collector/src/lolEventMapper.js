(function attachLolEventMapper(globalScope) {
  const OBJECTIVE_KEYWORDS = [
    "objective",
    "dragon",
    "baron",
    "herald",
    "tower",
    "turret",
    "inhibitor",
  ];

  function normalizeLolRawEventName(rawEvent) {
    if (!rawEvent || typeof rawEvent !== "object" || Array.isArray(rawEvent)) {
      return "unknown";
    }

    const source =
      rawEvent.name ??
      rawEvent.eventName ??
      rawEvent.event ??
      rawEvent.type ??
      rawEvent.feature ??
      rawEvent.data?.name ??
      rawEvent.data?.eventName ??
      rawEvent.data?.event ??
      rawEvent.data?.type ??
      "unknown";

    return typeof source === "string" && source.trim().length > 0
      ? source.trim()
      : String(source || "unknown");
  }

  function mapLolRawEventType(rawEvent) {
    const normalizedName = normalizeLolRawEventName(rawEvent).toLowerCase();

    if (normalizedName.includes("death") || normalizedName.includes("died")) {
      return "death";
    }
    if (
      normalizedName.includes("end_game") ||
      normalizedName.includes("game_end") ||
      normalizedName.includes("match_end")
    ) {
      return "game_end";
    }
    if (OBJECTIVE_KEYWORDS.some((keyword) => normalizedName.includes(keyword))) {
      return "objective";
    }
    if (
      normalizedName.includes("kill") ||
      normalizedName.includes("takedown")
    ) {
      return "kill";
    }
    if (normalizedName.includes("assist")) {
      return "assist";
    }
    return "unknown";
  }

  function mapLolRawEventToCaptureEvent(rawEvent, options = {}) {
    const rawEventName = normalizeLolRawEventName(rawEvent);
    const type = mapLolRawEventType(rawEvent);
    const localTimestampMs =
      finiteNumber(rawEvent?.localTimestampMs) ??
      finiteNumber(rawEvent?.timestampMs) ??
      finiteNumber(rawEvent?.data?.localTimestampMs) ??
      finiteNumber(options.nowMs) ??
      Date.now();
    const estimatedGameTimeSec =
      finiteNumber(rawEvent?.estimatedGameTimeSec) ??
      finiteNumber(rawEvent?.gameTimeSec) ??
      finiteNumber(rawEvent?.data?.estimatedGameTimeSec) ??
      finiteNumber(rawEvent?.data?.gameTimeSec) ??
      finiteNumber(options.estimatedGameTimeSec);

    return {
      id: safeEventId(rawEvent, rawEventName, localTimestampMs),
      type,
      localTimestampMs,
      ...(estimatedGameTimeSec !== undefined ? { estimatedGameTimeSec } : {}),
      confidence: confidenceForType(type),
      rawEventName,
      summaryKo: summaryForType(type),
    };
  }

  function mapLolRawEventsToCaptureEvents(rawEvents, options = {}) {
    if (!Array.isArray(rawEvents)) {
      return [mapLolRawEventToCaptureEvent(rawEvents, options)];
    }

    return rawEvents.map((rawEvent, index) =>
      mapLolRawEventToCaptureEvent(rawEvent, {
        ...options,
        sequenceIndex: index,
      })
    );
  }

  function safeEventId(rawEvent, rawEventName, localTimestampMs) {
    const explicitId = stringValue(rawEvent?.id) ?? stringValue(rawEvent?.eventId);
    if (explicitId) return explicitId;

    const normalizedName = String(rawEventName || "unknown")
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);
    return `lol-event-${localTimestampMs}-${normalizedName || "unknown"}`;
  }

  function confidenceForType(type) {
    if (type === "death" || type === "kill" || type === "game_end") {
      return "high";
    }
    if (type === "assist" || type === "objective") return "medium";
    return "low";
  }

  function summaryForType(type) {
    switch (type) {
      case "death":
        return "사망 후보 이벤트입니다.";
      case "kill":
        return "킬 관련 후보 이벤트입니다.";
      case "assist":
        return "어시스트 관련 후보 이벤트입니다.";
      case "objective":
        return "오브젝트 관련 후보 이벤트입니다.";
      case "game_end":
        return "게임 종료 후보 이벤트입니다.";
      default:
        return "분류되지 않은 게임 이벤트 후보입니다.";
    }
  }

  function finiteNumber(value) {
    return typeof value === "number" && Number.isFinite(value)
      ? value
      : undefined;
  }

  function stringValue(value) {
    return typeof value === "string" && value.trim().length > 0
      ? value.trim()
      : undefined;
  }

  const api = {
    normalizeLolRawEventName,
    mapLolRawEventType,
    mapLolRawEventToCaptureEvent,
    mapLolRawEventsToCaptureEvents,
  };

  globalScope.MidLaneReviewLolEventMapper = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
