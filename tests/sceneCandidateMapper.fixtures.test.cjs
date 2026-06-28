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
      throw new Error(`Unexpected runtime dependency in scene candidate fixture: ${moduleName}`);
    },
    loadedModule,
    loadedModule.exports
  );

  return loadedModule.exports;
}

const coachingMetricsModule = loadTypeScriptModule("lib/coachingMetrics.ts");
const sceneCandidateMapperModule = loadTypeScriptModule(
  "lib/sceneCandidateMapper.ts",
  {
    "@/lib/coachingMetrics": coachingMetricsModule,
  }
);

const { mapEvidenceToSceneCandidates } = sceneCandidateMapperModule;

function findCandidate(result, scenarioId) {
  return result.scenarioCandidates.find(
    (candidate) => candidate.scenarioId === scenarioId
  );
}

test("empty input does not throw and returns empty candidates", () => {
  const result = mapEvidenceToSceneCandidates({});

  assert.deepEqual(result.scenarioCandidates, []);
  assert.deepEqual(result.candidateScenarioIds, []);
  assert.deepEqual(result.candidateMetricIds, []);
  assert.deepEqual(result.candidateHabitPatternIds, []);
});

test("unknown risk tag returns empty candidates safely", () => {
  const result = mapEvidenceToSceneCandidates({
    riskTags: ["UNKNOWN_FIXTURE_TAG"],
  });

  assert.deepEqual(result.scenarioCandidates, []);
  assert.deepEqual(result.matchedRiskTags, []);
});

test("NO_RIVER_VISION alone does not create gank scenario", () => {
  const result = mapEvidenceToSceneCandidates({
    riskTags: ["NO_RIVER_VISION"],
  });

  assert.equal(findCandidate(result, "ganked_while_pushing"), undefined);
  assert.equal(
    findCandidate(result, "fight_with_unknown_enemy_jungler"),
    undefined
  );
  assert.ok(result.notes.some((note) => note.includes("NO_RIVER_VISION")));
});

test("NO_RIVER_VISION plus ENEMY_JUNGLER_UNKNOWN maps to jungle candidates", () => {
  const result = mapEvidenceToSceneCandidates({
    riskTags: ["NO_RIVER_VISION", "ENEMY_JUNGLER_UNKNOWN"],
  });

  assert.equal(
    findCandidate(result, "fight_with_unknown_enemy_jungler").confidence,
    "high"
  );
  assert.equal(
    findCandidate(result, "ganked_while_pushing").confidence,
    "medium"
  );
});

test("ganked while pushing is boosted by push and death context", () => {
  const result = mapEvidenceToSceneCandidates({
    riskTags: ["NO_RIVER_VISION", "ENEMY_JUNGLER_UNKNOWN"],
    currentOutcome: "death",
    evidenceSummary: ["lane push forward", "enemy jungle involvement"],
  });

  const candidate = findCandidate(result, "ganked_while_pushing");
  assert.equal(candidate.confidence, "high");
  assert.ok(candidate.boostingEvidence.length > 0);
});

test("support roam plus no ally cover maps to enemy support collapse", () => {
  const result = mapEvidenceToSceneCandidates({
    riskTags: ["FOUGHT_WITHOUT_ALLY_COVER", "ENEMY_SUPPORT_ROAM_WINDOW"],
  });

  assert.equal(
    findCandidate(result, "enemy_support_roam_collapse").confidence,
    "medium"
  );
});

test("support roam collapse is boosted when support appeared", () => {
  const result = mapEvidenceToSceneCandidates({
    riskTags: ["FOUGHT_WITHOUT_ALLY_COVER", "ENEMY_SUPPORT_ROAM_WINDOW"],
    evidenceSummary: ["enemy support appeared mid and collapsed"],
  });

  assert.equal(
    findCandidate(result, "enemy_support_roam_collapse").confidence,
    "high"
  );
});

test("NO_FLASH_WINDOW maps to fight_without_flash_or_escape high", () => {
  const result = mapEvidenceToSceneCandidates({
    riskTags: ["NO_FLASH_WINDOW"],
  });

  assert.equal(
    findCandidate(result, "fight_without_flash_or_escape").confidence,
    "high"
  );
});

