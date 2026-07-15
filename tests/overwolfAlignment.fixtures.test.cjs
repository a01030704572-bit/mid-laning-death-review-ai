/* eslint-disable @typescript-eslint/no-require-imports -- Node fixture harness transpiles the real TypeScript module without adding a test dependency. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

function loadTypeScriptModule(relativePath) {
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
      throw new Error(
        `Unexpected runtime dependency in Overwolf alignment fixture: ${moduleName}`
      );
    },
    loadedModule,
    loadedModule.exports
  );

  return loadedModule.exports;
}

const { alignOverwolfEventWithRiotTimeline } = loadTypeScriptModule(
  "lib/overwolfAlignment.ts"
);

function overwolfEvent(overrides = {}) {
  return {
    id: "ow-event-1",
    type: "death",
    localTimestampMs: 1_000,
    estimatedGameTimeSec: 600,
    confidence: "high",
    ...overrides,
  };
}

test("event within 10 seconds aligns as confirmed", () => {
  const result = alignOverwolfEventWithRiotTimeline(overwolfEvent(), [
    { id: "riot-death-1", timestampSec: 606, kind: "death" },
  ]);

  assert.equal(result.status, "aligned");
  assert.equal(result.confidence, "confirmed");
  assert.equal(result.toleranceSecUsed, 10);
  assert.equal(result.deltaSeconds, 6);
  assert.equal(result.matchedRiotEventId, "riot-death-1");
});

test("event within 30 seconds aligns as likely", () => {
  const result = alignOverwolfEventWithRiotTimeline(overwolfEvent(), [
    { timestamp: 625_000, type: "CHAMPION_KILL" },
  ]);

  assert.equal(result.status, "aligned");
  assert.equal(result.confidence, "likely");
  assert.equal(result.toleranceSecUsed, 30);
  assert.equal(result.deltaSeconds, 25);
});

test("event outside 30 seconds is misaligned", () => {
  const result = alignOverwolfEventWithRiotTimeline(overwolfEvent(), [
    { gameTimeSec: 640, type: "CHAMPION_KILL" },
  ]);

  assert.equal(result.status, "misaligned");
  assert.equal(result.confidence, "unconfirmed");
  assert.equal(result.deltaSeconds, 40);
  assert.equal(result.toleranceSecUsed, undefined);
});

test("missing estimated time returns unknown", () => {
  const result = alignOverwolfEventWithRiotTimeline(
    overwolfEvent({ estimatedGameTimeSec: undefined }),
    [{ timestampSec: 600, kind: "death" }]
  );

  assert.equal(result.status, "unknown");
  assert.equal(result.confidence, "unconfirmed");
  assert.equal(result.deltaSeconds, undefined);
});

test("missing Riot event time returns unknown", () => {
  const result = alignOverwolfEventWithRiotTimeline(overwolfEvent(), [
    { type: "CHAMPION_KILL" },
  ]);

  assert.equal(result.status, "unknown");
  assert.equal(result.confidence, "unconfirmed");
});
