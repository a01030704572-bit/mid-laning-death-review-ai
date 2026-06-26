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
      throw new Error(`Unexpected runtime dependency in evidence fixture: ${moduleName}`);
    },
    loadedModule,
    loadedModule.exports
  );

  return loadedModule.exports;
}

const { buildSceneEvidencePackage } = loadTypeScriptModule("lib/evidencePackage.ts");

function makeManualInput(overrides = {}) {
  return {
    currentOutcome: "death",
    sceneOutcomeAssessment: "death",
    deathCause: "ganked",
    freeDescription: "미드 푸시 후 강가 시야를 보러 가다 죽었다.",
    laneStateDetail: "slow_pushing_to_enemy",
    visionPurpose: "river_control",
    postPushIntent: "ward",
    survivalResources: ["flash"],
    ...overrides,
  };
}

function makeVideoDraft(overrides = {}) {
  return {
    suggestedScenarioType: "UNSAFE_WARDING",
    suggestedSceneOutcomeAssessment: "death",
    summary: "플레이어가 강가 쪽으로 이동한 뒤 교전에서 손해를 봅니다.",
    keyFacts: ["강가 쪽 이동이 보임", "적 미드가 먼저 붙음"],
    uncertainFacts: ["정글 위치는 화면 밖이라 불확실함"],
    suggestedFreeDescription: "시야를 잡으려다 위험한 위치로 들어간 장면입니다.",
    suggestedFields: {
      currentOutcome: "died_while_warding",
    },
    confidenceNote: "화면 밖 정보는 제한적입니다.",
    ...overrides,
  };
}

function makeRiotEvidence(overrides = {}) {
  return {
    events: [
      {
        timestampSec: 605,
        kind: "death",
        importance: "primary",
        description: "플레이어 사망",
        isPlayerInvolved: true,
        uncertainInfo: [],
      },
      {
        timestampSec: 620,
        kind: "objective",
        importance: "secondary",
        description: "드래곤 처치",
        isPlayerInvolved: false,
        uncertainInfo: [],
      },
    ],
    playerDelta: {
      csBefore: 88,
      csAfter: 88,
      csDelta: 0,
      totalGoldBefore: 5200,
      totalGoldAfter: 5280,
      totalGoldDelta: 80,
      currentGoldBefore: 600,
      currentGoldAfter: 680,
      currentGoldDelta: 80,
      xpBefore: 7600,
      xpAfter: 7600,
      xpDelta: 0,
      levelBefore: 10,
      levelAfter: 10,
      levelDelta: 0,
      isEstimated: true,
    },
    enemyMidDelta: {
      participantId: 6,
      championName: "Syndra",
      csBefore: 90,
      csAfter: 96,
      csDelta: 6,
      totalGoldDelta: 500,
      xpDelta: 300,
      isEstimated: true,
    },
    objectiveContext: {
      nearestObjective: "baron",
      timeToObjectiveSec: 175,
      objectiveKilledInWindow: true,
      actualObjectivesKilledInWindow: [
        {
          type: "dragon",
          timestampSec: 620,
          killerTeamId: 200,
        },
      ],
      impactsDeath: true,
      isEstimated: true,
    },
    gainLossDraft: {
      playerLosses: ["CS 손실 가능성"],
      enemyGains: ["적 미드 성장 가능성"],
      tempoImpact: "복귀 전까지 주도권 손실 가능성",
      objectiveImpact: "드래곤 처치와 연결될 수 있음",
      swingSummary: "사망 이후 드래곤 손실 가능성",
      confidence: "medium",
    },
    uncertainInfo: ["적 정글 관여 여부는 timeline만으로 확정할 수 없음"],
    ...overrides,
  };
}

test("manual-only package keeps manual source and marks missing video and Riot", () => {
  const manualInput = makeManualInput();
  const scenePackage = buildSceneEvidencePackage({ manualInput });

  assert.equal(scenePackage.sourcePresence.manual, true);
  assert.equal(scenePackage.sourcePresence.video, false);
  assert.equal(scenePackage.sourcePresence.riot, false);
  assert.equal(scenePackage.sourceConfidence.manual, "high");
  assert.equal(scenePackage.derivedContext.primarySceneType, "ganked");
  assert.ok(scenePackage.derivedContext.likelyReviewFocus.includes("death_review"));
  assert.ok(scenePackage.derivedContext.likelyReviewFocus.includes("vision_or_warding"));
  assert.ok(
    scenePackage.missingInfo.some((info) => info.includes("영상 초안이 없어"))
  );
  assert.ok(
    scenePackage.missingInfo.some((info) => info.includes("Riot timeline evidence"))
  );
});

test("video-only package keeps video facts without requiring metadata", () => {
  const videoDraft = makeVideoDraft();
  const scenePackage = buildSceneEvidencePackage({ videoDraft });

  assert.equal(scenePackage.sourcePresence.manual, false);
  assert.equal(scenePackage.sourcePresence.video, true);
  assert.equal(scenePackage.sourcePresence.riot, false);
  assert.equal(scenePackage.sourceConfidence.video, "medium");
  assert.equal(scenePackage.matchId, undefined);
  assert.ok(scenePackage.evidenceSummary.some((summary) => summary.includes("영상 초안 요약")));
  assert.ok(scenePackage.missingInfo.some((info) => info.includes("영상 불확실")));
  assert.ok(scenePackage.derivedContext.likelyReviewFocus.includes("vision_or_warding"));
});

