(function attachGameEvents(globalScope) {
  let registeredCallback = null;

  function registerGameEventsListeners(callbacks = {}) {
    if (!hasGameEventsApi()) {
      console.log(
        "[Mid Lane Review Companion] Overwolf game events API is unavailable. Skipping registration."
      );
      return { registered: false, reason: "overwolf_game_events_unavailable" };
    }

    registeredCallback = function onGameEvent(event) {
      const mappedEvent = mapGameEventToCaptureEvent(event);
      if (mappedEvent && typeof callbacks.onCaptureEvent === "function") {
        callbacks.onCaptureEvent(mappedEvent);
      }
    };

    // TODO: Register League of Legends feature sets after Overwolf whitelist is available.
    globalScope.overwolf.games.events.onNewEvents.addListener(registeredCallback);
    console.log("[Mid Lane Review Companion] Game event listener registered.");
    return { registered: true };
  }

  function unregisterGameEventsListeners() {
    if (!registeredCallback || !hasGameEventsApi()) {
      registeredCallback = null;
      return { unregistered: false };
    }

    globalScope.overwolf.games.events.onNewEvents.removeListener(
      registeredCallback
    );
    registeredCallback = null;
    console.log("[Mid Lane Review Companion] Game event listener removed.");
    return { unregistered: true };
  }

  function mapGameEventToCaptureEvent(event) {
    const firstEvent = Array.isArray(event?.events) ? event.events[0] : event;
    const rawName = firstEvent?.name || firstEvent?.event || "unknown";
    const type = inferCaptureEventType(rawName);

    return {
      id: `ow-event-${Date.now()}-${String(rawName)}`,
      type,
      localTimestampMs: Date.now(),
      confidence: type === "unknown" ? "low" : "medium",
      rawEventName: String(rawName),
      summaryKo: "Overwolf game event 후보입니다. 실제 매핑은 추후 보강이 필요합니다.",
    };
  }

  function inferCaptureEventType(rawName) {
    const value = String(rawName).toLowerCase();
    if (value.includes("death")) return "death";
    if (value.includes("kill")) return "kill";
    if (value.includes("assist")) return "assist";
    if (
      value.includes("dragon") ||
      value.includes("baron") ||
      value.includes("objective")
    ) {
      return "objective";
    }
    if (value.includes("recall")) return "recall";
    return "unknown";
  }

  function hasGameEventsApi() {
    return Boolean(
      globalScope.overwolf &&
        globalScope.overwolf.games &&
        globalScope.overwolf.games.events &&
        globalScope.overwolf.games.events.onNewEvents &&
        typeof globalScope.overwolf.games.events.onNewEvents.addListener ===
          "function" &&
        typeof globalScope.overwolf.games.events.onNewEvents.removeListener ===
          "function"
    );
  }

  const api = {
    registerGameEventsListeners,
    unregisterGameEventsListeners,
    mapGameEventToCaptureEvent,
  };

  globalScope.MidLaneReviewGameEvents = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
