/* eslint-disable @typescript-eslint/no-require-imports -- Node fixture harness transpiles the real TypeScript modules without adding a test dependency. */
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
      if (moduleName in dependencies) return dependencies[moduleName];
      throw new Error(`Unexpected runtime dependency in coaching metrics fixture: ${moduleName}`);
    },
    loadedModule,
    loadedModule.exports
  );

  return loadedModule.exports;
}

const coachingMetricsModule = loadTypeScriptModule("lib/coachingMetrics.ts");

const TIER_BANDS = [
  "iron_silver",
  "gold_platinum",
  "emerald_diamond",
  "master_plus",
];

test("coaching metric tables are populated", () => {
  assert.ok(coachingMetricsModule.COACHING_METRICS.length > 0);
  assert.ok(coachingMetricsModule.SCENE_SCENARIOS.length > 0);
  assert.ok(coachingMetricsModule.HABIT_PATTERNS.length > 0);
});

test("every metric and scenario has all tier-specific text", () => {
  for (const metric of coachingMetricsModule.COACHING_METRICS) {
    for (const tierBand of TIER_BANDS) {
      assert.equal(typeof metric.tierExplanations[tierBand], "string");
      assert.ok(metric.tierExplanations[tierBand].length > 0);
    }
  }

  for (const scenario of coachingMetricsModule.SCENE_SCENARIOS) {
    for (const tierBand of TIER_BANDS) {
      assert.equal(typeof scenario.tierFeedbackKo[tierBand], "string");
      assert.ok(scenario.tierFeedbackKo[tierBand].length > 0);
    }
  }
});

test("high priority scenarios cover MVP automation cases", () => {
  const highPriorityIds = coachingMetricsModule
    .getHighPriorityScenarios()
    .map((scenario) => scenario.id);

  assert.ok(highPriorityIds.includes("ganked_while_pushing"));
  assert.ok(highPriorityIds.includes("fight_with_unknown_enemy_jungler"));
  assert.ok(highPriorityIds.includes("enemy_support_roam_collapse"));
  assert.ok(highPriorityIds.includes("successful_solo_kill_poor_conversion"));
  assert.ok(
    highPriorityIds.includes("death_before_objective") ||
      highPriorityIds.includes("bad_recall_before_objective")
  );
});

test("habit patterns define usable thresholds", () => {
  for (const pattern of coachingMetricsModule.HABIT_PATTERNS) {
    assert.ok(pattern.threshold.windowGames > 0);
    assert.ok(pattern.threshold.minOccurrences > 0);
    assert.ok(pattern.threshold.minOccurrences <= pattern.threshold.windowGames);
  }
});

test("helper functions return expected records and tier text", () => {
  assert.equal(
    coachingMetricsModule.getCoachingMetricById("enemy_jungle_tracking_before_forward").concept,
    "jungle_tracking"
  );
  assert.equal(
    coachingMetricsModule.getSceneScenarioById("ganked_while_pushing").id,
    "ganked_while_pushing"
  );
  assert.equal(
    coachingMetricsModule.getHabitPatternById("untracked_forward_pressure").id,
    "untracked_forward_pressure"
  );
  assert.ok(
    coachingMetricsModule
      .getHighPriorityMetrics()
      .some((metric) => metric.id === "enemy_jungle_tracking_before_forward")
  );
  assert.match(
    coachingMetricsModule.getTierFeedbackForScenario(
      "ganked_while_pushing",
      "gold_platinum"
    ),
    /정글|시야/
  );
  assert.match(
    coachingMetricsModule.getTierExplanationForMetric(
      "solo_kill_conversion",
      "master_plus"
    ),
    /기대값/
  );
});

test("risk tag lookup works with existing project risk tags", () => {
  const noRiverVisionScenarios =
    coachingMetricsModule.getScenariosForRiskTag("NO_RIVER_VISION");
  const unknownJungleScenarios =
    coachingMetricsModule.getScenariosForRiskTag("ENEMY_JUNGLER_UNKNOWN");
  const noFlashScenarios =
    coachingMetricsModule.getScenariosForRiskTag("NO_FLASH_WINDOW");
  const unsafeWardingScenarios =
    coachingMetricsModule.getScenariosForRiskTag("UNSAFE_WARDING");
  const noCoverScenarios =
    coachingMetricsModule.getScenariosForRiskTag("FOUGHT_WITHOUT_ALLY_COVER");

  assert.ok(noRiverVisionScenarios.some((scenario) => scenario.id === "ganked_while_pushing"));
  assert.ok(
    unknownJungleScenarios.some(
      (scenario) => scenario.id === "fight_with_unknown_enemy_jungler"
    )
  );
  assert.ok(
    noFlashScenarios.some(
      (scenario) => scenario.id === "fight_without_flash_or_escape"
    )
  );
  assert.ok(
    unsafeWardingScenarios.some(
      (scenario) => scenario.id === "unsafe_warding_into_fog"
    )
  );
  assert.ok(
    noCoverScenarios.some(
      (scenario) => scenario.id === "fight_with_unknown_enemy_jungler"
    )
  );
});

test("metrics can be found for a scenario", () => {
  const metrics = coachingMetricsModule.getMetricsForScenario(
    "successful_solo_kill_poor_conversion"
  );

  assert.ok(metrics.some((metric) => metric.concept === "kill_to_value_conversion"));
  assert.ok(metrics.every((metric) => metric.relatedScenarios.length > 0));
});
