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
        `Unexpected runtime dependency in match scene ranker fixture: ${moduleName}`
      );
    },
    loadedModule,
    loadedModule.exports
  );

  return loadedModule.exports;
}

const { rankMatchScenes, clusterScenes, SCENE_SCORING_RULES } = loadTypeScriptModule(
  "lib/riot/matchSceneRanker.ts"
);

function makeIdentityContext(overrides = {}) {
  return {
    matchId: "KR_1",
    targetParticipantId: 1,
    targetTeamId: 100,
    target: {
      participantId: 1,
      teamId: 100,
      side: "ally",
      championName: "Ahri",
      puuid: "player-puuid",
      role: "MIDDLE",
      isTarget: true,
    },
    participants: [],
    allies: [],
    enemies: [],
    participantsById: {},
    enemyMid: {
      participantId: 6,
      teamId: 200,
      side: "enemy",
      championName: "Syndra",
      role: "MIDDLE",
      isTarget: false,
    },
    objectives: [],
    missingInfo: [],
    ...overrides,
  };
}

function makeCandidate(overrides = {}) {
  const type = overrides.type ?? "solo_kill_candidate";
  const gameTimeSec = overrides.gameTimeSec ?? 600;
  return {
    id: overrides.id ?? `KR_1:${type}:${gameTimeSec}:0`,
    matchId: overrides.matchId ?? "KR_1",
    gameTimeSec,
    type,
    titleKo: overrides.titleKo ?? "자동 장면 후보",
    confidence: overrides.confidence ?? "high",
    reasonKo: overrides.reasonKo ?? "Riot timeline 기반 후보입니다.",
    evidence:
      overrides.evidence ??
      [
        {
          source: "riot_timeline",
          certainty: "confirmed_by_riot",
          eventTimeSec: gameTimeSec,
          timeWindowSec: {
            startSec: Math.max(0, gameTimeSec - 30),
            endSec: gameTimeSec + 30,
          },
          eventTypes: ["CHAMPION_KILL"],
          participantIds: [1, 6],
          summaryKo: "Riot timeline에서 CHAMPION_KILL 이벤트가 확인됩니다.",
        },
      ],
    riskTagSeeds: overrides.riskTagSeeds ?? [],
    sceneCandidateSeeds: overrides.sceneCandidateSeeds ?? [],
    missingInfo: overrides.missingInfo ?? [],
    reviewSeed: {
      source: "riot_auto_scene",
      currentOutcome: overrides.currentOutcome,
      primaryCause: overrides.primaryCause,
      scenarioType: overrides.scenarioType,
      noteKo: overrides.noteKo ?? "추가 확인이 필요한 자동 후보입니다.",
      championName: "Ahri",
      opponentChampionName: "Syndra",
      timeWindowSec: overrides.timeWindowSec ?? {
        startSec: Math.max(0, gameTimeSec - 30),
        endSec: gameTimeSec + 30,
      },
    },
  };
}

function rank(autoSceneCandidates, options = {}) {
  return rankMatchScenes({
    autoSceneCandidates,
    riotIdentityContext: makeIdentityContext(),
    matchId: "KR_1",
    puuid: "player-puuid",
    ...options,
  });
}

test("scoring rules are keyed by actual AutoSceneType values", () => {
  assert.deepEqual(Object.keys(SCENE_SCORING_RULES).sort(), [
    "blind_roaming_candidate",
    "death_review_candidate",
    "jungle_gank_death_candidate",
    "no_flash_fight_candidate",
    "objective_setup_failure_candidate",
    "poor_resource_management_candidate",
    "post_kill_conversion_candidate",
    "solo_kill_candidate",
    "support_roam_collapse_candidate",
    "tempo_loss_candidate",
    "unsafe_warding_candidate",
    "wave_management_error_candidate",
  ]);
});