test("UNSAFE_WARDING maps to unsafe_warding_into_fog", () => {
  const mediumResult = mapEvidenceToSceneCandidates({
    riskTags: ["UNSAFE_WARDING"],
  });
  const highResult = mapEvidenceToSceneCandidates({
    riskTags: ["UNSAFE_WARDING"],
    evidenceSummary: ["deep ward into fog near river"],
  });

  assert.equal(
    findCandidate(mediumResult, "unsafe_warding_into_fog").confidence,
    "medium"
  );
  assert.equal(
    findCandidate(highResult, "unsafe_warding_into_fog").confidence,
    "high"
  );
});

test("MISSED_ALTERNATIVE_GAIN alone does not map to poor conversion", () => {
  const result = mapEvidenceToSceneCandidates({
    riskTags: ["MISSED_ALTERNATIVE_GAIN"],
  });

  assert.equal(
    findCandidate(result, "successful_solo_kill_poor_conversion"),
    undefined
  );
  assert.ok(findCandidate(result, "objective_trade_decision"));
});

test("POST_KILL_ESCAPE_RISK with kill context maps to poor conversion", () => {
  const result = mapEvidenceToSceneCandidates({
    riskTags: ["POST_KILL_ESCAPE_RISK"],
    currentOutcome: "solo_kill",
    evidenceSummary: ["kill event, weak post kill wave conversion"],
  });

  const candidate = findCandidate(
    result,
    "successful_solo_kill_poor_conversion"
  );
  assert.equal(candidate.confidence, "medium");
  assert.ok(candidate.boostingEvidence.some((item) => item.includes("킬")));
});

test("objective and wave mapping rules create expected candidates", () => {
  const result = mapEvidenceToSceneCandidates({
    riskTags: [
      "BAD_RECALL_BEFORE_OBJECTIVE",
      "OBJECTIVE_TRADEOFF_MISREAD",
      "MOVING_BEFORE_WAVE_CRASH",
      "RECALL_GREED",
      "STAYED_LOW_RESOURCE_BEFORE_OBJECTIVE",
    ],
    currentOutcome: "death",
  });

  assert.equal(
    findCandidate(result, "bad_recall_before_objective").confidence,
    "high"
  );
  assert.equal(
    findCandidate(result, "objective_trade_decision").confidence,
    "high"
  );
  assert.equal(
    findCandidate(result, "poor_wave_state_before_roaming").confidence,
    "high"
  );
  assert.equal(
    findCandidate(result, "overstay_after_wave_crash").confidence,
    "medium"
  );
  assert.equal(
    findCandidate(result, "death_before_objective").confidence,
    "medium"
  );
});

test("objective low-resource tag does not map to death before objective without loss timing", () => {
  const result = mapEvidenceToSceneCandidates({
    riskTags: ["STAYED_LOW_RESOURCE_BEFORE_OBJECTIVE"],
    currentOutcome: "unknown",
  });

  assert.equal(findCandidate(result, "death_before_objective"), undefined);
});

test("returned scenario candidates are de-duplicated", () => {
  const result = mapEvidenceToSceneCandidates({
    riskTags: [
      "NO_FLASH_WINDOW",
      "NO_ESCAPE_TOOL",
      "LOW_HP_STAY",
      "NO_FLASH_WINDOW",
    ],
  });

  assert.equal(
    result.candidateScenarioIds.filter(
      (scenarioId) => scenarioId === "fight_without_flash_or_escape"
    ).length,
    1
  );
  assert.deepEqual(
    findCandidate(result, "fight_without_flash_or_escape").matchedRiskTags.sort(),
    ["NO_ESCAPE_TOOL", "NO_FLASH_WINDOW"].sort()
  );
});

test("candidateMetricIds are derived from scenarios", () => {
  const result = mapEvidenceToSceneCandidates({
    riskTags: ["NO_FLASH_WINDOW"],
  });

  assert.ok(result.candidateMetricIds.includes("fight_resource_gate"));
});

test("candidateHabitPatternIds are derived from risk tags and scenarios", () => {
  const result = mapEvidenceToSceneCandidates({
    riskTags: ["UNSAFE_WARDING", "NO_RIVER_VISION"],
    evidenceSummary: ["ward into fog"],
  });

  assert.ok(result.candidateHabitPatternIds.includes("unsafe_vision_habit"));
  assert.ok(result.candidateHabitPatternIds.includes("untracked_forward_pressure"));
});
