(function startCollector(globalScope) {
  function getBuilder() {
    return globalScope.MidLaneReviewCapturePackageBuilder;
  }

  function getGameEvents() {
    return globalScope.MidLaneReviewGameEvents;
  }

  function getLauncherEvents() {
    return globalScope.MidLaneReviewLauncherEvents;
  }

  const builder = getBuilder();
  if (!builder) {
    console.log(
      "[Mid Lane Review Companion] capturePackageBuilder.js must be loaded before background.js."
    );
    return;
  }

  let capturePackage = builder.createEmptyCapturePackage({
    clientVersion: "overwolf-skeleton-0.0.1",
  });

  function exposeDebugPackage() {
    globalScope.__MID_LANE_REVIEW_CAPTURE_PACKAGE__ =
      builder.toSerializableCapturePackage(capturePackage);
  }

  function handleCaptureEvent(event) {
    capturePackage = builder.addCaptureEvent(capturePackage, event);
    exposeDebugPackage();
    console.log("[Mid Lane Review Companion] Capture event candidate added.", {
      type: event.type,
      id: event.id,
    });
  }

  function handleLauncherEvent(event) {
    console.log("[Mid Lane Review Companion] Launcher event candidate observed.", {
      summaryKo: event.summaryKo,
    });
  }

  exposeDebugPackage();

  const gameRegistration = getGameEvents()?.registerGameEventsListeners({
    onCaptureEvent: handleCaptureEvent,
  });
  const launcherRegistration = getLauncherEvents()?.registerLauncherEventsListeners({
    onLauncherEvent: handleLauncherEvent,
  });

  console.log("[Mid Lane Review Companion] Collector skeleton started.", {
    gameEventsRegistered: Boolean(gameRegistration?.registered),
    launcherEventsRegistered: Boolean(launcherRegistration?.registered),
  });
})(typeof window !== "undefined" ? window : globalThis);
