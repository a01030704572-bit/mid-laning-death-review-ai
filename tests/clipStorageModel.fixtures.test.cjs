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
        `Unexpected runtime dependency in clip storage model fixture: ${moduleName}`
      );
    },
    loadedModule,
    loadedModule.exports
  );

  return loadedModule.exports;
}

const {
  buildClipUploadPlanFromOverwolfPackage,
  createClipUploadRecord,
  markClipUploadRecordFailed,
  markClipUploadRecordUploaded,
} = loadTypeScriptModule("lib/clipStorageModel.ts");

const NOW = "2026-07-15T12:00:00.000Z";

function makePackage(overrides = {}) {
  return {
    packageId: "package-1",
    source: "overwolf",
    collectedAtLocalTimestampMs: 2_000,
    events: [],
    clips: [
      {
        id: "clip-1",
        triggerEventId: "event-1",
        filePathOrUrl: "C:\\Users\\private\\clip.mp4",
        pastDurationMs: 15_000,
        futureDurationMs: 10_000,
        capturedAtLocalTimestampMs: 100_000,
        status: "captured",
        raw: { localSecret: true },
      },
      {
        id: "clip-2",
        triggerEventId: "event-2",
        filePathOrUrl: "file:///local/clip-2.mp4",
        pastDurationMs: 12_000,
        futureDurationMs: 8_000,
        capturedAtLocalTimestampMs: 130_000,
        status: "capture_partial",
      },
    ],
    ...overrides,
  };
}

test("createClipUploadRecord creates pending safe record", () => {
  const record = createClipUploadRecord({
    clipId: "clip-1",
    triggerEventId: "event-1",
    provider: "cloudflare_r2",
    nowIsoTimestamp: NOW,
  });

  assert.equal(record.clipId, "clip-1");
  assert.equal(record.triggerEventId, "event-1");
  assert.equal(record.provider, "cloudflare_r2");
  assert.equal(record.status, "pending");
  assert.equal(record.createdAtIsoTimestamp, NOW);
  assert.equal(record.updatedAtIsoTimestamp, NOW);
  assert.equal("filePathOrUrl" in record, false);
  assert.equal("raw" in record, false);
});

test("build plan from package creates one record per clip", () => {
  const plan = buildClipUploadPlanFromOverwolfPackage({
    overwolfPackage: makePackage(),
    provider: "s3",
    nowIsoTimestamp: NOW,
  });

  assert.equal(plan.records.length, 2);
  assert.deepEqual(
    plan.records.map((record) => record.clipId),
    ["clip-1", "clip-2"]
  );
  assert.ok(plan.records.every((record) => record.status === "pending"));
});

test("packageId, matchId, and provider are preserved", () => {
  const plan = buildClipUploadPlanFromOverwolfPackage({
    overwolfPackage: makePackage(),
    matchId: "KR_123",
    provider: "supabase_storage",
    nowIsoTimestamp: NOW,
  });

  assert.equal(plan.packageId, "package-1");
  assert.equal(plan.matchId, "KR_123");
  assert.equal(plan.provider, "supabase_storage");
  assert.ok(
    plan.records.every(
      (record) =>
        record.packageId === "package-1" &&
        record.matchId === "KR_123" &&
        record.provider === "supabase_storage"
    )
  );
});

test("local path, filePathOrUrl, and raw fields are not present in output", () => {
  const plan = buildClipUploadPlanFromOverwolfPackage({
    overwolfPackage: makePackage(),
    provider: "local_debug",
    nowIsoTimestamp: NOW,
  });
  const serialized = JSON.stringify(plan);

  assert.doesNotMatch(serialized, /filePathOrUrl/);
  assert.doesNotMatch(serialized, /private\\clip/);
  assert.doesNotMatch(serialized, /file:\/\/\/local/);
  assert.doesNotMatch(serialized, /localSecret/);
  assert.doesNotMatch(serialized, /raw/);
});

