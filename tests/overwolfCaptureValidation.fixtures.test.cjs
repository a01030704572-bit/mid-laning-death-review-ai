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
        `Unexpected runtime dependency in Overwolf validation fixture: ${moduleName}`
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

function validPackage(overrides = {}) {
  return {
    packageId: "fixture-package",
    source: "overwolf",
    matchIdGuess: "KR_1",
    puuidGuess: "puuid",
    gameNameGuess: "MidReviewer",
    tagLineGuess: "KR1",
    clientVersion: "fixture",
    collectedAtLocalTimestampMs: 1_000,
    events: [
      {
        id: "event-1",
        type: "death",
        localTimestampMs: 900,
        estimatedGameTimeSec: 600,
        confidence: "high",
        rawEventName: "death",
        summaryKo: "death event",
        raw: { shouldNotPersist: true },
        unknownEventField: "remove me",
      },
    ],
    clips: [
      {
        id: "clip-1",
        triggerEventId: "event-1",
        filePathOrUrl: "file:///local/private/path.mp4",
        pastDurationMs: 15_000,
        futureDurationMs: 10_000,
        capturedAtLocalTimestampMs: 950,
        status: "captured",
        unknownClipField: "remove me",
      },
    ],
    unknownPackageField: "remove me",
    ...overrides,
  };
}

function issueFields(result) {
  return result.session.validationIssues.map((issue) => issue.field);
}

test("valid Overwolf fixture-like package passes", () => {
  const result = validateOverwolfCapturePackage(validPackage());

  assert.equal(result.safe, true);
  assert.equal(result.session.status, "validated");
  assert.equal(result.session.sessionId, "capture-session:fixture-package");
  assert.ok(result.session.sourcePackage);
});

test("missing packageId rejects", () => {
  const result = validateOverwolfCapturePackage(
    validPackage({ packageId: undefined })
  );

  assert.equal(result.safe, false);
  assert.equal(result.session.status, "rejected");
  assert.ok(issueFields(result).includes("packageId"));
});

test("missing events rejects", () => {
  const result = validateOverwolfCapturePackage(
    validPackage({ events: undefined })
  );

  assert.equal(result.safe, false);
  assert.ok(issueFields(result).includes("events"));
});

test("missing clips rejects", () => {
  const result = validateOverwolfCapturePackage(
    validPackage({ clips: undefined })
  );

  assert.equal(result.safe, false);
  assert.ok(issueFields(result).includes("clips"));
});

test("too many events rejects", () => {
  const events = Array.from({ length: 201 }, (_, index) => ({
    ...validPackage().events[0],
    id: `event-${index}`,
  }));
  const result = validateOverwolfCapturePackage(validPackage({ events }));

  assert.equal(result.safe, false);
  assert.ok(issueFields(result).includes("events"));
});

test("too many clips rejects", () => {
  const clips = Array.from({ length: 201 }, (_, index) => ({
    ...validPackage().clips[0],
    id: `clip-${index}`,
  }));
  const result = validateOverwolfCapturePackage(validPackage({ clips }));

  assert.equal(result.safe, false);
  assert.ok(issueFields(result).includes("clips"));
});

test("malformed event does not throw and rejects", () => {
  const result = validateOverwolfCapturePackage(
    validPackage({ events: [{ id: "", type: "death" }] })
  );

  assert.equal(result.safe, false);
  assert.ok(issueFields(result).some((field) => field.startsWith("events[0]")));
});

test("unknown event type rejects", () => {
  const result = validateOverwolfCapturePackage(
    validPackage({ events: [{ ...validPackage().events[0], type: "bad_type" }] })
  );

  assert.equal(result.safe, false);
  assert.ok(issueFields(result).includes("events[0].type"));
});

test("malformed clip does not throw and rejects", () => {
  const result = validateOverwolfCapturePackage(
    validPackage({ clips: [{ id: "clip" }] })
  );

  assert.equal(result.safe, false);
  assert.ok(issueFields(result).some((field) => field.startsWith("clips[0]")));
});

test("invalid clip status rejects", () => {
  const result = validateOverwolfCapturePackage(
    validPackage({ clips: [{ ...validPackage().clips[0], status: "bad_status" }] })
  );

  assert.equal(result.safe, false);
  assert.ok(issueFields(result).includes("clips[0].status"));
});

test("negative estimatedGameTimeSec rejects", () => {
  const result = validateOverwolfCapturePackage(
    validPackage({
      events: [{ ...validPackage().events[0], estimatedGameTimeSec: -1 }],
    })
  );

  assert.equal(result.safe, false);
  assert.ok(issueFields(result).includes("events[0].estimatedGameTimeSec"));
});

test("unknown fields are removed from safe sourcePackage", () => {
  const result = validateOverwolfCapturePackage(validPackage());
  const sourcePackage = result.session.sourcePackage;

  assert.equal(result.safe, true);
  assert.equal("unknownPackageField" in sourcePackage, false);
  assert.equal("unknownEventField" in sourcePackage.events[0], false);
  assert.equal("unknownClipField" in sourcePackage.clips[0], false);
});

test("raw payload fields are stripped", () => {
  const result = validateOverwolfCapturePackage(validPackage());

  assert.equal(result.safe, true);
  assert.equal("raw" in result.session.sourcePackage.events[0], false);
});

test("local path fields are not preserved", () => {
  const result = validateOverwolfCapturePackage(validPackage());

  assert.equal(result.safe, true);
  assert.equal("filePathOrUrl" in result.session.sourcePackage.clips[0], false);
});

test("deterministic important output fields", () => {
  const first = validateOverwolfCapturePackage(validPackage());
  const second = validateOverwolfCapturePackage(validPackage());

  assert.equal(first.session.sessionId, second.session.sessionId);
  assert.equal(
    first.session.receivedAtIsoTimestamp,
    second.session.receivedAtIsoTimestamp
  );
  assert.deepEqual(first.session.sourcePackage, second.session.sourcePackage);
});
