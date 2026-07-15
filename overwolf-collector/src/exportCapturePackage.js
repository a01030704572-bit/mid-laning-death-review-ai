(function attachCapturePackageExport(globalScope) {
  function getCurrentCapturePackageJson(packageState, options = {}) {
    const serializable = toSerializablePackage(packageState);
    const space =
      typeof options.space === "number" && Number.isFinite(options.space)
        ? options.space
        : 2;

    return JSON.stringify(serializable, null, space);
  }

  async function copyCapturePackageToClipboard(packageState, callbacks = {}) {
    if (
      !globalScope.navigator ||
      !globalScope.navigator.clipboard ||
      typeof globalScope.navigator.clipboard.writeText !== "function"
    ) {
      const result = { ok: false, status: "clipboard_unavailable" };
      if (typeof callbacks.onSkipped === "function") callbacks.onSkipped(result);
      return result;
    }

    try {
      await globalScope.navigator.clipboard.writeText(
        getCurrentCapturePackageJson(packageState)
      );
      const result = { ok: true, status: "copied" };
      if (typeof callbacks.onCopied === "function") callbacks.onCopied(result);
      return result;
    } catch (error) {
      const result = {
        ok: false,
        status: "copy_failed",
        reason: error instanceof Error ? error.message : "unknown_error",
      };
      if (typeof callbacks.onError === "function") callbacks.onError(result);
      return result;
    }
  }

  function downloadCapturePackageJson(packageState, options = {}) {
    if (
      !globalScope.document ||
      typeof globalScope.Blob !== "function" ||
      !globalScope.URL ||
      typeof globalScope.URL.createObjectURL !== "function"
    ) {
      return { ok: false, status: "download_unavailable" };
    }

    const filename =
      safeFilename(options.filename) || "mid-lane-review-capture-package.json";
    const blob = new globalScope.Blob([getCurrentCapturePackageJson(packageState)], {
      type: "application/json",
    });
    const url = globalScope.URL.createObjectURL(blob);
    const anchor = globalScope.document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    globalScope.URL.revokeObjectURL(url);

    return { ok: true, status: "download_started", filename };
  }

  function toSerializablePackage(packageState = {}) {
    const builder = globalScope.MidLaneReviewCapturePackageBuilder;
    if (builder && typeof builder.toSerializableCapturePackage === "function") {
      return stripUnsafePackageFields(
        builder.toSerializableCapturePackage(packageState)
      );
    }

    return stripUnsafePackageFields(packageState);
  }

  function stripUnsafePackageFields(packageState = {}) {
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
      events: Array.isArray(packageState.events)
        ? packageState.events.map(stripUnsafeEventFields).filter(Boolean)
        : [],
      clips: Array.isArray(packageState.clips)
        ? packageState.clips.map(stripUnsafeClipFields).filter(Boolean)
        : [],
      collectedAtLocalTimestampMs: safeNumber(
        packageState.collectedAtLocalTimestampMs,
        0
      ),
    };
  }

  function stripUnsafeEventFields(event = {}) {
    const id = safeString(event.id);
    if (!id) return null;

    return {
      id,
      type: normalizeEventType(event.type),
      localTimestampMs: safeNumber(event.localTimestampMs, 0),
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

  function stripUnsafeClipFields(clip = {}) {
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
        0
      ),
      status: normalizeClipStatus(clip.status),
    };
  }

  function normalizeEventType(value) {
    return [
      "death",
      "solo_kill",
      "kill",
      "assist",
      "objective",
      "recall",
      "unknown",
    ].includes(value)
      ? value
      : "unknown";
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

  function safeFilename(value) {
    const name = safeString(value);
    if (!name) return undefined;
    return name.replace(/[^a-zA-Z0-9._-]/g, "-");
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
    getCurrentCapturePackageJson,
    copyCapturePackageToClipboard,
    downloadCapturePackageJson,
  };

  globalScope.MidLaneReviewCapturePackageExport = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
