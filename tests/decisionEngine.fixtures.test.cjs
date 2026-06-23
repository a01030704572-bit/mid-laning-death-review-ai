/* eslint-disable @typescript-eslint/no-require-imports -- Node fixture harness transpiles the real TypeScript modules without adding a test dependency. */
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
      throw new Error(`Unexpected runtime dependency in decision fixture: ${moduleName}`);
    },
    loadedModule,
    loadedModule.exports
  );

  return loadedModule.exports;
}

const { generateRiskTags } = loadTypeScriptModule("lib/riskTagMapper.ts");
const { determineScenarioType } = loadTypeScriptModule("lib/scenarioRouter.ts");
const { sanitizeUserFacingText } = loadTypeScriptModule("lib/userFacingText.ts");
const { getVisibleScenarioValues } = loadTypeScriptModule(
  "lib/scenarioOptionFilter.ts"
);

const baseInput = {
  playerTier: "gold",
  currentOutcome: "death",
  myChampion: "Ahri",
  enemyChampion: "Syndra",
  gameTime: "first_jungle_window",
  laneState: "neutral",
  beforeDeathAction: "trade",
  visionState: "unknown",
  enemyJungleLocation: "not_relevant",
  survivalResources: [],
  deathCause: "solo_kill",
  freeDescription: "",
  laneStateDetail: "unknown",
  allyJunglePosition: "unknown",
  visionPurpose: "unknown",
  postPushIntent: "unknown",
  teamSide: "unknown",
  movementSide: "unknown",
  wardLocationDetail: "unknown",
  enemyMidState: "unknown",
  allyJungleSideDetail: "unknown",
  enemyJungleInfoState: "not_sure",
  enemyJungleLastSeenSide: "unknown",
  allyJungleCoverState: "unknown",
  fightDirectionRelativeToCover: "unknown",
  postKillEscapePlan: "unknown",
  supportRoamState: "not_relevant",
  objectiveType: "unknown",
  timeToObjective: "unknown",
  midPriorityBeforeObjective: "unknown",
  objectivePrepAction: "unknown",
  allyJungleObjectiveIntent: "unknown",
  resourceBeforeObjective: "unknown",
  alternativeGainAvailable: "unknown",
  enemyKeyCooldownsKnown: "",
  myKeyCooldownsKnown: "",
  matchupNote: "",
};

function makeInput(overrides = {}) {
  return { ...baseInput, ...overrides };
}

function analyze(overrides = {}) {
  const input = makeInput(overrides);
  const riskTags = generateRiskTags(input);
  const scenarioType = determineScenarioType(input, riskTags);
  return { riskTags, scenarioType };
}

function assertIncludesAll(actual, expected) {
  for (const value of expected) {
    assert.ok(actual.includes(value), `Expected ${value}; received ${actual.join(", ")}`);
  }
}

test("SOLO_KILL_TRADE keeps priority over stale pre-lane defaults", () => {
  const { scenarioType } = analyze({
    currentOutcome: "solo_kill",
    gameTime: "pre_lane",
    laneState: "pre_lane",
  });

  assert.equal(scenarioType, "SOLO_KILL_TRADE");
});

test("legacy Level 3-E fields generate canonical enemy-cover tags", () => {
  const { riskTags, scenarioType } = analyze({
    enemyJungleInfoState: "seen_near",
    allyJungleCoverState: "opposite_side",
    fightDirectionRelativeToCover: "toward_enemy_jungle",
  });

  assert.equal(scenarioType, "SOLO_KILL_TRADE");
  assertIncludesAll(riskTags, [
    "FOUGHT_TOWARD_ENEMY_COVER",
    "FOUGHT_WITHOUT_ALLY_COVER",
    "FIGHT_DIRECTION_MISMATCH",
  ]);
});

