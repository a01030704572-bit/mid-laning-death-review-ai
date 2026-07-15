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
        `Unexpected runtime dependency in review readiness resolver fixture: ${moduleName}`
      );
    },
    loadedModule,
    loadedModule.exports
  );

  return loadedModule.exports;
}

const { resolveReviewReadiness, resolveReviewReadinessCard } =
  loadTypeScriptModule("lib/reviewReadinessResolver.ts");

test("has Riot report and video evidence resolves to video_ready", () => {
  const result = resolveReviewReadiness({
    hasRiotReport: true,
    hasVideoEvidence: true,
  });

  assert.equal(result.status, "video_ready");
  assert.equal(result.source, "riot_video");
  assert.match(result.evidenceLabelKo, /Riot/);
  assert.match(result.evidenceLabelKo, /영상/);
});

test("has Riot report only resolves to riot_ready", () => {
  const result = resolveReviewReadiness({
    hasRiotReport: true,
    hasVideoEvidence: false,
  });

  assert.equal(result.status, "riot_ready");
  assert.equal(result.source, "riot");
  assert.ok(result.warningsKo.some((warning) => warning.includes("영상")));
});

test("unknown match inference resolves to match_inference_needed", () => {
  const result = resolveReviewReadiness({
    matchInferenceStatus: "unknown",
    hasCapturePackage: true,
  });

  assert.equal(result.status, "match_inference_needed");
  assert.equal(result.source, "overwolf_inference");
  assert.ok(result.warningsKo.length > 0);
});

test("rejected capture session resolves to riot_fallback", () => {
  const result = resolveReviewReadiness({
    captureSessionStatus: "rejected",
    hasCapturePackage: true,
  });

  assert.equal(result.status, "riot_fallback");
  assert.equal(result.source, "fallback");
  assert.ok(result.warningsKo.some((warning) => warning.includes("Riot")));
});

test("capture package without Riot report stays cautious and not ready", () => {
  const result = resolveReviewReadiness({
    hasCapturePackage: true,
    matchInferenceStatus: "confirmed",
    hasRiotReport: false,
    hasVideoEvidence: true,
  });

  assert.equal(result.status, "match_inference_needed");
  assert.equal(result.source, "overwolf_inference");
  assert.notEqual(result.status, "video_ready");
  assert.notEqual(result.status, "riot_ready");
});

test("default input resolves to riot_fallback", () => {
  const result = resolveReviewReadiness({});

  assert.equal(result.status, "riot_fallback");
  assert.equal(result.source, "fallback");
  assert.equal(result.warningsKo.length, 0);
});

test("does not mark video_ready without Riot report", () => {
  const result = resolveReviewReadiness({
    hasVideoEvidence: true,
    hasRiotReport: false,
  });

  assert.notEqual(result.status, "video_ready");
});

test("does not mark riot_ready without Riot report", () => {
  const result = resolveReviewReadiness({
    hasCapturePackage: true,
    matchInferenceStatus: "likely",
  });

  assert.notEqual(result.status, "riot_ready");
});

test("user-facing copy does not include development-only wording", () => {
  const cases = [
    resolveReviewReadiness({ hasRiotReport: true, hasVideoEvidence: true }),
    resolveReviewReadiness({ hasRiotReport: true }),
    resolveReviewReadiness({ matchInferenceStatus: "unknown" }),
    resolveReviewReadiness({ captureSessionStatus: "rejected" }),
    resolveReviewReadiness({}),
  ];
  const text = JSON.stringify(cases).toLowerCase();

  assert.doesNotMatch(text, /mock/);
  assert.doesNotMatch(text, /fixture/);
  assert.doesNotMatch(text, /debug/);
});

test("input mutation is not performed", () => {
  const input = {
    hasRiotReport: false,
    hasVideoEvidence: true,
    captureSessionStatus: "validated",
    matchInferenceStatus: "likely",
    hasCapturePackage: true,
    hasCaptureValidationIssues: true,
  };
  const before = structuredClone(input);

  resolveReviewReadiness(input);

  assert.deepEqual(input, before);
});

test("optional card resolver returns ReviewReadinessCard-compatible shape", () => {
  const card = resolveReviewReadinessCard({
    hasRiotReport: true,
    hasVideoEvidence: true,
  });

  assert.equal(card.id, "video_ready");
  assert.equal(card.source, "riot_video");
  assert.ok(card.titleKo);
  assert.ok(card.eyebrowKo);
  assert.ok(card.statusLabelKo);
  assert.ok(card.descriptionKo);
  assert.ok(card.evidenceLabelKo);
  assert.equal(typeof card.isActionable, "boolean");
});
