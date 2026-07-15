/* eslint-disable @typescript-eslint/no-require-imports -- Node fixture harness transpiles the real TypeScript module without adding a test dependency. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

function loadTypeScriptModule(relativePath, cache = new Map()) {
  const normalizedPath = relativePath.replaceAll("\\", "/");
  if (cache.has(normalizedPath)) return cache.get(normalizedPath);

  const absolutePath = path.join(process.cwd(), normalizedPath);
  const source = fs.readFileSync(absolutePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  const loadedModule = { exports: {} };
  cache.set(normalizedPath, loadedModule.exports);

  new Function("require", "module", "exports", output)(
    (moduleName) => {
      const aliases = {
        "@/lib/coachingFeedbackDraftMapper":
          "lib/coachingFeedbackDraftMapper.ts",
        "@/lib/coachingFeedbackQualityGate":
          "lib/coachingFeedbackQualityGate.ts",
        "@/lib/coachingFeedbackGuards": "lib/coachingFeedbackGuards.ts",
        "@/lib/nextGameGoalSelector": "lib/nextGameGoalSelector.ts",
      };
      if (aliases[moduleName]) {
        return loadTypeScriptModule(aliases[moduleName], cache);
      }
      throw new Error(
        `Unexpected runtime dependency in coaching feedback pipeline fixture: ${moduleName}`
      );
    },
    loadedModule,
    loadedModule.exports
  );

  return loadedModule.exports;
}

const { buildCoachingFeedbackPipeline } = loadTypeScriptModule(
  "lib/coachingFeedbackPipeline.ts"
);
const { hasExactlyOneNextGameGoal } = loadTypeScriptModule(
  "lib/coachingFeedbackGuards.ts"
);

function makeScene(overrides = {}) {
  return {
    sceneId: "scene-1",
    matchId: "KR_1",
    gameTimeSec: 548,
    autoSceneType: "jungle_gank_death_candidate",
    sceneValence: "bad_decision",
    reviewWorthinessScore: 96,
    displayNameKo: "정글 개입 사망 후보",
    evidenceSummaryKo: "상대 정글 개입 가능성이 있는 사망 이벤트입니다.",
    riotEvidenceSummary: ["548초에 CHAMPION_KILL 이벤트가 확인되었습니다."],
    confirmationQuestions: [],
    habitSignals: [],
    ...overrides,
  };
}

test("empty input returns valid fallback feedback", () => {
  const result = buildCoachingFeedbackPipeline({});

  assert.equal(result.feedback.sceneReviews.length, 0);
  assert.equal(result.feedback.evidenceConfidence, "low");
  assert.equal(hasExactlyOneNextGameGoal(result.feedback), true);
  assert.equal(Array.isArray(result.feedback.nextGameGoal), false);
});

test("top scene input returns sceneReviews and complete nextGameGoal", () => {
  const result = buildCoachingFeedbackPipeline({
    topScenes: [makeScene()],
  });

  assert.equal(result.feedback.sceneReviews.length, 1);
  assert.equal(result.feedback.sceneReviews[0].sceneId, "scene-1");
  assert.equal(hasExactlyOneNextGameGoal(result.feedback), true);
});

test("pipeline warnings are returned from quality gate", () => {
  const result = buildCoachingFeedbackPipeline({
    topScenes: [makeScene()],
  });

  assert.ok(result.warnings.length > 0);
  assert.ok(
    result.warnings.some((warning) => warning.includes("강점") || warning.includes("媛뺤젏"))
  );
});

test("matchId, puuid, and generatedAtIsoTimestamp are preserved", () => {
  const result = buildCoachingFeedbackPipeline({
    matchId: "KR_123",
    puuid: "player-puuid",
    generatedAtIsoTimestamp: "2026-07-15T12:00:00.000Z",
    topScenes: [makeScene()],
  });

  assert.equal(result.feedback.matchId, "KR_123");
  assert.equal(result.feedback.puuid, "player-puuid");
  assert.equal(
    result.feedback.generatedAtIsoTimestamp,
    "2026-07-15T12:00:00.000Z"
  );
});

test("input mutation is not performed", () => {
  const input = {
    matchId: "KR_1",
    topScenes: [makeScene()],
    improvementScenes: [makeScene({ sceneId: "improve-1" })],
  };
  const before = JSON.stringify(input);

  buildCoachingFeedbackPipeline(input);

  assert.equal(JSON.stringify(input), before);
});

test("output has exactly one nextGameGoal object and passes guard", () => {
  const result = buildCoachingFeedbackPipeline({
    improvementScenes: [
      makeScene({
        sceneId: "improve-1",
        autoSceneType: "objective_setup_failure_candidate",
        sceneValence: "missed_opportunity",
      }),
    ],
  });

  assert.equal(Array.isArray(result.feedback.nextGameGoal), false);
  assert.equal(hasExactlyOneNextGameGoal(result.feedback), true);
  assert.ok(result.feedback.nextGameGoal.goalKo);
});

test("normalization result changed flag is propagated", () => {
  const result = buildCoachingFeedbackPipeline({
    topScenes: [makeScene()],
  });

  assert.equal(typeof result.changed, "boolean");
});
