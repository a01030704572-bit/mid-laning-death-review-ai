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
      throw new Error(`Unexpected runtime dependency in review evidence fixture: ${moduleName}`);
    },
    loadedModule,
    loadedModule.exports
  );

  return loadedModule.exports;
}

const evidencePackageModule = loadTypeScriptModule("lib/evidencePackage.ts");

const baseReviewResult = {
  scenario_type: "GENERAL_LANING_DEATH",
  main_question: "fixture question",
  follow_up_questions: ["fixture follow up"],
  possible_risk_factors: [],
  next_laning_goal: "fixture goal",
  risk_checklist: ["fixture checklist"],
  confidence_note: "fixture confidence",
};

function makeInput(overrides = {}) {
  return {
    playerTier: "gold",
    currentOutcome: "death",
    sceneOutcomeAssessment: "death",
    myChampion: "Ahri",
    enemyChampion: "Syndra",
    gameTime: "10:00",
    laneState: "neutral",
    beforeDeathAction: "ward",
    visionState: "unknown",
    enemyJungleLocation: "unknown",
    survivalResources: [],
    deathCause: "ganked",
    freeDescription: "강가 시야를 보러 가다가 죽었다.",
    laneStateDetail: "slow_pushing_to_enemy",
    allyJunglePosition: "unknown",
    visionPurpose: "river_control",
    postPushIntent: "ward",
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
    ...overrides,
  };
}

function makeVideoDraft() {
  return {
    suggestedScenarioType: "UNSAFE_WARDING",
    suggestedSceneOutcomeAssessment: "death",
    summary: "강가 쪽 이동 후 사망",
    keyFacts: ["강가 이동", "적 미드 합류"],
    uncertainFacts: ["정글 위치는 화면 밖"],
    suggestedFreeDescription: "시야를 잡으려다 위험한 위치로 들어간 장면입니다.",
    suggestedFields: {
      currentOutcome: "died_while_warding",
    },
    confidenceNote: "화면 밖 정보는 제한적입니다.",
  };
}

function makeRiotEvidence() {
  return {
    events: [
      {
        timestampSec: 610,
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
      csBefore: 90,
      csAfter: 90,
      csDelta: 0,
      totalGoldBefore: 5000,
      totalGoldAfter: 5080,
      totalGoldDelta: 80,
      currentGoldBefore: 600,
      currentGoldAfter: 680,
      currentGoldDelta: 80,
      xpBefore: 7000,
      xpAfter: 7000,
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
      totalGoldDelta: 450,
      xpDelta: 300,
      isEstimated: true,
    },
    objectiveContext: {
      nearestObjective: "dragon",
      timeToObjectiveSec: 20,
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
      enemyGains: ["드래곤 처치"],
      tempoImpact: "복귀 전 주도권 손실 가능성",
      objectiveImpact: "드래곤 손실 가능성",
      swingSummary: "사망 후 드래곤 손실 가능성",
      confidence: "medium",
    },
    uncertainInfo: ["타임라인만으로 의도는 알 수 없음"],
  };
}

function loadReviewRoute({
  buildSceneEvidencePackage = evidencePackageModule.buildSceneEvidencePackage,
} = {}) {
  const captured = {
    promptInputs: [],
    prompts: [],
  };

  const routeModule = loadTypeScriptModule("app/api/review/route.ts", {
    "next/server": {
      NextResponse: {
        json: (body, init = {}) => ({
          body,
          status: init.status ?? 200,
        }),
      },
    },
    "@/lib/evidencePackage": {
      buildSceneEvidencePackage,
    },
    "@/lib/riskTagMapper": {
      generateRiskTags: () => ["NO_RIVER_VISION"],
    },
    "@/lib/prompts": {
      buildReviewPrompt: (input, riskTags, coachingCategories, knowledge, scenarioType) => {
        captured.promptInputs.push(input);
        const prompt = JSON.stringify({
          currentOutcome: input.currentOutcome,
          deathCause: input.deathCause,
          riskTags,
          coachingCategories,
          knowledge,
          scenarioType,
        });
        captured.prompts.push(prompt);
        return prompt;
      },
    },
    "@/lib/coachingCategoryMapper": {
      mapCoachingCategories: () => ["CORE_MID_LANE"],
    },
    "@/lib/coachingKnowledge": {
      buildCoachingKnowledgeBlock: () => "fixture knowledge",
    },
    "@/lib/scenarioRouter": {
      determineScenarioType: () => "GENERAL_LANING_DEATH",
    },
    "@/lib/ai/generateReview": {
      generateCoachingReview: async (prompt) => {
        captured.generatedPrompt = prompt;
        return JSON.stringify(baseReviewResult);
      },
    },
  });

  return { routeModule, captured };
}

async function postReview(routeModule, body) {
  return routeModule.POST({
    json: async () => body,
  });
}

test("existing /api/review response remains compatible", async () => {
  const { routeModule } = loadReviewRoute();
  const response = await postReview(routeModule, makeInput());

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.riskTags, ["NO_RIVER_VISION"]);
  assert.equal(response.body.scenarioType, "GENERAL_LANING_DEATH");
  assert.deepEqual(response.body.result, baseReviewResult);
  assert.ok(Array.isArray(response.body.coachingCategories));
});