test("solo kill or fight advantage with positive gain appears in topScenes", () => {
  const report = rank([
    makeCandidate({
      type: "solo_kill_candidate",
      currentOutcome: "fight_advantage",
      reasonKo: "교전에서 이득을 본 후보입니다. 골드 +816 XP +804",
      evidence: [
        {
          source: "riot_timeline",
          certainty: "confirmed_by_riot",
          eventTimeSec: 610,
          timeWindowSec: { startSec: 580, endSec: 640 },
          eventTypes: ["CHAMPION_KILL"],
          participantIds: [1, 6],
          summaryKo: "플레이어 킬 이후 골드 +816, XP +804",
        },
      ],
    }),
  ]);

  assert.equal(report.analysisStatus, "complete");
  assert.equal(report.topScenes.length, 1);
  assert.equal(report.topScenes[0].autoSceneType, "solo_kill_candidate");
  assert.equal(report.topScenes[0].sceneValence, "good_decision");
  assert.equal(
    report.topScenes[0].primaryScenarioId,
    "successful_solo_kill_good_conversion"
  );
});

test("jungle gank death candidate has confirmation questions", () => {
  const report = rank([
    makeCandidate({
      type: "jungle_gank_death_candidate",
      riskTagSeeds: ["ENEMY_JUNGLER_UNKNOWN", "NO_RIVER_VISION"],
      primaryCause: "enemy_jungle_involved",
      reasonKo: "상대 jungle 관여가 있는 사망 후보입니다.",
    }),
  ]);

  const scene = report.rankedScenes[0];
  assert.equal(scene.autoSceneType, "jungle_gank_death_candidate");
  assert.equal(scene.sceneValence, "bad_decision");
  assert.ok(scene.confirmationQuestions.length >= 2);
  assert.ok(
    scene.confirmationQuestions.some((question) =>
      question.questionKo.includes("상대 정글 위치")
    )
  );
});

test("empty candidates returns partial analysis and no top scenes", () => {
  const report = rank([]);

  assert.equal(report.analysisStatus, "partial");
  assert.deepEqual(report.rankedScenes, []);
  assert.deepEqual(report.improvementScenes, []);
  assert.deepEqual(report.strengthScenes, []);
  assert.deepEqual(report.topScenes, []);
  assert.deepEqual(report.habitSignals, []);
  assert.deepEqual(report.weaknessSignals, []);
  assert.deepEqual(report.strengthSignals, []);
});

test("multiple candidates are sorted by reviewWorthinessScore descending", () => {
  const report = rank([
    makeCandidate({
      id: "low",
      type: "poor_resource_management_candidate",
      confidence: "low",
      gameTimeSec: 900,
    }),
    makeCandidate({
      id: "high",
      type: "jungle_gank_death_candidate",
      confidence: "high",
      gameTimeSec: 300,
      riskTagSeeds: ["ENEMY_JUNGLER_UNKNOWN", "NO_RIVER_VISION"],
      reasonKo: "상대 jungle 관여가 있는 사망 후보입니다.",
    }),
    makeCandidate({
      id: "medium",
      type: "solo_kill_candidate",
      confidence: "medium",
      gameTimeSec: 600,
    }),
  ]);

  const scores = report.rankedScenes.map(
    (scene) => scene.reviewWorthinessScore
  );
  assert.deepEqual(scores, [...scores].sort((left, right) => right - left));
  assert.equal(report.rankedScenes[0].sceneId, "high");
});

test("maxTopScenes limits top scene count", () => {
  const report = rank(
    [
      makeCandidate({ id: "one", type: "jungle_gank_death_candidate" }),
      makeCandidate({ id: "two", type: "solo_kill_candidate", gameTimeSec: 700 }),
      makeCandidate({ id: "three", type: "tempo_loss_candidate", gameTimeSec: 900 }),
    ],
    { maxTopScenes: 2 }
  );

  assert.equal(report.rankedScenes.length, 3);
  assert.equal(report.topScenes.length, 2);
});

test("nearby scenes within cluster window become one bundle with highest score representative", () => {
  const report = rank([
    makeCandidate({
      id: "lower-782",
      type: "death_review_candidate",
      confidence: "medium",
      gameTimeSec: 782,
    }),
    makeCandidate({
      id: "higher-800",
      type: "jungle_gank_death_candidate",
      confidence: "high",
      gameTimeSec: 800,
      riskTagSeeds: ["ENEMY_JUNGLER_UNKNOWN", "NO_RIVER_VISION"],
      reasonKo: "enemy jungle gank duplicate candidate",
    }),
  ]);

  assert.equal(report.sceneBundles.length, 1);
  assert.equal(report.sceneBundles[0].representative.sceneId, "higher-800");
  assert.deepEqual(
    report.sceneBundles[0].nearby.map((scene) => scene.sceneId),
    ["lower-782"]
  );
  assert.deepEqual(
    report.topScenes.map((scene) => scene.sceneId),
    ["higher-800"]
  );
});