test("invalid clip reference is marked skipped with warning", () => {
  const plan = buildClipUploadPlanFromOverwolfPackage({
    overwolfPackage: makePackage({
      clips: [
        {
          id: "",
          triggerEventId: "",
          pastDurationMs: 1_000,
          futureDurationMs: 1_000,
          capturedAtLocalTimestampMs: 10_000,
          status: "captured",
        },
      ],
    }),
    nowIsoTimestamp: NOW,
  });

  assert.equal(plan.records.length, 1);
  assert.equal(plan.records[0].status, "skipped");
  assert.equal(plan.records[0].errorCode, "INVALID_CLIP_REFERENCE");
  assert.ok(plan.warningsKo.length > 0);
});

test("capture_failed clip is skipped with warning", () => {
  const plan = buildClipUploadPlanFromOverwolfPackage({
    overwolfPackage: makePackage({
      clips: [
        {
          id: "clip-failed",
          triggerEventId: "event-1",
          pastDurationMs: 1_000,
          futureDurationMs: 1_000,
          capturedAtLocalTimestampMs: 10_000,
          status: "capture_failed",
        },
      ],
    }),
    nowIsoTimestamp: NOW,
  });

  assert.equal(plan.records[0].status, "skipped");
  assert.equal(plan.records[0].errorCode, "CLIP_CAPTURE_FAILED");
  assert.ok(plan.warningsKo.length > 0);
});

test("uploaded helper returns uploaded status with storage metadata", () => {
  const record = createClipUploadRecord({
    clipId: "clip-1",
    triggerEventId: "event-1",
    nowIsoTimestamp: NOW,
  });
  const uploaded = markClipUploadRecordUploaded(record, {
    storageKey: "clips/KR_123/clip-1.mp4",
    playbackUrl: "https://cdn.example.test/clips/KR_123/clip-1.mp4",
    updatedAtIsoTimestamp: "2026-07-15T12:01:00.000Z",
  });

  assert.equal(uploaded.status, "uploaded");
  assert.equal(uploaded.storageKey, "clips/KR_123/clip-1.mp4");
  assert.equal(
    uploaded.playbackUrl,
    "https://cdn.example.test/clips/KR_123/clip-1.mp4"
  );
  assert.equal(uploaded.updatedAtIsoTimestamp, "2026-07-15T12:01:00.000Z");
  assert.equal(record.status, "pending");
});

test("failed helper returns failed status with error context", () => {
  const record = createClipUploadRecord({
    clipId: "clip-1",
    triggerEventId: "event-1",
    nowIsoTimestamp: NOW,
  });
  const failed = markClipUploadRecordFailed(record, {
    errorCode: "UPLOAD_FAILED",
    errorKo: "업로드에 실패했습니다.",
    updatedAtIsoTimestamp: "2026-07-15T12:02:00.000Z",
  });

  assert.equal(failed.status, "failed");
  assert.equal(failed.errorCode, "UPLOAD_FAILED");
  assert.equal(failed.errorKo, "업로드에 실패했습니다.");
  assert.equal(failed.updatedAtIsoTimestamp, "2026-07-15T12:02:00.000Z");
  assert.equal(record.status, "pending");
});

test("input mutation is not performed", () => {
  const pkg = makePackage();
  const before = structuredClone(pkg);

  buildClipUploadPlanFromOverwolfPackage({
    overwolfPackage: pkg,
    matchId: "KR_123",
    provider: "s3",
    nowIsoTimestamp: NOW,
  });

  assert.deepEqual(pkg, before);
});

test("deterministic timestamps when nowIsoTimestamp is provided", () => {
  const input = {
    overwolfPackage: makePackage(),
    matchId: "KR_123",
    provider: "s3",
    nowIsoTimestamp: NOW,
  };

  assert.deepEqual(
    buildClipUploadPlanFromOverwolfPackage(input),
    buildClipUploadPlanFromOverwolfPackage(input)
  );
});