test("manual-only review returns evidenceMetadata with manual sourcePresence true", async () => {
  const { routeModule } = loadReviewRoute();
  const response = await postReview(routeModule, makeInput());

  assert.equal(response.status, 200);
  assert.equal(response.body.evidenceMetadata.sourcePresence.manual, true);
  assert.equal(response.body.evidenceMetadata.sourcePresence.video, false);
  assert.equal(response.body.evidenceMetadata.sourcePresence.riot, false);
  assert.equal(response.body.evidenceMetadata.sourceConfidence.manual, "high");
});

test("missing videoDraft and riotEvidence does not fail the review", async () => {
  const { routeModule } = loadReviewRoute();
  const response = await postReview(routeModule, { manualInput: makeInput() });

  assert.equal(response.status, 200);
  assert.equal(response.body.result.main_question, "fixture question");
  assert.equal(response.body.evidenceMetadata.sourcePresence.video, false);
  assert.equal(response.body.evidenceMetadata.sourcePresence.riot, false);
});

test("evidenceMetadata does not include raw or heavy source snapshots", async () => {
  const { routeModule } = loadReviewRoute();
  const response = await postReview(routeModule, {
    manualInput: makeInput(),
    videoDraft: makeVideoDraft(),
    riotEvidence: makeRiotEvidence(),
  });

  const metadata = response.body.evidenceMetadata;
  assert.equal("sources" in metadata, false);
  assert.equal("conflicts" in metadata, false);
  assert.equal("events" in metadata, false);
  assert.equal("playerDelta" in metadata, false);
  assert.equal("enemyMidDelta" in metadata, false);
  assert.equal(metadata.sourcePresence.manual, true);
  assert.equal(metadata.sourcePresence.video, true);
  assert.equal(metadata.sourcePresence.riot, true);
  assert.equal(metadata.conflictsSummary.count >= 0, true);
});

test("Evidence Package generation failure does not crash the review request", async () => {
  const { routeModule } = loadReviewRoute({
    buildSceneEvidencePackage: () => {
      throw new Error("fixture evidence failure");
    },
  });
  const response = await postReview(routeModule, {
    manualInput: makeInput(),
    videoDraft: makeVideoDraft(),
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.result.main_question, "fixture question");
  assert.equal(response.body.evidenceMetadata.packageGenerationFailed, true);
  assert.equal(response.body.evidenceMetadata.sourcePresence.manual, true);
  assert.equal(response.body.evidenceMetadata.sourcePresence.video, true);
});

test("AI prompt behavior is not changed by evidenceMetadata", async () => {
  const { routeModule, captured } = loadReviewRoute();
  const input = makeInput();
  const videoDraft = makeVideoDraft();
  const riotEvidence = makeRiotEvidence();
  const response = await postReview(routeModule, {
    manualInput: input,
    videoDraft,
    riotEvidence,
  });

  assert.equal(response.status, 200);
  assert.deepEqual(captured.promptInputs[0], input);
  assert.equal("videoDraft" in captured.promptInputs[0], false);
  assert.equal("riotEvidence" in captured.promptInputs[0], false);
  assert.doesNotMatch(captured.generatedPrompt, /evidenceMetadata/);
  assert.doesNotMatch(captured.generatedPrompt, /Riot delta/);
});
