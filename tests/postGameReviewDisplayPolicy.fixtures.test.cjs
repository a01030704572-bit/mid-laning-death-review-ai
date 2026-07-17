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
        `Unexpected runtime dependency in post-game review display policy fixture: ${moduleName}`
      );
    },
    loadedModule,
    loadedModule.exports
  );

  return loadedModule.exports;
}

const { getPostGameReviewDisplayPolicy } = loadTypeScriptModule(
  "lib/postGameReviewDisplayPolicy.ts"
);

function makeScene(sceneId, overrides = {}) {
  return {
    sceneId,
    matchId: "KR_1",
    gameTimeSec: overrides.gameTimeSec ?? 600,
    autoSceneType: overrides.autoSceneType ?? "death_review_candidate",
    primaryScenarioId: overrides.primaryScenarioId ?? null,
    sceneValence: overrides.sceneValence ?? "bad_decision",
    reviewWorthinessScore: overrides.reviewWorthinessScore ?? 90,
    scoreBreakdown: {
      baseScore: 80,
      evidenceBoosts: [],
      totalScore: overrides.reviewWorthinessScore ?? 90,
    },
    riotEvidenceSummary: [],
    displayNameKo: overrides.displayNameKo ?? `scene ${sceneId}`,
    evidenceSummaryKo: "",
    confirmationQuestions: [],
    habitSignals: [],
  };
}

test("before analysis user mode shows readiness preview", () => {
  const policy = getPostGameReviewDisplayPolicy({
    debugMode: false,
    hasMatchReview: false,
  });

  assert.equal(policy.showReadinessPreview, true);
});

test("after analysis user mode hides readiness preview", () => {
  const policy = getPostGameReviewDisplayPolicy({
    debugMode: false,
    hasMatchReview: true,
  });

  assert.equal(policy.showReadinessPreview, false);
});

test("debug mode keeps readiness preview", () => {
  const policy = getPostGameReviewDisplayPolicy({
    debugMode: true,
    hasMatchReview: true,
  });

  assert.equal(policy.showReadinessPreview, true);
});

test("user mode primary scenes are limited to two", () => {
  const policy = getPostGameReviewDisplayPolicy({
    hasMatchReview: true,
    topScenes: [makeScene("top-1"), makeScene("top-2"), makeScene("top-3")],
  });

  assert.deepEqual(
    policy.primaryScenes.map((scene) => scene.sceneId),
    ["top-1", "top-2"]
  );
});

test("user mode keep scenes are limited to one and do not duplicate primary scenes", () => {
  const policy = getPostGameReviewDisplayPolicy({
    hasMatchReview: true,
    topScenes: [makeScene("same"), makeScene("top-2")],
    strengthScenes: [makeScene("same"), makeScene("strength-1"), makeScene("strength-2")],
  });

  assert.deepEqual(
    policy.keepScenes.map((scene) => scene.sceneId),
    ["strength-1"]
  );
});

test("additional scenes contain remaining unique candidates", () => {
  const policy = getPostGameReviewDisplayPolicy({
    hasMatchReview: true,
    topScenes: [makeScene("top-1"), makeScene("top-2"), makeScene("top-3")],
    improvementScenes: [makeScene("top-1"), makeScene("improve-1")],
    strengthScenes: [makeScene("strength-1"), makeScene("improve-1")],
  });

  assert.deepEqual(
    policy.additionalScenes.map((scene) => scene.sceneId),
    ["top-3", "improve-1"]
  );
});

test("coaching card is visible when available", () => {
  const policy = getPostGameReviewDisplayPolicy({
    hasMatchReview: true,
    hasCoachingFeedbackPreview: true,
  });

  assert.equal(policy.showMainCoachingCard, true);
  assert.equal(policy.showCompactSummary, false);
});

test("manual fallback remains compact in user mode", () => {
  const policy = getPostGameReviewDisplayPolicy({
    debugMode: false,
    hasMatchReview: true,
  });

  assert.equal(policy.showManualFallbackCompact, true);
  assert.equal(policy.collapseAdditionalByDefault, true);
});

test("input mutation is not performed", () => {
  const topScenes = [makeScene("top-1"), makeScene("top-2"), makeScene("top-3")];
  const before = JSON.stringify(topScenes);

  getPostGameReviewDisplayPolicy({
    hasMatchReview: true,
    topScenes,
  });

  assert.equal(JSON.stringify(topScenes), before);
});
