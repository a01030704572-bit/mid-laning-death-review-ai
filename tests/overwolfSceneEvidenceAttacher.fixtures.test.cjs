/* eslint-disable @typescript-eslint/no-require-imports -- Node fixture harness transpiles the real TypeScript module without adding a test dependency. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

function loadTypeScriptModule(relativePath, dependencies = {}) {
  const absolutePath = path.join(process.cwd(), relativePath);
  const source = fs.readFileSync(absolutePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  const loadedModule = { exports: {} };

  new Function("require", "module", "exports", output)(
    (moduleName) => {
      if (dependencies[moduleName]) return dependencies[moduleName];
      throw new Error(
        `Unexpected runtime dependency in Overwolf attacher fixture: ${moduleName}`
      );
    },
    loadedModule,
    loadedModule.exports
  );

  return loadedModule.exports;
}

function makeEvent(overrides = {}) {
  return {
    id: overrides.id ?? "ow-event-1",
    type: overrides.type ?? "death",
    localTimestampMs: overrides.localTimestampMs ?? 1_000,
    estimatedGameTimeSec: overrides.estimatedGameTimeSec ?? 548,
    confidence: overrides.confidence ?? "high",
    summaryKo: overrides.summaryKo ?? "Overwolf event",
    raw: overrides.raw ?? { heavy: true },
  };
}

function makeClip(eventId, overrides = {}) {
  return {
    id: overrides.id ?? `clip-${eventId}`,
    triggerEventId: eventId,
    filePathOrUrl: overrides.filePathOrUrl ?? `file:///clips/${eventId}.mp4`,
    pastDurationMs: overrides.pastDurationMs ?? 15_000,
    futureDurationMs: overrides.futureDurationMs ?? 10_000,
    capturedAtLocalTimestampMs: overrides.capturedAtLocalTimestampMs ?? 1_500,
    status: overrides.status ?? "captured",
  };
}

function makePackage(events = [], clips = []) {
  return {
    packageId: "ow-package",
    source: "overwolf",
    events,
    clips,
    collectedAtLocalTimestampMs: 2_000,
  };
}

function makeScene(overrides = {}) {
  return {
    sceneId: overrides.sceneId ?? "scene-1",
    matchId: "KR_1",
    gameTimeSec: overrides.gameTimeSec ?? 548,
    windowSec: overrides.windowSec ?? 30,
    autoSceneType: overrides.autoSceneType ?? "death_review_candidate",
    primaryScenarioId: overrides.primaryScenarioId ?? null,
    sceneValence: overrides.sceneValence ?? "bad_decision",
    reviewWorthinessScore: overrides.reviewWorthinessScore ?? 90,
    scoreBreakdown: {
      baseScore: 80,
      evidenceBoosts: [],
      totalScore: 90,
    },
    riotEvidenceSummary: [],
    displayNameKo: overrides.displayNameKo ?? "장면 후보",
    evidenceSummaryKo: overrides.evidenceSummaryKo ?? "근거 요약",
    confirmationQuestions: [],
    habitSignals: [],
  };
}

const mapperModule = loadTypeScriptModule("lib/overwolfCaptureMapper.ts");
const attacher = loadTypeScriptModule("lib/overwolfSceneEvidenceAttacher.ts", {
  "./overwolfCaptureMapper": mapperModule,
});

const {
  attachOverwolfEvidenceToRankedScenes,
  findBestVideoEvidenceForScene,
  getSceneGameTimeSec,
  inferSceneEventTypeForOverwolf,
} = attacher;

test("empty scenes returns []", () => {
  assert.deepEqual(
    attachOverwolfEvidenceToRankedScenes([], makePackage()),
    []
  );
});

test("empty package returns scenes with no videoEvidence and status not_found", () => {
  const result = attachOverwolfEvidenceToRankedScenes(
    [makeScene()],
    makePackage()
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].videoEvidence, undefined);
  assert.equal(result[0].videoEvidenceStatus, "not_found");
});

test("death scene at 548s attaches death clip at 547s", () => {
  const event = makeEvent({ id: "death-547", type: "death", estimatedGameTimeSec: 547 });
  const result = attachOverwolfEvidenceToRankedScenes(
    [makeScene({ gameTimeSec: 548, autoSceneType: "death_review_candidate" })],
    makePackage([event], [makeClip(event.id)])
  );

  assert.equal(result[0].videoEvidenceStatus, "attached");
  assert.equal(result[0].videoEvidence.sourceEvent.id, "death-547");
  assert.equal(result[0].videoEvidence.alignment.deltaSeconds, 1);
  assert.equal(result[0].videoEvidence.alignment.toleranceSecUsed, 10);
});

test("scene and clip within 30 seconds attaches as likely loose match", () => {
  const event = makeEvent({ id: "death-570", type: "death", estimatedGameTimeSec: 570 });
  const result = attachOverwolfEvidenceToRankedScenes(
    [makeScene({ gameTimeSec: 548 })],
    makePackage([event], [makeClip(event.id)])
  );

  assert.equal(result[0].videoEvidenceStatus, "attached");
  assert.equal(result[0].videoEvidence.confidence, "likely");
  assert.equal(result[0].videoEvidence.alignment.toleranceSecUsed, 30);
});

test("scene and clip outside 30 seconds does not attach", () => {
  const event = makeEvent({ id: "death-620", type: "death", estimatedGameTimeSec: 620 });
  const result = attachOverwolfEvidenceToRankedScenes(
    [makeScene({ gameTimeSec: 548 })],
    makePackage([event], [makeClip(event.id)])
  );

  assert.equal(result[0].videoEvidenceStatus, "misaligned");
  assert.equal(result[0].videoEvidence, undefined);
});

test("kill scene prefers kill clip over death clip when both are near", () => {
  const deathEvent = makeEvent({
    id: "death-547",
    type: "death",
    estimatedGameTimeSec: 547,
  });
  const killEvent = makeEvent({
    id: "kill-550",
    type: "kill",
    estimatedGameTimeSec: 550,
  });
  const result = attachOverwolfEvidenceToRankedScenes(
    [makeScene({ autoSceneType: "solo_kill_candidate", gameTimeSec: 548 })],
    makePackage(
      [deathEvent, killEvent],
      [makeClip(deathEvent.id), makeClip(killEvent.id)]
    )
  );

  assert.equal(result[0].videoEvidenceStatus, "attached");
  assert.equal(result[0].videoEvidence.sourceEvent.id, "kill-550");
});

test("unknown scene type can still attach by time with cautious note", () => {
  const event = makeEvent({ id: "unknown-near", type: "objective", estimatedGameTimeSec: 548 });
  const result = attachOverwolfEvidenceToRankedScenes(
    [makeScene({ autoSceneType: "unknown_candidate", gameTimeSec: 548 })],
    makePackage([event], [makeClip(event.id)])
  );

  assert.equal(result[0].videoEvidenceStatus, "attached");
  assert.match(result[0].videoEvidence.noteKo, /시간상 가까운 영상 근거/);
});

test("helper does not mutate input scenes", () => {
  const scene = makeScene();
  const event = makeEvent();
  const scenes = [scene];
  const before = structuredClone(scenes);

  attachOverwolfEvidenceToRankedScenes(
    scenes,
    makePackage([event], [makeClip(event.id)])
  );

  assert.deepEqual(scenes, before);
});

test("output does not include raw payload", () => {
  const event = makeEvent({ raw: { large: "payload" } });
  const result = attachOverwolfEvidenceToRankedScenes(
    [makeScene()],
    makePackage([event], [makeClip(event.id)])
  );

  assert.equal("raw" in result[0].videoEvidence.sourceEvent, false);
});

test("deterministic output", () => {
  const event = makeEvent();
  const pkg = makePackage([event], [makeClip(event.id)]);
  const scenes = [makeScene()];

  assert.deepEqual(
    attachOverwolfEvidenceToRankedScenes(scenes, pkg),
    attachOverwolfEvidenceToRankedScenes(scenes, pkg)
  );
});

test("scene helper extracts direct and reviewSeed game time", () => {
  assert.equal(getSceneGameTimeSec({ gameTimeSec: 123 }), 123);
  assert.equal(getSceneGameTimeSec({ reviewSeed: { gameTimeSec: 456 } }), 456);
  assert.equal(getSceneGameTimeSec({}), undefined);
});

test("event type inference remains conservative", () => {
  assert.equal(
    inferSceneEventTypeForOverwolf({ autoSceneType: "jungle_gank_death_candidate" }),
    "death"
  );
  assert.equal(
    inferSceneEventTypeForOverwolf({ autoSceneType: "post_kill_conversion_candidate" }),
    "kill"
  );
  assert.equal(
    inferSceneEventTypeForOverwolf({ autoSceneType: "tempo_loss_candidate" }),
    "unknown"
  );
});

test("missing scene time returns unknown status", () => {
  const event = makeEvent();
  const result = findBestVideoEvidenceForScene(
    {
      ...makeScene(),
      gameTimeSec: undefined,
    },
    mapperModule.mapOverwolfPackageToSceneVideoEvidence(
      makePackage([event], [makeClip(event.id)])
    )
  );

  assert.equal(result.videoEvidenceStatus, "unknown");
});
