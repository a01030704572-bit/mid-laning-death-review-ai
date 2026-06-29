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
        `Unexpected runtime dependency in elimination analyzer fixture: ${moduleName}`
      );
    },
    loadedModule,
    loadedModule.exports
  );

  return loadedModule.exports;
}

const tierCriteriaModule = loadTypeScriptModule(
  "lib/riot/tierAwarePatternCriteria.ts"
);
const analyzerModule = loadTypeScriptModule(
  "lib/riot/eliminationPatternAnalyzer.ts",
  {
    "@/lib/riot/tierAwarePatternCriteria": tierCriteriaModule,
  }
);

const {
  P0_ELIMINATION_GROUP_TYPES,
  analyzeSimilarSceneGroup,
  analyzeSimilarSceneGroups,
} = analyzerModule;

function scene(id, gameTimeSec = 600, overrides = {}) {
  return {
    id,
    matchId: overrides.matchId ?? "KR_ELIMINATION",
    gameTimeSec,
    type: overrides.type ?? "death_review_candidate",
    titleKo: "fixture scene",
    confidence: "medium",
    reasonKo: "fixture reason",
    evidence: [],
    riskTagSeeds: overrides.riskTagSeeds ?? [],
    sceneCandidateSeeds: overrides.sceneCandidateSeeds ?? [],
    missingInfo: overrides.missingInfo ?? [],
    reviewSeed: {
      source: "riot_auto_scene",
      noteKo: "fixture note",
      championName: overrides.championName ?? "Ahri",
      opponentChampionName: overrides.opponentChampionName ?? "Syndra",
      timeWindowSec: { startSec: gameTimeSec - 30, endSec: gameTimeSec + 30 },
    },
  };
}

function factor({
  labelKo,
  count,
  ratio,
  evidenceCertainty = "inferred_from_timeline",
  relatedRiskTags = [],
}) {
  return {
    labelKo,
    count,
    ratio,
    evidenceCertainty,
    relatedRiskTags,
  };
}

function group(groupType, overrides = {}) {
  const scenes =
    overrides.scenes ??
    [
      scene("scene-1", 500),
      scene("scene-2", 700),
      scene("scene-3", 900),
    ];
  return {
    id: overrides.id ?? `group:${groupType}:KR_ELIMINATION:500`,
    groupType,
    titleKo: "fixture group 후보",
    scenes,
    commonFactors:
      overrides.commonFactors ??
      [
        factor({
          labelKo: "상대 정글 개입/정글 위치 확인 필요",
          count: scenes.length,
          ratio: 1,
          relatedRiskTags: ["ENEMY_JUNGLER_UNKNOWN"],
        }),
      ],
    variableFactors: overrides.variableFactors ?? [],
  };
}

test("analyzeSimilarSceneGroups returns [] for empty input", () => {
  assert.deepEqual(analyzeSimilarSceneGroups([], "gold_platinum"), []);
});

test("non-P0 group is skipped", () => {
  const unsupported = group("unsafe_warding_like");
  assert.equal(analyzeSimilarSceneGroup(unsupported, "gold_platinum"), undefined);
  assert.deepEqual(analyzeSimilarSceneGroups([unsupported], "gold_platinum"), []);
});

test("push_gank_like group produces EliminationPatternResult", () => {
  const result = analyzeSimilarSceneGroup(
    group("push_gank_like"),
    "gold_platinum"
  );

  assert.ok(result);
  assert.equal(result.groupType, "push_gank_like");
  assert.equal(result.source, "similar_scene_grouping");
  assert.match(result.primaryPatternKo, /정글|갱킹|반복 후보/);
  assert.equal(result.id, `elimination:gold_platinum:push_gank_like:${result.groupId}`);
});

test("no_flash_fight_like group produces cautious no-flash repeated candidate", () => {
  const result = analyzeSimilarSceneGroup(
    group("no_flash_fight_like", {
      commonFactors: [
        factor({
          labelKo: "점멸/생존기 없는 상태",
          count: 3,
          ratio: 1,
          relatedRiskTags: ["NO_FLASH_WINDOW"],
        }),
      ],
    }),
    "iron_silver"
  );

  assert.match(result.primaryPatternKo, /점멸|생존기/);
  assert.match(result.reviewNoteKo, /후보|확인/);
});

test("solo_kill_conversion_like group uses conversion and tempo language", () => {
  const result = analyzeSimilarSceneGroup(
    group("solo_kill_conversion_like", {
      commonFactors: [
        factor({
          labelKo: "솔로킬 이후 이득 전환 확인 필요",
          count: 3,
          ratio: 1,
        }),
        factor({
          labelKo: "귀환/템포 전환 확인 필요",
          count: 2,
          ratio: 2 / 3,
        }),
      ],
    }),
    "gold_platinum"
  );

  assert.match(result.primaryPatternKo, /솔로킬|이득 전환/);
  assert.match(result.nextGameGoalKo, /킬|웨이브|리콜|플레이트/);
});

