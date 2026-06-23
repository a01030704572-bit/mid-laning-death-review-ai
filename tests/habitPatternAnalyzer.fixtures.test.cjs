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
    },
  }).outputText;
  const loadedModule = { exports: {} };

  new Function("require", "module", "exports", output)(
    (moduleName) => {
      throw new Error(`Unexpected runtime dependency in habit fixture: ${moduleName}`);
    },
    loadedModule,
    loadedModule.exports
  );

  return loadedModule.exports;
}

const { analyzeHabitPatterns } = loadTypeScriptModule(
  "lib/habitPatternAnalyzer.ts"
);
const { createManualReviewSceneRecord } = loadTypeScriptModule(
  "lib/reviewHistory.ts"
);

function scene(id, day, riskTags) {
  return {
    id,
    createdAt: `2026-06-${String(day).padStart(2, "0")}T12:00:00.000Z`,
    riskTags,
  };
}

test("counts each tag once per scene and calculates the recent-scene ratio", () => {
  const analysis = analyzeHabitPatterns([
    scene("1", 1, ["LOW_HP_STAY", "LOW_HP_STAY"]),
    scene("2", 2, ["LOW_HP_STAY"]),
    scene("3", 3, ["LOW_HP_STAY"]),
    scene("4", 4, ["NO_FLASH_WINDOW"]),
    scene("5", 5, []),
  ]);
  const lowHp = analysis.topRiskTags.find(
    ({ tag }) => tag === "LOW_HP_STAY"
  );

  assert.equal(lowHp.count, 3);
  assert.equal(lowHp.ratio, 0.6);
});

test("uses only the latest five scenes", () => {
  const analysis = analyzeHabitPatterns([
    scene("old-1", 1, ["CS_GREED"]),
    scene("old-2", 2, ["CS_GREED"]),
    scene("3", 3, ["LOW_HP_STAY"]),
    scene("4", 4, ["LOW_HP_STAY"]),
    scene("5", 5, ["LOW_HP_STAY"]),
    scene("6", 6, ["LOW_HP_STAY"]),
    scene("7", 7, ["LOW_HP_STAY"]),
  ]);

  assert.equal(analysis.recentSceneCount, 5);
  assert.equal(
    analysis.topRiskTags.some(({ tag }) => tag === "CS_GREED"),
    false
  );
  assert.equal(analysis.topRiskTags[0].count, 5);
});

test("classifies one-off, warning, repeated, and core thresholds", () => {
  const analysis = analyzeHabitPatterns([
    scene("1", 1, [
      "LOW_HP_STAY",
      "NO_FLASH_WINDOW",
      "COOLDOWN_DISRESPECT",
      "FOUGHT_TOWARD_ENEMY_COVER",
    ]),
    scene("2", 2, [
      "NO_FLASH_WINDOW",
      "COOLDOWN_DISRESPECT",
      "FOUGHT_TOWARD_ENEMY_COVER",
    ]),
    scene("3", 3, ["COOLDOWN_DISRESPECT", "FOUGHT_TOWARD_ENEMY_COVER"]),
    scene("4", 4, ["FOUGHT_TOWARD_ENEMY_COVER"]),
    scene("5", 5, []),
  ]);
  const levels = new Map(
    [
      ...analysis.repeatedPatterns,
      analysis.primaryHabitFocus,
    ].filter(Boolean).map(({ tag, level }) => [tag, level])
  );

  assert.equal(levels.get("NO_FLASH_WINDOW"), "warning");
  assert.equal(levels.get("COOLDOWN_DISRESPECT"), "repeated");
  assert.equal(levels.get("FOUGHT_TOWARD_ENEMY_COVER"), "core");

  const oneOffOnly = analyzeHabitPatterns([
    scene("single", 1, ["LOW_HP_STAY"]),
  ]);
  assert.equal(oneOffOnly.primaryHabitFocus.level, "possible_one_off");
});

test("one occurrence produces a cautious goal and sample-size warning", () => {
  const analysis = analyzeHabitPatterns([
    scene("single", 1, ["NO_FLASH_WINDOW"]),
  ]);

  assert.match(analysis.sampleSizeWarning, /현재 1개 복기 장면 기준/);
  assert.match(analysis.primaryHabitFocus.message, /반복 습관으로 보긴 이르지만/);
  assert.ok(analysis.nextReviewGoal);
  assert.equal(analysis.repeatedPatterns.length, 0);
  assert.equal(
    `${analysis.primaryHabitFocus.message} ${analysis.nextReviewGoal}`.includes(
      "NO_FLASH_WINDOW"
    ),
    false
  );
});

test("positive or unmapped tags do not appear in user-facing habit output", () => {
  const analysis = analyzeHabitPatterns([
    scene("1", 1, ["GOOD_OBJECTIVE_PREP_TURN"]),
    scene("2", 2, ["GOOD_OBJECTIVE_PREP_TURN"]),
  ]);

  assert.equal(analysis.primaryHabitFocus, null);
  assert.equal(analysis.nextReviewGoal, null);
  assert.deepEqual(analysis.repeatedPatterns, []);
});

test("zero scenes returns the persistent empty-state message", () => {
  const analysis = analyzeHabitPatterns([]);

  assert.equal(analysis.recentSceneCount, 0);
  assert.match(analysis.sampleSizeWarning, /복기 기록이 쌓이면/);
  assert.equal(analysis.primaryHabitFocus, null);
});

test("jungle-location goal uses natural Korean wording", () => {
  const analysis = analyzeHabitPatterns([
    scene("1", 1, ["ENEMY_JUNGLER_UNKNOWN"]),
  ]);

  assert.match(analysis.nextReviewGoal, /위치가 파악되지 않으면/);
  assert.equal(analysis.nextReviewGoal.includes("위치가 없으면"), false);
});

test("new local habit records omit the full result snapshot", () => {
  const record = createManualReviewSceneRecord({
    input: {
      myChampion: "Akali",
      enemyChampion: "Ahri",
      gameTime: "first_jungle_window",
      playerTier: "gold",
      currentOutcome: "death",
      survivalResources: [],
    },
    riskTags: ["LOW_HP_STAY"],
    scenarioType: "SOLO_KILL_TRADE",
    result: {
      possible_risk_factors: [],
      next_laning_goal: "안전하게 귀환하기",
    },
  });

  assert.equal("resultSnapshot" in record, false);
  assert.deepEqual(record.riskTags, ["LOW_HP_STAY"]);
  assert.equal(record.nextGameGoal, "안전하게 귀환하기");
});
