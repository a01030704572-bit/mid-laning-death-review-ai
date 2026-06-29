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
        `Unexpected runtime dependency in similar scene fixture: ${moduleName}`
      );
    },
    loadedModule,
    loadedModule.exports
  );

  return loadedModule.exports;
}

const { groupSimilarAutoScenes } = loadTypeScriptModule(
  "lib/riot/similarSceneGrouping.ts"
);

function candidate(overrides = {}) {
  const type = overrides.type ?? "death_review_candidate";
  const gameTimeSec = overrides.gameTimeSec ?? 600;
  const matchId = overrides.matchId ?? "KR_GROUP";
  return {
    id: overrides.id ?? `${matchId}:${type}:${gameTimeSec}:0`,
    matchId,
    gameTimeSec,
    type,
    titleKo: overrides.titleKo ?? "fixture candidate",
    confidence: overrides.confidence ?? "medium",
    reasonKo: overrides.reasonKo ?? "fixture reason",
    evidence: overrides.evidence ?? [
      {
        source: "riot_timeline",
        certainty: "inferred_from_timeline",
        eventTypes: ["FIXTURE"],
        summaryKo: "fixture evidence",
      },
    ],
    riskTagSeeds: overrides.riskTagSeeds ?? [],
    sceneCandidateSeeds: overrides.sceneCandidateSeeds ?? [],
    missingInfo: overrides.missingInfo ?? [],
    reviewSeed: {
      source: "riot_auto_scene",
      noteKo: "fixture note",
      championName: overrides.championName ?? "Ahri",
      opponentChampionName: overrides.opponentChampionName ?? "Syndra",
      timeWindowSec: { startSec: gameTimeSec - 30, endSec: gameTimeSec + 30 },
      ...overrides.reviewSeed,
    },
  };
}

function findGroup(groups, groupType) {
  return groups.find((group) => group.groupType === groupType);
}

test("returns [] for empty candidate list", () => {
  assert.deepEqual(groupSimilarAutoScenes([]), []);
});

test("groups jungle gank and death candidates into push_gank_like", () => {
  const groups = groupSimilarAutoScenes([
    candidate({
      id: "gank-1",
      type: "jungle_gank_death_candidate",
      gameTimeSec: 500,
    }),
    candidate({
      id: "gank-2",
      type: "death_review_candidate",
      gameTimeSec: 700,
      riskTagSeeds: ["UNTRACKED_PUSH", "ENEMY_JUNGLER_UNKNOWN"],
    }),
  ]);

  const group = findGroup(groups, "push_gank_like");
  assert.ok(group);
  assert.equal(group.scenes.length, 2);
});

test("groups post_kill_conversion_candidate into solo kill conversion and tempo loss", () => {
  const scenes = [
    candidate({
      id: "conversion-1",
      type: "post_kill_conversion_candidate",
      gameTimeSec: 700,
      missingInfo: ["post kill wave recall conversion"],
    }),
    candidate({
      id: "conversion-2",
      type: "post_kill_conversion_candidate",
      gameTimeSec: 900,
      missingInfo: ["이득 전환 리콜 템포 확인 필요"],
    }),
  ];
  const groups = groupSimilarAutoScenes(scenes);

  assert.ok(findGroup(groups, "solo_kill_conversion_like"));
  assert.ok(findGroup(groups, "tempo_loss_like"));
});

test("groups objective setup candidates into objective_setup_like", () => {
  const groups = groupSimilarAutoScenes([
    candidate({
      id: "objective-1",
      type: "objective_setup_failure_candidate",
      gameTimeSec: 1000,
    }),
    candidate({
      id: "objective-2",
      type: "death_review_candidate",
      gameTimeSec: 1100,
      missingInfo: ["dragon objective setup 확인 필요"],
    }),
  ]);

  assert.ok(findGroup(groups, "objective_setup_like"));
});

test("groups no flash and no escape seeds into no_flash_fight_like", () => {
  const groups = groupSimilarAutoScenes([
    candidate({
      id: "flash-1",
      riskTagSeeds: ["NO_FLASH_WINDOW"],
      gameTimeSec: 600,
    }),
    candidate({
      id: "flash-2",
      riskTagSeeds: ["NO_ESCAPE_TOOL"],
      gameTimeSec: 800,
    }),
  ]);

  assert.ok(findGroup(groups, "no_flash_fight_like"));
});

test("groups support roam and ally cover seeds into support_roam_collapse_like", () => {
  const groups = groupSimilarAutoScenes([
    candidate({
      id: "support-1",
      riskTagSeeds: ["ENEMY_SUPPORT_ROAM_WINDOW"],
      gameTimeSec: 600,
    }),
    candidate({
      id: "support-2",
      riskTagSeeds: ["ALLY_SUPPORT_CANNOT_MOVE", "FOUGHT_WITHOUT_ALLY_COVER"],
      gameTimeSec: 800,
    }),
  ]);

  assert.ok(findGroup(groups, "support_roam_collapse_like"));
});