test("actual browser Level 3-E values generate all cover and resource tags", () => {
  const { riskTags, scenarioType } = analyze({
    enemyJungleInfoBeforeFight: "seen_same_side",
    allyJungleCoverBeforeFight: "opposite_side",
    allyJungleSideDetail: "top_side_jungle",
    fightDirection: "toward_bot_side",
    allySupportStateBeforeFight: "locked_bot",
    survivalResources: ["no_flash", "low_hp"],
  });

  assert.equal(scenarioType, "SOLO_KILL_TRADE");
  assertIncludesAll(riskTags, [
    "FOUGHT_TOWARD_ENEMY_COVER",
    "FOUGHT_WITHOUT_ALLY_COVER",
    "IGNORED_KNOWN_ENEMY_JUNGLE",
    "ALLY_SUPPORT_CANNOT_MOVE",
    "FIGHT_DIRECTION_MISMATCH",
    "MID_JUNGLE_COVER_MISREAD",
    "NO_FLASH_WINDOW",
    "LOW_HP_STAY",
  ]);
});

test("enemy jungle seen opposite side does not count as nearby enemy cover", () => {
  const { riskTags } = analyze({
    enemyJungleInfoBeforeFight: "seen_opposite_side",
    fightDirection: "toward_bot_side",
  });

  assert.equal(riskTags.includes("FOUGHT_TOWARD_ENEMY_COVER"), false);
});

test("unknown enemy jungle does not create a directional enemy-cover tag", () => {
  const { riskTags } = analyze({
    enemyJungleInfoBeforeFight: "unknown",
    fightDirection: "toward_bot_side",
  });

  assert.equal(riskTags.includes("FOUGHT_TOWARD_ENEMY_COVER"), false);
});

test("center-mid fighting does not create a directional enemy-cover tag", () => {
  const { riskTags } = analyze({
    enemyJungleInfoBeforeFight: "seen_same_side",
    fightDirection: "center_mid",
  });

  assert.equal(riskTags.includes("FOUGHT_TOWARD_ENEMY_COVER"), false);
});

test("user-facing formatter removes raw objective values", () => {
  assert.equal(
    sanitizeUserFacingText("plate_objective에서 plates를 노렸다"),
    "플레이트를 노릴 수 있는 시간대에서 플레이트를 노릴 수 있는 시간대를 노렸다"
  );
  assert.equal(
    sanitizeUserFacingText("플레이트_objective"),
    "플레이트를 노릴 수 있는 시간대"
  );
  assert.equal(
    sanitizeUserFacingText("void_grubs, voidgrubs, void grubs, grubs, 보이드 그럽"),
    "공허 유충, 공허 유충, 공허 유충, 공허 유충, 공허 유충"
  );
  assert.equal(
    sanitizeUserFacingText("unexpected_internal_value"),
    "확인되지 않은 상태"
  );
  assert.equal(
    sanitizeUserFacingText(
      "enemyJungleInfoBeforeFight와 allyJungleCoverBeforeFight를 확인"
    ),
    "교전 전 상대 정글 위치 정보와 교전 전 아군 정글 커버 상태를 확인"
  );
  assert.equal(
    sanitizeUserFacingText("unmappedInternalField를 확인"),
    "입력 정보를 확인"
  );
});

test("objective outcomes show only objective-adjacent scenario options", () => {
  const scenarios = getVisibleScenarioValues("objective_fight_loss");

  assert.deepEqual(scenarios, [
    "OBJECTIVE_PREP_TURN",
    "ADVANTAGE_CONVERSION",
    "RECALL_GREED",
    "NOT_SURE",
  ]);
  assert.equal(scenarios.includes("PRE_LANE_VISION"), false);
});

test("fight outcomes prioritize duel scenarios and hide objective/pre-lane options", () => {
  const scenarios = getVisibleScenarioValues("failed_kill_attempt");

  assert.deepEqual(scenarios, [
    "SOLO_KILL_TRADE",
    "GANKED_WHILE_PUSHING",
    "NOT_SURE",
  ]);
  assert.equal(scenarios.includes("OBJECTIVE_PREP_TURN"), false);
  assert.equal(scenarios.includes("PRE_LANE_VISION"), false);
});

