const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const mapper = require(path.join(
  process.cwd(),
  "overwolf-collector",
  "src",
  "lolEventMapper.js"
));
const builder = require(path.join(
  process.cwd(),
  "overwolf-collector",
  "src",
  "capturePackageBuilder.js"
));

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
        `Unexpected runtime dependency in Overwolf LoL event mapper fixture: ${moduleName}`
      );
    },
    loadedModule,
    loadedModule.exports
  );

  return loadedModule.exports;
}

const { validateOverwolfCapturePackage } = loadTypeScriptModule(
  "lib/overwolfCaptureValidation.ts"
);

test("death keyword maps to death with high confidence", () => {
  const event = mapper.mapLolRawEventToCaptureEvent({
    name: "player_died",
    localTimestampMs: 1_000,
  });

  assert.equal(event.type, "death");
  assert.equal(event.confidence, "high");
  assert.match(event.summaryKo, /사망/);
});

test("kill and takedown keywords map to kill", () => {
  assert.equal(
    mapper.mapLolRawEventToCaptureEvent({ eventName: "champion_kill" }).type,
    "kill"
  );
  assert.equal(
    mapper.mapLolRawEventToCaptureEvent({ eventName: "champion_takedown" }).type,
    "kill"
  );
});

test("assist maps to assist", () => {
  const event = mapper.mapLolRawEventToCaptureEvent({ type: "assist_event" });

  assert.equal(event.type, "assist");
  assert.equal(event.confidence, "medium");
});

test("objective keywords map to objective", () => {
  for (const name of [
    "dragon_kill",
    "baron_taken",
    "herald_spawn",
    "tower_destroyed",
    "turret_plate",
    "inhibitor_destroyed",
    "objective_event",
  ]) {
    assert.equal(
      mapper.mapLolRawEventToCaptureEvent({ name }).type,
      "objective",
      name
    );
  }
});

test("end_game and match_end map to game_end", () => {
  assert.equal(
    mapper.mapLolRawEventToCaptureEvent({ feature: "end_game" }).type,
    "game_end"
  );
  assert.equal(
    mapper.mapLolRawEventToCaptureEvent({ feature: "match_end" }).type,
    "game_end"
  );
});

test("unknown maps to unknown with low confidence", () => {
  const event = mapper.mapLolRawEventToCaptureEvent({
    name: "unmapped_fixture_event",
  });

  assert.equal(event.type, "unknown");
  assert.equal(event.confidence, "low");
});

test("mapLolRawEventToCaptureEvent returns validator-compatible event shape", () => {
  const event = mapper.mapLolRawEventToCaptureEvent({
    id: "raw-death-1",
    name: "death",
    localTimestampMs: 1_000,
    estimatedGameTimeSec: 548,
  });

  assert.equal(event.id, "raw-death-1");
  assert.equal(event.localTimestampMs, 1_000);
  assert.equal(event.estimatedGameTimeSec, 548);
  assert.equal(typeof event.rawEventName, "string");
  assert.equal("raw" in event, false);
});

test("mapped events can be added to capturePackageBuilder and validated", () => {
  const rawEvents = [
    { id: "raw-death", name: "death", localTimestampMs: 1_000 },
    { id: "raw-kill", name: "kill", localTimestampMs: 2_000 },
    { id: "raw-end", name: "game_end", localTimestampMs: 3_000 },
  ];
  const events = mapper.mapLolRawEventsToCaptureEvents(rawEvents);
  const packageState = events.reduce(
    (state, event) => builder.addCaptureEvent(state, event),
    builder.createEmptyCapturePackage({
      packageId: "lol-mapped-package",
      collectedAtLocalTimestampMs: 4_000,
    })
  );

  const result = validateOverwolfCapturePackage(packageState);

  assert.equal(result.safe, true);
  assert.equal(result.session.status, "validated");
  assert.deepEqual(
    result.session.sourcePackage.events.map((event) => event.type),
    ["death", "kill", "game_end"]
  );
});

test("raw payload and local path fields are not included", () => {
  const event = mapper.mapLolRawEventToCaptureEvent({
    id: "raw-1",
    name: "death",
    localTimestampMs: 1_000,
    raw: { secret: true },
    filePathOrUrl: "C:\\Users\\private\\clip.mp4",
  });
  const serialized = JSON.stringify(event);

  assert.equal("raw" in event, false);
  assert.doesNotMatch(serialized, /filePathOrUrl/);
  assert.doesNotMatch(serialized, /private\\clip/);
  assert.doesNotMatch(serialized, /secret/);
});

test("input mutation is not performed", () => {
  const raw = {
    id: "raw-1",
    name: "dragon_objective",
    localTimestampMs: 1_000,
    data: { gameTimeSec: 600 },
  };
  const before = structuredClone(raw);

  mapper.mapLolRawEventToCaptureEvent(raw);

  assert.deepEqual(raw, before);
});

test("mapper does not throw on null, string, number, or malformed object", () => {
  for (const value of [null, "death", 123, { data: { name: "baron" } }]) {
    assert.doesNotThrow(() => mapper.mapLolRawEventToCaptureEvent(value));
  }
});

test("sample raw event fixture maps to stable capture event candidates", () => {
  const rawEvents = JSON.parse(
    fs.readFileSync(
      path.join(
        process.cwd(),
        "overwolf-collector",
        "samples",
        "sample-raw-lol-events.json"
      ),
      "utf8"
    )
  );
  const events = mapper.mapLolRawEventsToCaptureEvents(rawEvents);

  assert.deepEqual(
    events.map((event) => event.type),
    ["death", "kill", "objective", "game_end", "unknown"]
  );
});
