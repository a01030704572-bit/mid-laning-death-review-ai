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
    const mapper = globalScope.MidLaneReviewLolEventMapper;

    if (mapper && typeof mapper.mapLolRawEventToCaptureEvent === "function") {
      return mapper.mapLolRawEventToCaptureEvent(firstEvent);
    }

    return {
      id: `lol-event-${Date.now()}-unknown`,
      type: "unknown",
      localTimestampMs: Date.now(),
      confidence: "low",
      rawEventName: "unknown",
      summaryKo: "분류되지 않은 게임 이벤트 후보입니다.",
    };
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
