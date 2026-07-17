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
        `Unexpected runtime dependency in scene card copy fixture: ${moduleName}`
      );
    },
    loadedModule,
    loadedModule.exports
  );

  return loadedModule.exports;
}

const {
  getDebugSceneValenceLabelKo,
  getUserFacingSceneBadge,
  getUserFacingSceneDescription,
  getUserFacingSceneTitle,
} = loadTypeScriptModule("lib/sceneCardCopy.ts");

function makeScene(overrides = {}) {
  return {
    sceneId: overrides.sceneId ?? "scene-1",
    matchId: "KR_1",
    gameTimeSec: overrides.gameTimeSec ?? 600,
    autoSceneType: overrides.autoSceneType ?? "death_review_candidate",
    primaryScenarioId: overrides.primaryScenarioId ?? null,
    sceneValence: overrides.sceneValence ?? "bad_decision",
    reviewWorthinessScore: 90,
    scoreBreakdown: {
      baseScore: 80,
      evidenceBoosts: [],
      totalScore: 90,
    },
    riotEvidenceSummary: [],
    displayNameKo: overrides.displayNameKo ?? "정글 개입 사망 후보",
    evidenceSummaryKo: "",
    confirmationQuestions: overrides.confirmationQuestions ?? [],
    habitSignals: [],
  };
}

function assertUserCopyIsClean(text) {
  assert.equal(text.includes("jungle_tracking"), false);
  assert.equal(text.includes("objective_setup"), false);
  assert.equal(text.includes("정글 개입 사망 후보"), false);
  assert.ok((text.match(/후보/g) ?? []).length <= 1);
}

test("jungle or gank scene avoids raw debug title", () => {
  const title = getUserFacingSceneTitle(
    makeScene({ autoSceneType: "jungle_gank_death_candidate" })
  );

  assert.equal(title, "정글 위치 확인이 필요한 장면");
  assertUserCopyIsClean(title);
});

test("objective scene returns product-facing copy", () => {
  const scene = makeScene({
    autoSceneType: "objective_setup_failure_candidate",
    primaryScenarioId: "death_before_objective",
  });

  assert.equal(getUserFacingSceneTitle(scene), "오브젝트 전 준비를 볼 장면");
  assert.match(getUserFacingSceneDescription(scene), /오브젝트/);
});

test("solo kill scene returns coaching-oriented title", () => {
  const title = getUserFacingSceneTitle(
    makeScene({
      autoSceneType: "solo_kill_candidate",
      sceneValence: "good_decision",
    })
  );

  assert.equal(title, "교전 이득을 만든 장면");
});

test("conversion scene returns transition wording", () => {
  const title = getUserFacingSceneTitle(
    makeScene({ autoSceneType: "post_kill_conversion_candidate" })
  );

  assert.equal(title, "이득 전환을 확인할 장면");
});

test("user-facing badges avoid repeated candidate wording", () => {
  assert.equal(
    getUserFacingSceneBadge(makeScene({ sceneValence: "good_decision" })),
    "유지할 판단"
  );
  assert.equal(
    getUserFacingSceneBadge(makeScene({ sceneValence: "bad_decision" })),
    "다음 판에 조심"
  );
});

test("debug labels remain available for inspectability", () => {
  assert.equal(getDebugSceneValenceLabelKo("bad_decision"), "위험 판단 후보");
});

test("input mutation is not performed", () => {
  const scene = makeScene({
    autoSceneType: "jungle_gank_death_candidate",
  });
  const before = JSON.stringify(scene);

  getUserFacingSceneTitle(scene);
  getUserFacingSceneBadge(scene);
  getUserFacingSceneDescription(scene);

  assert.equal(JSON.stringify(scene), before);
});