test("scenes outside the cluster window stay in separate bundles", () => {
  const report = rank([
    makeCandidate({
      id: "scene-782",
      type: "death_review_candidate",
      gameTimeSec: 782,
    }),
    makeCandidate({
      id: "scene-820",
      type: "no_flash_fight_candidate",
      gameTimeSec: 820,
      riskTagSeeds: ["NO_FLASH_WINDOW"],
    }),
  ]);

  assert.equal(report.sceneBundles.length, 2);
  assert.deepEqual(
    report.sceneBundles.map((bundle) => bundle.representative.sceneId).sort(),
    ["scene-782", "scene-820"].sort()
  );
});

test("same timestamp nearby multi-type scenes become same_event_multi_type bundle", () => {
  const report = rank([
    makeCandidate({
      id: "scene-782",
      type: "death_review_candidate",
      gameTimeSec: 782,
    }),
    makeCandidate({
      id: "scene-784",
      type: "jungle_gank_death_candidate",
      gameTimeSec: 784,
      riskTagSeeds: ["ENEMY_JUNGLER_UNKNOWN"],
      reasonKo: "enemy jungle nearby",
    }),
    makeCandidate({
      id: "scene-785",
      type: "unsafe_warding_candidate",
      gameTimeSec: 785,
    }),
  ]);

  assert.equal(report.sceneBundles.length, 1);
  assert.equal(report.sceneBundles[0].clusterType, "same_event_multi_type");
  assert.equal(report.sceneBundles[0].startTimeSec, 782);
  assert.equal(report.sceneBundles[0].endTimeSec, 785);
});

test("empty scenes return empty scene bundles and top scenes", () => {
  const report = rank([]);

  assert.deepEqual(report.sceneBundles, []);
  assert.deepEqual(report.topScenes, []);
});

test("solo kill and post-kill conversion nearby stay separate when lessons differ", () => {
  const report = rank([
    makeCandidate({
      id: "solo-500",
      type: "solo_kill_candidate",
      gameTimeSec: 500,
    }),
    makeCandidate({
      id: "conversion-530",
      type: "post_kill_conversion_candidate",
      gameTimeSec: 530,
      riskTagSeeds: ["POST_KILL_ESCAPE_RISK"],
    }),
  ]);

  assert.equal(report.sceneBundles.length, 2);
  assert.deepEqual(
    report.sceneBundles.map((bundle) => bundle.representative.sceneId).sort(),
    ["conversion-530", "solo-500"].sort()
  );
});

test("rankedScenes remains full score-sorted list while subsets are curated", () => {
  const candidates = [
    makeCandidate({
      id: "low",
      type: "poor_resource_management_candidate",
      confidence: "low",
      gameTimeSec: 900,
    }),
    makeCandidate({
      id: "high",
      type: "jungle_gank_death_candidate",
      confidence: "high",
      gameTimeSec: 300,
      riskTagSeeds: ["ENEMY_JUNGLER_UNKNOWN", "NO_RIVER_VISION"],
      reasonKo: "상대 jungle 관여가 있는 사망 후보입니다.",
    }),
    makeCandidate({
      id: "strength",
      type: "solo_kill_candidate",
      confidence: "high",
      gameTimeSec: 600,
    }),
  ];
  const report = rank(candidates);

  assert.equal(report.rankedScenes.length, candidates.length);
  assert.deepEqual(
    report.rankedScenes.map((scene) => scene.reviewWorthinessScore),
    [...report.rankedScenes]
      .map((scene) => scene.reviewWorthinessScore)
      .sort((left, right) => right - left)
  );
  assert.ok(report.improvementScenes.length > 0);
  assert.ok(report.strengthScenes.length > 0);
});

test("good decisions appear in strengthScenes and risky scenes appear in improvementScenes", () => {
  const report = rank([
    makeCandidate({
      id: "good",
      type: "solo_kill_candidate",
      confidence: "high",
      gameTimeSec: 600,
    }),
    makeCandidate({
      id: "bad",
      type: "no_flash_fight_candidate",
      confidence: "high",
      gameTimeSec: 900,
      riskTagSeeds: ["NO_FLASH_WINDOW"],
    }),
    makeCandidate({
      id: "missed",
      type: "objective_setup_failure_candidate",
      confidence: "medium",
      gameTimeSec: 1100,
    }),
  ]);

  assert.deepEqual(
    report.strengthScenes.map((scene) => scene.sceneId),
    ["good"]
  );
  assert.ok(
    report.improvementScenes.some((scene) => scene.sceneId === "bad")
  );
  assert.ok(
    report.improvementScenes.some((scene) => scene.sceneId === "missed")
  );
});

