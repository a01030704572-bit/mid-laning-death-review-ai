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
        `Unexpected runtime dependency in scene review source summary fixture: ${moduleName}`
      );
    },
    loadedModule,
    loadedModule.exports
  );

  return loadedModule.exports;
}

const { buildSceneReviewSourceSummary } = loadTypeScriptModule(
  "lib/sceneReviewSourceSummary.ts"
);

const emptyState = {
  hasManualInput: false,
  hasVideoDraft: false,
  isVideoDraftApplied: false,
  hasRiotEvidence: false,
  isRiotEvidenceConnected: false,
};

test("manual only returns manual-focused summary", () => {
  const summary = buildSceneReviewSourceSummary({
    ...emptyState,
    hasManualInput: true,
  });

  assert.equal(summary.manualStatusKo, "수동 입력 기준");
  assert.equal(summary.videoStatusKo, "영상 초안 없음");
  assert.equal(summary.riotStatusKo, "Riot 근거 없음");
  assert.match(summary.overallStatusKo, /수동 입력/);
  assert.deepEqual(summary.connectedSourceBadges, ["수동 입력"]);
});

test("no inputs returns waiting summary", () => {
  const summary = buildSceneReviewSourceSummary(emptyState);

  assert.equal(summary.manualStatusKo, "수동 입력 대기 중");
  assert.match(summary.overallStatusKo, /시작/);
  assert.deepEqual(summary.connectedSourceBadges, []);
});

test("video draft exists but not applied returns generated status", () => {
  const summary = buildSceneReviewSourceSummary({
    ...emptyState,
    hasManualInput: true,
    hasVideoDraft: true,
  });

  assert.equal(summary.videoStatusKo, "영상 초안 생성됨");
  assert.match(summary.overallStatusKo, /영상 초안/);
});

test("video draft applied returns applied status", () => {
  const summary = buildSceneReviewSourceSummary({
    ...emptyState,
    hasManualInput: true,
    hasVideoDraft: true,
    isVideoDraftApplied: true,
  });

  assert.equal(summary.videoStatusKo, "영상 초안 적용됨");
  assert.match(summary.overallStatusKo, /연결|적용/);
});

test("Riot evidence exists returns loaded status", () => {
  const summary = buildSceneReviewSourceSummary({
    ...emptyState,
    hasManualInput: true,
    hasRiotEvidence: true,
  });

  assert.equal(summary.riotStatusKo, "Riot 근거 불러옴");
  assert.match(summary.overallStatusKo, /Riot/);
});

test("Riot evidence connected returns connected status", () => {
  const summary = buildSceneReviewSourceSummary({
    ...emptyState,
    hasManualInput: true,
    hasRiotEvidence: true,
    isRiotEvidenceConnected: true,
  });

  assert.equal(summary.riotStatusKo, "Riot 근거 연결됨");
  assert.match(summary.overallStatusKo, /연결/);
});

test("video and Riot connected returns combined overall summary", () => {
  const summary = buildSceneReviewSourceSummary({
    hasManualInput: true,
    hasVideoDraft: true,
    isVideoDraftApplied: true,
    hasRiotEvidence: true,
    isRiotEvidenceConnected: true,
  });

  assert.match(summary.overallStatusKo, /영상\/Riot/);
});

test("connectedSourceBadges are deterministic", () => {
  const summary = buildSceneReviewSourceSummary({
    hasManualInput: true,
    hasVideoDraft: true,
    isVideoDraftApplied: false,
    hasRiotEvidence: true,
    isRiotEvidenceConnected: false,
  });

  assert.deepEqual(summary.connectedSourceBadges, [
    "수동 입력",
    "영상 초안",
    "Riot 근거",
  ]);
});

test("connectedSourceBadges have no duplicate badges", () => {
  const summary = buildSceneReviewSourceSummary({
    hasManualInput: true,
    hasVideoDraft: true,
    isVideoDraftApplied: true,
    hasRiotEvidence: true,
    isRiotEvidenceConnected: true,
  });

  assert.equal(
    summary.connectedSourceBadges.length,
    new Set(summary.connectedSourceBadges).size
  );
});

test("output is deterministic", () => {
  const state = {
    hasManualInput: true,
    hasVideoDraft: true,
    isVideoDraftApplied: false,
    hasRiotEvidence: true,
    isRiotEvidenceConnected: false,
  };

  assert.deepEqual(
    buildSceneReviewSourceSummary(state),
    buildSceneReviewSourceSummary(state)
  );
});