test("objective_setup_like group uses objective setup language", () => {
  const result = analyzeSimilarSceneGroup(
    group("objective_setup_like", {
      commonFactors: [
        factor({
          labelKo: "오브젝트 전 사망/준비 문제 가능성",
          count: 3,
          ratio: 1,
        }),
      ],
    }),
    "emerald_diamond"
  );

  assert.match(result.primaryPatternKo, /오브젝트|준비/);
  assert.match(result.nextGameGoalKo, /오브젝트/);
});

test("result uses tier criteria and includes tierGroup", () => {
  const result = analyzeSimilarSceneGroup(
    group("push_gank_like"),
    "master_plus"
  );

  assert.equal(result.tierGroup, "master_plus");
  assert.equal(result.evidenceRequirement, "video_recommended");
  assert.match(result.cautionKo, /후보|Riot timeline|영상/);
});

test("nextGameGoalKo differs between iron_silver and master_plus", () => {
  const input = group("push_gank_like");
  const lowTier = analyzeSimilarSceneGroup(input, "iron_silver");
  const highTier = analyzeSimilarSceneGroup(input, "master_plus");

  assert.notEqual(lowTier.nextGameGoalKo, highTier.nextGameGoalKo);
});

test("high confidence requires repeated factor frequency, not tier priority alone", () => {
  const result = analyzeSimilarSceneGroup(
    group("push_gank_like", {
      scenes: [scene("scene-1", 500), scene("scene-2", 700), scene("scene-3", 900)],
      commonFactors: [
        factor({
          labelKo: "jungle_tracking priority only",
          count: 1,
          ratio: 1 / 3,
          relatedRiskTags: ["ENEMY_JUNGLER_UNKNOWN"],
        }),
      ],
    }),
    "gold_platinum"
  );

  assert.notEqual(result.confidence, "high");
  assert.equal(result.repeatedFactors.length, 0);
});

test("broad coaching conclusions do not use confirmed_by_riot", () => {
  const result = analyzeSimilarSceneGroup(
    group("push_gank_like", {
      commonFactors: [
        factor({
          labelKo: "상대 정글 개입/정글 위치 확인 필요",
          count: 3,
          ratio: 1,
          evidenceCertainty: "confirmed_by_riot",
        }),
      ],
    }),
    "gold_platinum"
  );

  assert.ok(result.commonFactors.length > 0);
  assert.ok(
    result.commonFactors.every(
      (commonFactor) => commonFactor.evidenceCertainty !== "confirmed_by_riot"
    )
  );
});

test("eliminatedFactors include variable factor interpretation", () => {
  const result = analyzeSimilarSceneGroup(
    group("push_gank_like", {
      variableFactors: [
        "플레이 챔피언이 장면마다 다릅니다.",
        "상대 챔피언이 장면마다 다릅니다.",
        "여러 경기에서 반복된 후보입니다.",
        "발생 시간대가 장면마다 다릅니다.",
      ],
    }),
    "gold_platinum"
  );

  assert.equal(result.eliminatedFactors.length >= 4, true);
  assert.ok(
    result.eliminatedFactors.some((item) =>
      item.reasonKo.includes("특정 챔피언")
    )
  );
  assert.ok(
    result.eliminatedFactors.some((item) =>
      item.reasonKo.includes("한 경기의 우연")
    )
  );
});

test("cautionKo mentions Riot timeline limitation or confirmation when needed", () => {
  const result = analyzeSimilarSceneGroup(
    group("objective_setup_like"),
    "gold_platinum"
  );

  assert.match(result.cautionKo, /Riot timeline|영상|확인/);
  assert.match(result.reviewNoteKo, /영상\/사용자 확인/);
});

test("analyzeSimilarSceneGroup returns undefined for unsupported group", () => {
  assert.equal(
    analyzeSimilarSceneGroup(group("tempo_loss_like"), "gold_platinum"),
    undefined
  );
});

test("output order is deterministic", () => {
  const groups = [
    group("objective_setup_like", { id: "g3" }),
    group("push_gank_like", { id: "g1" }),
    group("no_flash_fight_like", { id: "g2" }),
    group("unsafe_warding_like", { id: "skip" }),
  ];
  const results = analyzeSimilarSceneGroups(groups, "gold_platinum");

  assert.deepEqual(
    results.map((result) => result.groupId),
    ["g3", "g1", "g2"]
  );
});

test("P0 list contains only required group types", () => {
  assert.deepEqual(P0_ELIMINATION_GROUP_TYPES, [
    "push_gank_like",
    "no_flash_fight_like",
    "solo_kill_conversion_like",
    "objective_setup_like",
  ]);
});

test("package test:fixtures includes elimination analyzer fixture", () => {
  const packageJson = fs.readFileSync(
    path.join(process.cwd(), "package.json"),
    "utf8"
  );
  assert.match(
    packageJson,
    /tests\/eliminationPatternAnalyzer\.fixtures\.test\.cjs/
  );
});
