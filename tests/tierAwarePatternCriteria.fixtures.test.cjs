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
      throw new Error(
        `Unexpected runtime dependency in tier criteria fixture: ${moduleName}`
      );
    },
    loadedModule,
    loadedModule.exports
  );

  return loadedModule.exports;
}

const criteriaModule = loadTypeScriptModule("lib/riot/tierAwarePatternCriteria.ts");

const {
  PLAYER_TIER_GROUPS,
  TIER_AWARE_PATTERN_CRITERIA,
  TIER_CONFIDENCE_RULES,
  TIER_NEXT_GAME_GOAL_TEMPLATES,
  getTierCriteria,
  getTierConfidenceRule,
  getTierNextGameGoalTemplate,
} = criteriaModule;

const GROUP_TYPES = [
  "push_gank_like",
  "solo_kill_conversion_like",
  "objective_setup_like",
  "no_flash_fight_like",
  "support_roam_collapse_like",
  "unsafe_warding_like",
  "information_gathering_failure_like",
  "wave_management_error_like",
  "resource_management_error_like",
  "tempo_loss_like",
  "blind_roaming_like",
];

test("PLAYER_TIER_GROUPS includes all four tiers", () => {
  assert.deepEqual(PLAYER_TIER_GROUPS, [
    "iron_silver",
    "gold_platinum",
    "emerald_diamond",
    "master_plus",
  ]);
});

test("criteria covers all group types for all tiers", () => {
  assert.equal(TIER_AWARE_PATTERN_CRITERIA.length, 44);

  for (const tierGroup of PLAYER_TIER_GROUPS) {
    const tierCriteria = TIER_AWARE_PATTERN_CRITERIA.filter(
      (criteria) => criteria.tierGroup === tierGroup
    );
    assert.equal(tierCriteria.length, 11);
    assert.deepEqual(
      tierCriteria.map((criteria) => criteria.groupType).sort(),
      [...GROUP_TYPES].sort()
    );
  }
});

test("getTierCriteria returns representative criteria", () => {
  const criteria = getTierCriteria("gold_platinum", "push_gank_like");

  assert.ok(criteria);
  assert.equal(criteria.tierGroup, "gold_platinum");
  assert.equal(criteria.groupType, "push_gank_like");
  assert.equal(criteria.nextGameGoalStyle, "conditional_decision");
});

test("getTierCriteria returns undefined for invalid combination", () => {
  assert.equal(
    getTierCriteria("invalid_tier", "push_gank_like"),
    undefined
  );
  assert.equal(
    getTierCriteria("gold_platinum", "invalid_group"),
    undefined
  );
});

test("getTierConfidenceRule returns tier-specific thresholds", () => {
  const ironSilver = getTierConfidenceRule("iron_silver");
  const masterPlus = getTierConfidenceRule("master_plus");

  assert.equal(ironSilver.strongThreshold, 3);
  assert.equal(masterPlus.strongThreshold, 4);
  assert.ok(masterPlus.highConfidenceRequires.includes("objective_setup"));
});

test("iron_silver strong threshold is lower than master_plus", () => {
  assert.ok(
    getTierConfidenceRule("iron_silver").strongThreshold <
      getTierConfidenceRule("master_plus").strongThreshold
  );
});

test("video-heavy groups use conservative evidence requirements", () => {
  assert.equal(
    getTierCriteria("gold_platinum", "wave_management_error_like")
      .evidenceRequirement,
    "video_required"
  );
  assert.equal(
    getTierCriteria("gold_platinum", "unsafe_warding_like").evidenceRequirement,
    "video_required"
  );
});

test("riotOnlySignals avoid subjective or video-only phrases", () => {
  const forbidden = [
    "actual vision",
    "wave crash",
    "minimap awareness",
    "player intent",
    "fight direction",
  ];

  for (const criteria of TIER_AWARE_PATTERN_CRITERIA) {
    const riotOnlyText = criteria.riotOnlySignals.join(" ").toLowerCase();
    for (const phrase of forbidden) {
      assert.equal(
        riotOnlyText.includes(phrase),
        false,
        `${criteria.tierGroup}/${criteria.groupType} included ${phrase}`
      );
    }
  }
});

test("videoRequiredSignals include wave, vision, and fight direction where appropriate", () => {
  assert.ok(
    getTierCriteria("emerald_diamond", "wave_management_error_like")
      .videoRequiredSignals.join(" ")
      .includes("actual wave crash state")
  );
  assert.ok(
    getTierCriteria("emerald_diamond", "unsafe_warding_like")
      .videoRequiredSignals.join(" ")
      .includes("actual vision state")
  );
  assert.ok(
    getTierCriteria("emerald_diamond", "no_flash_fight_like")
      .videoRequiredSignals.join(" ")
      .includes("fight direction")
  );
});

test("P0 next-game goal templates exist for all tiers", () => {
  const p0Groups = [
    "push_gank_like",
    "no_flash_fight_like",
    "solo_kill_conversion_like",
    "objective_setup_like",
  ];

  for (const tierGroup of PLAYER_TIER_GROUPS) {
    for (const groupType of p0Groups) {
      const template = getTierNextGameGoalTemplate(tierGroup, groupType);
      assert.ok(template, `${tierGroup}/${groupType}`);
      assert.equal(template.tierGroup, tierGroup);
      assert.equal(template.groupType, groupType);
      assert.match(template.templateKo, /다음 게임/);
    }
  }
  assert.equal(TIER_NEXT_GAME_GOAL_TEMPLATES.length, 16);
});

test("avoidOverCoaching differs between iron_silver and master_plus", () => {
  const ironSilver = getTierCriteria("iron_silver", "push_gank_like");
  const masterPlus = getTierCriteria("master_plus", "push_gank_like");

  assert.notDeepEqual(ironSilver.avoidOverCoaching, masterPlus.avoidOverCoaching);
  assert.ok(
    ironSilver.avoidOverCoaching.includes("objective trade EV")
  );
  assert.ok(masterPlus.avoidOverCoaching.includes("generic play safe advice"));
});

test("cautionKo strings are cautious and do not claim confirmed diagnosis", () => {
  for (const criteria of TIER_AWARE_PATTERN_CRITERIA) {
    assert.match(criteria.cautionKo, /후보|확인|단정|확정 진단이 아닙니다/);
    assert.doesNotMatch(criteria.cautionKo, /확정 원인|정답|반드시 원인/);
  }
  for (const rule of TIER_CONFIDENCE_RULES) {
    assert.match(rule.cautionKo, /후보|확인|피합니다|부족/);
    assert.doesNotMatch(rule.cautionKo, /확정 원인|정답|반드시 원인/);
  }
});
