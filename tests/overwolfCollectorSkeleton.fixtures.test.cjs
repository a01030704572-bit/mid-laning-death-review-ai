const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const builder = require(path.join(
  process.cwd(),
  "overwolf-collector",
  "src",
  "capturePackageBuilder.js"
));

test("createEmptyCapturePackage returns OverwolfCapturePackage-compatible shape", () => {
  const pkg = builder.createEmptyCapturePackage({
    packageId: "package-1",
    collectedAtLocalTimestampMs: 1_000,
    clientVersion: "test",
  });

  assert.equal(pkg.packageId, "package-1");
  assert.equal(pkg.source, "overwolf");
  assert.equal(pkg.clientVersion, "test");
  assert.deepEqual(pkg.events, []);
  assert.deepEqual(pkg.clips, []);
  assert.equal(pkg.collectedAtLocalTimestampMs, 1_000);
});

test("addCaptureEvent returns a new package and strips raw payload", () => {
  const pkg = builder.createEmptyCapturePackage({
    packageId: "package-1",
    collectedAtLocalTimestampMs: 1_000,
  });
  const next = builder.addCaptureEvent(pkg, {
    id: "event-1",
    type: "death",
    localTimestampMs: 2_000,
    estimatedGameTimeSec: 548,
    confidence: "high",
    rawEventName: "death",
    summaryKo: "death candidate",
    raw: { shouldNotPersist: true },
  });

  assert.notEqual(next, pkg);
  assert.equal(pkg.events.length, 0);
  assert.equal(next.events.length, 1);
  assert.equal(next.events[0].type, "death");
  assert.equal("raw" in next.events[0], false);
});

test("addClip returns a new package and strips local paths", () => {
  const pkg = builder.createEmptyCapturePackage({
    packageId: "package-1",
    collectedAtLocalTimestampMs: 1_000,
  });
  const next = builder.addClip(pkg, {
    id: "clip-1",
    triggerEventId: "event-1",
    filePathOrUrl: "C:\\Users\\private\\clip.mp4",
    pastDurationMs: 15_000,
    futureDurationMs: 10_000,
    capturedAtLocalTimestampMs: 2_000,
    status: "captured",
  });

  assert.notEqual(next, pkg);
  assert.equal(pkg.clips.length, 0);
  assert.equal(next.clips.length, 1);
  assert.equal(next.clips[0].triggerEventId, "event-1");
  assert.equal("filePathOrUrl" in next.clips[0], false);
  assert.doesNotMatch(JSON.stringify(next), /private\\clip/);
});

test("unknown event type normalizes to unknown", () => {
  assert.equal(builder.normalizeEventType("unsupported_event"), "unknown");
});

test("toSerializableCapturePackage is deterministic for stable input", () => {
  const pkg = builder.addClip(
    builder.addCaptureEvent(
      builder.createEmptyCapturePackage({
        packageId: "package-1",
        collectedAtLocalTimestampMs: 1_000,
      }),
      {
        id: "event-1",
        type: "kill",
        localTimestampMs: 2_000,
        confidence: "medium",
      }
    ),
    {
      id: "clip-1",
      triggerEventId: "event-1",
      pastDurationMs: 1_000,
      futureDurationMs: 1_000,
      capturedAtLocalTimestampMs: 2_000,
      status: "capture_partial",
    }
  );

  assert.deepEqual(
    builder.toSerializableCapturePackage(pkg),
    builder.toSerializableCapturePackage(pkg)
  );
});
