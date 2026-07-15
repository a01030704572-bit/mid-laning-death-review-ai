(function attachLauncherEvents(globalScope) {
  let registeredCallback = null;

  function registerLauncherEventsListeners(callbacks = {}) {
    if (!hasLauncherApi()) {
      console.log(
        "[Mid Lane Review Companion] Overwolf launcher API is unavailable. Skipping registration."
      );
      return { registered: false, reason: "overwolf_launcher_unavailable" };
    }

    registeredCallback = function onLauncherEvent(event) {
      if (typeof callbacks.onLauncherEvent === "function") {
        callbacks.onLauncherEvent({
          localTimestampMs: Date.now(),
          summaryKo:
            "Overwolf launcher event 후보입니다. LoL launcher 매핑은 추후 보강이 필요합니다.",
          event,
        });
      }
    };

    // TODO: Add LoL launcher/end_game/summoner feature handling after whitelist access.
    globalScope.overwolf.games.launchers.events.onInfoUpdates.addListener(
      registeredCallback
    );
    console.log("[Mid Lane Review Companion] Launcher listener registered.");
    return { registered: true };
  }

  function unregisterLauncherEventsListeners() {
    if (!registeredCallback || !hasLauncherApi()) {
      registeredCallback = null;
      return { unregistered: false };
    }

    globalScope.overwolf.games.launchers.events.onInfoUpdates.removeListener(
      registeredCallback
    );
    registeredCallback = null;
    console.log("[Mid Lane Review Companion] Launcher listener removed.");
    return { unregistered: true };
  }

  function hasLauncherApi() {
    return Boolean(
      globalScope.overwolf &&
        globalScope.overwolf.games &&
        globalScope.overwolf.games.launchers &&
        globalScope.overwolf.games.launchers.events &&
        globalScope.overwolf.games.launchers.events.onInfoUpdates &&
        typeof globalScope.overwolf.games.launchers.events.onInfoUpdates
          .addListener === "function" &&
        typeof globalScope.overwolf.games.launchers.events.onInfoUpdates
          .removeListener === "function"
    );
  }

  const api = {
    registerLauncherEventsListeners,
    unregisterLauncherEventsListeners,
  };

  globalScope.MidLaneReviewLauncherEvents = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
