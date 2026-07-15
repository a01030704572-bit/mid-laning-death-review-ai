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
        `Unexpected runtime dependency in Overwolf mapper fixture: ${moduleName}`
      );
    },
    loadedModule,
    loadedModule.exports
  );

  return loadedModule.exports;
}

const fixtures = loadTypeScriptModule("lib/overwolfCaptureFixtures.ts");
const { mapOverwolfPackageToSceneVideoEvidence } = loadTypeScriptModule(
  "lib/overwolfCaptureMapper.ts"
);

test("empty package returns []", () => {
  const result = mapOverwolfPackageToSceneVideoEvidence({
    packageId: "empty",
    source: "overwolf",
    events: [],
    clips: [],
    collectedAtLocalTimestampMs: 1,
  });

  assert.deepEqual(result, []);
});

test("death event with captured clip maps to evidence", () => {
  const result = mapOverwolfPackageToSceneVideoEvidence(
    fixtures.overwolfDeathCapturePackage
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].sceneId, "overwolf:death:600:ow-event-death-600");
  assert.equal(result[0].confidence, "likely");
  assert.equal(result[0].clip.status, "captured");
  assert.equal(result[0].sourceEvent.type, "death");
});

test("capture_failed maps to unconfirmed evidence", () => {
  const result = mapOverwolfPackageToSceneVideoEvidence(
    fixtures.overwolfFailedClipCapturePackage
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].confidence, "unconfirmed");
  assert.equal(result[0].clip.status, "capture_failed");
  assert.match(result[0].noteKo, /클립 저장에 실패/);
});

test("mapper does not mutate inputs", () => {
  const input = structuredClone(fixtures.overwolfSoloKillCapturePackage);
  const before = structuredClone(input);

  mapOverwolfPackageToSceneVideoEvidence(input);

  assert.deepEqual(input, before);
});

test("output does not include raw heavy payload", () => {
  const result = mapOverwolfPackageToSceneVideoEvidence(
    fixtures.overwolfDeathCapturePackage
  );

  assert.equal("raw" in result[0].sourceEvent, false);
  assert.equal("triggerEventId" in result[0].clip, false);
});

test("output is deterministic", () => {
  const first = mapOverwolfPackageToSceneVideoEvidence(
    fixtures.overwolfSoloKillCapturePackage
  );
  const second = mapOverwolfPackageToSceneVideoEvidence(
    fixtures.overwolfSoloKillCapturePackage
  );

  assert.deepEqual(first, second);
});
