const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

require(path.join(
  process.cwd(),
  "overwolf-collector",
  "src",
  "capturePackageBuilder.js"
));

const builder = globalThis.MidLaneReviewCapturePackageBuilder;
const exporter = require(path.join(
  process.cwd(),
  "overwolf-collector",
  "src",
  "exportCapturePackage.js"
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
        `Unexpected runtime dependency in Overwolf collector export fixture: ${moduleName}`
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

function readSamplePackage() {
  return JSON.parse(
    fs.readFileSync(
      path.join(
        process.cwd(),
        "overwolf-collector",
        "samples",
        "sample-capture-package.json"
      ),
      "utf8"
    )
  );
}

test("sample-capture-package.json passes validateOverwolfCapturePackage", () => {
  const result = validateOverwolfCapturePackage(readSamplePackage());

  assert.equal(result.safe, true);
  assert.equal(result.session.status, "validated");
  assert.equal(result.session.validationIssues.length, 0);
});

test("getCurrentCapturePackageJson returns parseable JSON", () => {
  const sample = readSamplePackage();
  const json = exporter.getCurrentCapturePackageJson(sample);
  const parsed = JSON.parse(json);

  assert.equal(parsed.packageId, sample.packageId);
  assert.equal(parsed.source, "overwolf");
  assert.equal(parsed.events.length, 3);
  assert.equal(parsed.clips.length, 2);
});

test("exported JSON does not contain local paths, filePathOrUrl, or raw payloads", () => {
  const sample = readSamplePackage();
  sample.events[0].raw = { secret: true };
  sample.clips[0].filePathOrUrl = "C:\\Users\\private\\clip.mp4";

  const json = exporter.getCurrentCapturePackageJson(sample);

  assert.doesNotMatch(json, /filePathOrUrl/);
  assert.doesNotMatch(json, /private\\clip/);
  assert.doesNotMatch(json, /secret/);
  assert.doesNotMatch(json, /"raw"/);
});

test("export helper does not mutate input", () => {
  const sample = readSamplePackage();
  sample.events[0].raw = { shouldRemainOnlyOnInput: true };
  sample.clips[0].filePathOrUrl = "file:///local/private.mp4";
  const before = structuredClone(sample);

  exporter.getCurrentCapturePackageJson(sample);

  assert.deepEqual(sample, before);
});

test("copy helper safely reports unavailable outside browser clipboard context", async () => {
  const result = await exporter.copyCapturePackageToClipboard(readSamplePackage());

  assert.equal(result.ok, false);
  assert.match(result.status, /clipboard_unavailable|copy_failed/);
});

test("package produced by builder and export helper passes validation", () => {
  const pkg = builder.addClip(
    builder.addCaptureEvent(
      builder.addCaptureEvent(
        builder.createEmptyCapturePackage({
          packageId: "builder-package",
          collectedAtLocalTimestampMs: 1721030900000,
          clientVersion: "test-builder",
        }),
        {
          id: "event-death",
          type: "death",
          localTimestampMs: 1721030400000,
          estimatedGameTimeSec: 548,
          confidence: "high",
          raw: { shouldNotExport: true },
        }
      ),
      {
        id: "event-kill",
        type: "kill",
        localTimestampMs: 1721030600000,
        estimatedGameTimeSec: 748,
        confidence: "medium",
      }
    ),
    {
      id: "clip-death",
      triggerEventId: "event-death",
      filePathOrUrl: "C:\\Users\\private\\clip.mp4",
      pastDurationMs: 15000,
      futureDurationMs: 10000,
      capturedAtLocalTimestampMs: 1721030400000,
      status: "captured",
    }
  );
  const exported = JSON.parse(exporter.getCurrentCapturePackageJson(pkg));
  const result = validateOverwolfCapturePackage(exported);

  assert.equal(result.safe, true);
  assert.equal(result.session.status, "validated");
  assert.equal(result.session.sourcePackage.events.length, 2);
  assert.equal(result.session.sourcePackage.clips.length, 1);
});