test("allows one candidate in multiple groups but not duplicated inside one group", () => {
  const shared = candidate({
    id: "shared-conversion",
    type: "post_kill_conversion_candidate",
    gameTimeSec: 700,
    missingInfo: ["post kill wave recall tempo conversion"],
  });
  const groups = groupSimilarAutoScenes([
    shared,
    candidate({
      id: "conversion-peer",
      type: "post_kill_conversion_candidate",
      gameTimeSec: 900,
      missingInfo: ["post kill recall"],
    }),
  ]);

  const conversionGroup = findGroup(groups, "solo_kill_conversion_like");
  const tempoGroup = findGroup(groups, "tempo_loss_like");
  assert.ok(conversionGroup.scenes.some((scene) => scene.id === shared.id));
  assert.ok(tempoGroup.scenes.some((scene) => scene.id === shared.id));
  assert.equal(
    conversionGroup.scenes.filter((scene) => scene.id === shared.id).length,
    1
  );
});

test("respects minScenesPerGroup option", () => {
  const scenes = [
    candidate({
      id: "single-gank",
      type: "jungle_gank_death_candidate",
      gameTimeSec: 600,
    }),
  ];

  assert.deepEqual(groupSimilarAutoScenes(scenes), []);
  assert.ok(
    findGroup(
      groupSimilarAutoScenes(scenes, { minScenesPerGroup: 1 }),
      "push_gank_like"
    )
  );
});

test("respects maxScenesPerGroup and keeps deterministic order", () => {
  const groups = groupSimilarAutoScenes(
    [900, 300, 700, 500].map((time) =>
      candidate({
        id: `gank-${time}`,
        type: "jungle_gank_death_candidate",
        gameTimeSec: time,
      })
    ),
    { maxScenesPerGroup: 2 }
  );

  const group = findGroup(groups, "push_gank_like");
  assert.deepEqual(
    group.scenes.map((scene) => scene.gameTimeSec),
    [300, 500]
  );
});

test("commonFactors include count, ratio, certainty, and related risk tags", () => {
  const groups = groupSimilarAutoScenes([
    candidate({
      id: "flash-factor-1",
      riskTagSeeds: ["NO_FLASH_WINDOW"],
      gameTimeSec: 600,
    }),
    candidate({
      id: "flash-factor-2",
      riskTagSeeds: ["NO_FLASH_WINDOW", "NO_ESCAPE_TOOL"],
      gameTimeSec: 800,
    }),
  ]);
  const group = findGroup(groups, "no_flash_fight_like");
  const factor = group.commonFactors.find((item) =>
    item.labelKo.includes("점멸")
  );

  assert.equal(factor.count, 2);
  assert.equal(factor.ratio, 1);
  assert.equal(factor.evidenceCertainty, "inferred_from_timeline");
  assert.ok(factor.relatedRiskTags.includes("NO_FLASH_WINDOW"));
});

test("variableFactors identify multiple champions, opponents, matches, and phases", () => {
  const groups = groupSimilarAutoScenes([
    candidate({
      id: "var-1",
      type: "jungle_gank_death_candidate",
      matchId: "KR_A",
      gameTimeSec: 500,
      championName: "Ahri",
      opponentChampionName: "Syndra",
    }),
    candidate({
      id: "var-2",
      type: "jungle_gank_death_candidate",
      matchId: "KR_B",
      gameTimeSec: 1600,
      championName: "Orianna",
      opponentChampionName: "Yasuo",
    }),
  ]);
  const group = findGroup(groups, "push_gank_like");

  assert.ok(group.variableFactors.some((item) => item.includes("플레이 챔피언")));
  assert.ok(group.variableFactors.some((item) => item.includes("상대 챔피언")));
  assert.ok(group.variableFactors.some((item) => item.includes("여러 경기")));
  assert.ok(group.variableFactors.some((item) => item.includes("시간대")));
});

test("does not use confirmed_by_riot for broad coaching conclusions", () => {
  const groups = groupSimilarAutoScenes([
    candidate({
      id: "resource-1",
      riskTagSeeds: ["LOW_HP_STAY"],
      gameTimeSec: 600,
    }),
    candidate({
      id: "resource-2",
      riskTagSeeds: ["COOLDOWN_DISRESPECT"],
      missingInfo: ["cooldown 확인 필요"],
      gameTimeSec: 800,
    }),
  ]);

  for (const group of groups) {
    for (const factor of group.commonFactors) {
      assert.notEqual(factor.evidenceCertainty, "confirmed_by_riot");
    }
  }
});

test("all group titles use cautious Korean wording", () => {
  const groups = groupSimilarAutoScenes([
    candidate({
      id: "title-1",
      type: "jungle_gank_death_candidate",
      gameTimeSec: 600,
    }),
    candidate({
      id: "title-2",
      type: "jungle_gank_death_candidate",
      gameTimeSec: 800,
    }),
  ]);

  assert.ok(groups.length > 0);
  assert.ok(groups.every((group) => group.titleKo.includes("후보")));
  assert.ok(groups.every((group) => !/확정|정답|원인 확정/.test(group.titleKo)));
});

test("generic deaths without information signal do not group into information gathering failure", () => {
  const groups = groupSimilarAutoScenes([
    candidate({
      id: "generic-1",
      type: "death_review_candidate",
      gameTimeSec: 600,
    }),
    candidate({
      id: "generic-2",
      type: "death_review_candidate",
      gameTimeSec: 800,
    }),
  ]);

  assert.equal(findGroup(groups, "information_gathering_failure_like"), undefined);
});