test("Riot-only package trusts objective facts and keeps risk tags conservative", () => {
  const riotEvidence = makeRiotEvidence();
  const scenePackage = buildSceneEvidencePackage({ riotEvidence });

  assert.equal(scenePackage.sourcePresence.riot, true);
  assert.equal(scenePackage.sourceConfidence.riot, "medium");
  assert.ok(scenePackage.derivedContext.riskTagsFromEvidence.includes("RIOT_CONFIRMED_DEATH_EVENT"));
  assert.ok(scenePackage.derivedContext.riskTagsFromEvidence.includes("RIOT_OBJECTIVE_CONTEXT"));
  assert.ok(scenePackage.derivedContext.riskTagsFromEvidence.includes("RIOT_POSSIBLE_CS_LOSS"));
  assert.ok(scenePackage.derivedContext.likelyReviewFocus.includes("objective_tradeoff"));
  assert.ok(scenePackage.derivedContext.objectiveContext.includes("장면 내 처치된 오브젝트"));
  assert.ok(!scenePackage.derivedContext.riskTagsFromEvidence.includes("UNSAFE_WARDING"));
  assert.ok(!scenePackage.derivedContext.riskTagsFromEvidence.includes("ENEMY_JUNGLER_UNKNOWN"));
});

test("combined package preserves metadata and separates nearest and actual objective context", () => {
  const scenePackage = buildSceneEvidencePackage({
    manualInput: makeManualInput(),
    videoDraft: makeVideoDraft(),
    riotEvidence: makeRiotEvidence(),
    matchId: "KR_123",
    puuid: "player-puuid",
    gameTimeSec: 600,
    windowSec: 60,
  });

  assert.equal(scenePackage.sourcePresence.manual, true);
  assert.equal(scenePackage.sourcePresence.video, true);
  assert.equal(scenePackage.sourcePresence.riot, true);
  assert.equal(scenePackage.matchId, "KR_123");
  assert.equal(scenePackage.puuid, "player-puuid");
  assert.equal(scenePackage.gameTimeSec, 600);
  assert.equal(scenePackage.windowSec, 60);
  assert.match(scenePackage.derivedContext.objectiveContext, /가장 가까운 예정 오브젝트 추정: baron, 175초 후/);
  assert.match(scenePackage.derivedContext.objectiveContext, /장면 내 처치된 오브젝트: dragon 620초/);
});

test("simple conflict detection compares manual and Riot outcomes", () => {
  const scenePackage = buildSceneEvidencePackage({
    manualInput: makeManualInput({
      currentOutcome: "solo_kill",
      deathCause: "solo_kill",
      freeDescription: "솔킬각이라고 생각했다.",
    }),
    riotEvidence: makeRiotEvidence(),
  });

  assert.ok(
    scenePackage.conflicts.some(
      (conflict) =>
        conflict.field === "currentOutcome" &&
        conflict.sources.includes("manual") &&
        conflict.sources.includes("riot")
    )
  );
});

test("missing info includes uncertainty from video and Riot sources", () => {
  const scenePackage = buildSceneEvidencePackage({
    videoDraft: makeVideoDraft({ uncertainFacts: ["미니맵 정보는 화면에 없음"] }),
    riotEvidence: makeRiotEvidence({ uncertainInfo: ["상대 정글 위치는 확정 불가"] }),
  });

  assert.ok(scenePackage.missingInfo.some((info) => info.includes("미니맵 정보")));
  assert.ok(scenePackage.missingInfo.some((info) => info.includes("상대 정글 위치")));
});

test("builder does not mutate input objects", () => {
  const manualInput = makeManualInput();
  const videoDraft = makeVideoDraft();
  const riotEvidence = makeRiotEvidence();
  const before = JSON.parse(JSON.stringify({ manualInput, videoDraft, riotEvidence }));

  buildSceneEvidencePackage({ manualInput, videoDraft, riotEvidence });

  assert.deepEqual({ manualInput, videoDraft, riotEvidence }, before);
});

test("conservative riskTagsFromEvidence does not infer subjective vision or jungle tracking", () => {
  const scenePackage = buildSceneEvidencePackage({
    riotEvidence: makeRiotEvidence({
      events: [
        {
          timestampSec: 500,
          kind: "ward",
          importance: "minor",
          description: "와드 설치",
          isPlayerInvolved: true,
          uncertainInfo: [],
        },
      ],
      objectiveContext: {
        nearestObjective: "none",
        timeToObjectiveSec: null,
        objectiveKilledInWindow: false,
        actualObjectivesKilledInWindow: [],
        impactsDeath: false,
        isEstimated: true,
      },
      playerDelta: {
        ...makeRiotEvidence().playerDelta,
        csDelta: 3,
        xpDelta: 200,
        totalGoldDelta: 180,
      },
    }),
  });

  assert.deepEqual(scenePackage.derivedContext.riskTagsFromEvidence, []);
  assert.ok(scenePackage.derivedContext.likelyReviewFocus.includes("vision_or_warding"));
});
