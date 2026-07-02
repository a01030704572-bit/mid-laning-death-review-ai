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
        `Unexpected runtime dependency in post-game summary fixture: ${moduleName}`
      );
    },
    loadedModule,
    loadedModule.exports
  );

  return loadedModule.exports;
}

const { buildNextGameActionGoal } = loadTypeScriptModule(
  "lib/postGameSummary.ts"
);

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
    riotEvidenceSummary: overrides.riotEvidenceSummary ?? [],
    displayNameKo: overrides.displayNameKo ?? "복기 후보",
    evidenceSummaryKo: overrides.evidenceSummaryKo ?? "",
    confirmationQuestions: [],
    habitSignals: overrides.habitSignals ?? [],
  };
}

test("jungle death or gank scene maps to jungle safety goal", () => {
  assert.equal(
    buildNextGameActionGoal(
      makeScene({
        autoSceneType: "jungle_gank_death_candidate",
        primaryScenarioId: "fight_with_unknown_enemy_jungler",
      })
    ),
    "상대 정글 위치가 확인되기 전까지 시야 없는 쪽으로 압박하지 않기."
  );
});

test("solo kill or conversion scene maps to conversion goal", () => {
  assert.equal(
    buildNextGameActionGoal(
      makeScene({
        autoSceneType: "post_kill_conversion_candidate",
        primaryScenarioId: "successful_solo_kill_poor_conversion",
      })
    ),
    "솔킬 이후 20초 안에 웨이브, 플레이트, 귀환 중 하나를 선택하기."
  );
});

test("objective scene maps to objective prep goal", () => {
  assert.equal(
    buildNextGameActionGoal(
      makeScene({
        autoSceneType: "objective_setup_failure_candidate",
        primaryScenarioId: "death_before_objective",
        evidenceSummaryKo: "오브젝트 전 준비 후보",
      })
    ),
    "오브젝트 60초 전에는 미드 웨이브 상태부터 먼저 확인하기."
  );
});

test("fallback scene maps to generic review check goal", () => {
  assert.equal(
    buildNextGameActionGoal(
      makeScene({
        autoSceneType: "poor_resource_management_candidate",
        displayNameKo: "자원 관리 후보",
      })
    ),
    "다음 판에는 가장 위험했던 장면과 같은 조건이 다시 나오는지 먼저 체크하기."
  );
});
