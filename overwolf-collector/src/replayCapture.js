(function attachReplayCapture(globalScope) {
  function requestReplayClipCapture(options = {}, callbacks = {}) {
    if (!hasReplayApi()) {
      const result = {
        status: "capture_failed",
        reason: "overwolf_replay_unavailable",
        summaryKo:
          "Overwolf replay capture API를 사용할 수 없어 클립 저장을 건너뜁니다.",
      };
      if (typeof callbacks.onSkipped === "function") callbacks.onSkipped(result);
      return result;
    }

    // TODO: Wire actual replay capture after Overwolf whitelist and clip storage model are connected.
    const skipped = {
      status: "capture_failed",
      reason: "replay_capture_not_implemented",
      triggerEventId: options.triggerEventId,
      summaryKo: "Replay capture는 아직 skeleton 단계라 실행하지 않습니다.",
    };
    if (typeof callbacks.onSkipped === "function") callbacks.onSkipped(skipped);
    return skipped;
  }

  function hasReplayApi() {
    return Boolean(
      globalScope.overwolf &&
        globalScope.overwolf.media &&
        globalScope.overwolf.media.replays
    );
  }

  const api = {
    requestReplayClipCapture,
  };

  globalScope.MidLaneReviewReplayCapture = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