test("vision and generic death outcomes retain access to pre-lane review", () => {
  assert.equal(
    getVisibleScenarioValues("died_while_warding").includes(
      "PRE_LANE_VISION"
    ),
    true
  );
  assert.equal(
    getVisibleScenarioValues("death").includes("PRE_LANE_VISION"),
    true
  );
});

test("unclear outcomes retain every existing scenario option", () => {
  assert.equal(getVisibleScenarioValues("unknown").length, 8);
});

const objectiveFixtures = [
  {
    name: "force without mid priority and miss the alternative wave",
    input: {
      objectiveType: "dragon",
      timeToObjective: "under_thirty",
      midPriorityBeforeObjective: "no_prio",
      objectivePrepAction: "moved_first",
      allyJungleObjectiveIntent: "wants_objective",
      resourceBeforeObjective: "healthy",
      alternativeGainAvailable: "cs_wave",
    },
    tags: [
      "OBJECTIVE_FORCED_WITHOUT_MID_PRIO",
      "OBJECTIVE_TRADEOFF_MISREAD",
      "MISSED_ALTERNATIVE_GAIN",
    ],
  },
  {
    name: "recall after the objective already spawned",
    input: {
      objectiveType: "void_grubs",
      timeToObjective: "already_spawned",
      midPriorityBeforeObjective: "contested",
      objectivePrepAction: "recalled",
      allyJungleObjectiveIntent: "wants_objective",
      resourceBeforeObjective: "low_resource",
      alternativeGainAvailable: "none",
    },
    tags: ["BAD_RECALL_BEFORE_OBJECTIVE"],
  },
  {
    name: "stay for the objective with low resources",
    input: {
      objectiveType: "dragon",
      timeToObjective: "sixty_to_thirty",
      midPriorityBeforeObjective: "contested",
      objectivePrepAction: "stayed_low_resource",
      allyJungleObjectiveIntent: "wants_objective",
      resourceBeforeObjective: "low_mana_or_energy",
      alternativeGainAvailable: "reset",
    },
    tags: ["STAYED_LOW_RESOURCE_BEFORE_OBJECTIVE"],
  },
  {
    name: "follow late with a bad wave while jungle is opposite side",
    input: {
      objectiveType: "rift_herald",
      timeToObjective: "under_thirty",
      midPriorityBeforeObjective: "no_prio",
      objectivePrepAction: "followed_late",
      allyJungleObjectiveIntent: "opposite_side",
      resourceBeforeObjective: "healthy",
      alternativeGainAvailable: "plate",
    },
    tags: [
      "JOINED_OBJECTIVE_WITH_BAD_WAVE",
      "IGNORED_ALLY_JUNGLE_INTENT",
      "OBJECTIVE_TRADEOFF_MISREAD",
      "MISSED_ALTERNATIVE_GAIN",
    ],
  },
  {
    name: "prepare a healthy objective turn with priority",
    input: {
      objectiveType: "dragon",
      timeToObjective: "sixty_to_thirty",
      midPriorityBeforeObjective: "have_prio",
      objectivePrepAction: "pushed_mid",
      allyJungleObjectiveIntent: "wants_objective",
      resourceBeforeObjective: "healthy",
      alternativeGainAvailable: "none",
    },
    tags: ["GOOD_OBJECTIVE_PREP_TURN"],
  },
];

for (const fixture of objectiveFixtures) {
  test(`Level 3-F: ${fixture.name}`, () => {
    const { riskTags, scenarioType } = analyze({
      deathCause: "objective_prep_turn",
      beforeDeathAction: "objective_preparation",
      ...fixture.input,
    });

    assert.equal(scenarioType, "OBJECTIVE_PREP_TURN");
    assertIncludesAll(riskTags, fixture.tags);
  });
}