test("topScenes includes both strength and improvement when both are available", () => {
  const report = rank([
    makeCandidate({
      id: "improve-high",
      type: "jungle_gank_death_candidate",
      confidence: "high",
      gameTimeSec: 300,
      riskTagSeeds: ["ENEMY_JUNGLER_UNKNOWN", "NO_RIVER_VISION"],
      reasonKo: "상대 jungle 관여가 있는 사망 후보입니다.",
    }),
    makeCandidate({
      id: "strength-lower",
      type: "solo_kill_candidate",
      confidence: "medium",
      gameTimeSec: 700,
    }),
    makeCandidate({
      id: "improve-next",
      type: "no_flash_fight_candidate",
      confidence: "high",
      gameTimeSec: 900,
      riskTagSeeds: ["NO_FLASH_WINDOW"],
    }),
  ]);

  assert.ok(
    report.topScenes.some((scene) => scene.sceneValence === "good_decision")
  );
  assert.ok(report.topScenes.some((scene) => scene.sceneValence !== "good_decision"));
});

test("near-duplicate scenes within 30 seconds are reduced when alternatives exist", () => {
  const report = rank([
    makeCandidate({
      id: "death-600",
      type: "jungle_gank_death_candidate",
      confidence: "high",
      gameTimeSec: 600,
      riskTagSeeds: ["ENEMY_JUNGLER_UNKNOWN", "NO_RIVER_VISION"],
      reasonKo: "상대 jungle 관여가 있는 사망 후보입니다.",
    }),
    makeCandidate({
      id: "death-620",
      type: "death_review_candidate",
      confidence: "high",
      gameTimeSec: 620,
    }),
    makeCandidate({
      id: "flash-900",
      type: "no_flash_fight_candidate",
      confidence: "high",
      gameTimeSec: 900,
      riskTagSeeds: ["NO_FLASH_WINDOW"],
    }),
    makeCandidate({
      id: "solo-1000",
      type: "solo_kill_candidate",
      confidence: "high",
      gameTimeSec: 1000,
    }),
    makeCandidate({
      id: "solo-1020",
      type: "solo_kill_candidate",
      confidence: "medium",
      gameTimeSec: 1020,
    }),
    makeCandidate({
      id: "solo-1300",
      type: "solo_kill_candidate",
      confidence: "low",
      gameTimeSec: 1300,
    }),
  ]);

  assert.ok(
    !(
      report.improvementScenes.some((scene) => scene.sceneId === "death-600") &&
      report.improvementScenes.some((scene) => scene.sceneId === "death-620")
    )
  );
  assert.ok(
    report.improvementScenes.some((scene) => scene.sceneId === "flash-900")
  );
  assert.ok(
    !(
      report.strengthScenes.some((scene) => scene.sceneId === "solo-1000") &&
      report.strengthScenes.some((scene) => scene.sceneId === "solo-1020")
    )
  );
  assert.ok(
    report.strengthScenes.some((scene) => scene.sceneId === "solo-1300")
  );
});

test("strengthSignals and weaknessSignals are generated from curated scene groups", () => {
  const report = rank([
    makeCandidate({
      id: "good",
      type: "solo_kill_candidate",
      confidence: "high",
      gameTimeSec: 600,
    }),
    makeCandidate({
      id: "bad",
      type: "jungle_gank_death_candidate",
      confidence: "high",
      gameTimeSec: 900,
      riskTagSeeds: ["ENEMY_JUNGLER_UNKNOWN", "NO_RIVER_VISION"],
      reasonKo: "상대 jungle 관여가 있는 사망 후보입니다.",
    }),
  ]);

  assert.ok(
    report.strengthSignals.some(
      (signal) => signal.strengthType === "STRONG_SOLO_KILL_EXECUTION"
    )
  );
  assert.ok(
    report.weaknessSignals.some(
      (signal) => signal.habitType === "PUSHED_WITHOUT_JUNGLE_TRACKING"
    )
  );
});
