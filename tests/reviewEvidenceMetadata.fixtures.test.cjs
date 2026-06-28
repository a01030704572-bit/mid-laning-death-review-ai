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
const coachingMetricsModule = loadTypeScriptModule("lib/coachingMetrics.ts");
const sceneCandidateMapperModule = loadTypeScriptModule(
  "lib/sceneCandidateMapper.ts",
  {
    "@/lib/coachingMetrics": coachingMetricsModule,
  }
);

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
  generateRiskTags = () => ["NO_RIVER_VISION"],
  generateCoachingReview,
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
    "@/lib/coachingMetrics": coachingMetricsModule,
    "@/lib/sceneCandidateMapper": sceneCandidateMapperModule,
    "@/lib/riskTagMapper": {
      generateRiskTags,
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
      generateCoachingReview: generateCoachingReview ?? (async (prompt) => {
        captured.generatedPrompt = prompt;
        return JSON.stringify(baseReviewResult);
      }),
    },
    "@/lib/ai/geminiProvider": {
      GEMINI_QUOTA_ERROR_MESSAGE:
        "Gemini 무료 요청 한도를 초과했습니다. 잠시 후 다시 시도하거나 모델/결제 설정을 확인해 주세요.",
      GEMINI_UNAVAILABLE_ERROR_MESSAGE:
        "Gemini 모델이 일시적으로 혼잡합니다. 잠시 후 다시 시도해 주세요.",
      getGeminiErrorLogContext: (error) => ({
        status: error?.status,
        code: error?.code,
        message: error instanceof Error ? error.message : undefined,
      }),
      isGeminiQuotaError: (error) =>
        error?.status === 429 ||
        error?.code === "RESOURCE_EXHAUSTED" ||
        error?.message?.includes("RESOURCE_EXHAUSTED"),
      isGeminiUnavailableError: (error) =>
        error?.status === 503 ||
        error?.code === "UNAVAILABLE" ||
        error?.message?.includes("UNAVAILABLE"),
    },
  });

  return { routeModule, captured };
}

function restoreEnv(name, value) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
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

test("/api/review evidenceMetadata includes compact sceneCandidates when risk tags map to candidates", async () => {
  const { routeModule } = loadReviewRoute({
    generateRiskTags: () => [
      "NO_RIVER_VISION",
      "ENEMY_JUNGLER_UNKNOWN",
      "NO_FLASH_WINDOW",
      "UNSAFE_WARDING",
    ],
  });
  const response = await postReview(routeModule, {
    manualInput: makeInput(),
    videoDraft: makeVideoDraft(),
    riotEvidence: makeRiotEvidence(),
  });

  assert.equal(response.status, 200);
  const sceneCandidates = response.body.evidenceMetadata.sceneCandidates;
  assert.ok(sceneCandidates);
  assert.equal(sceneCandidates.candidates.length <= 3, true);
  assert.ok(
    sceneCandidates.candidateScenarioIds.includes(
      "fight_with_unknown_enemy_jungler"
    )
  );
  assert.ok(sceneCandidates.candidateMetricIds.length > 0);
  assert.ok(sceneCandidates.candidateHabitPatternIds.length > 0);
  assert.match(sceneCandidates.noteKo, /복기 후보/);

  const firstCandidate = sceneCandidates.candidates[0];
  assert.equal(typeof firstCandidate.displayNameKo, "string");
  assert.equal(typeof firstCandidate.reasonKo, "string");
  assert.equal(Array.isArray(firstCandidate.matchedRiskTags), true);
  assert.equal(Array.isArray(firstCandidate.limitingFactors), true);
  assert.equal("boostingEvidence" in firstCandidate, false);
  assert.equal("sources" in sceneCandidates, false);
});

test("sceneCandidates do not change AI prompt behavior", async () => {
  const { routeModule, captured } = loadReviewRoute({
    generateRiskTags: () => ["NO_FLASH_WINDOW"],
  });
  const input = makeInput();
  const response = await postReview(routeModule, input);

  assert.equal(response.status, 200);
  assert.ok(response.body.evidenceMetadata.sceneCandidates);
  assert.deepEqual(captured.promptInputs[0], input);
  assert.doesNotMatch(captured.generatedPrompt, /sceneCandidates/);
  assert.doesNotMatch(captured.generatedPrompt, /fight_without_flash_or_escape/);
});

test("empty or unknown risk tags do not break evidenceMetadata", async () => {
  for (const generateRiskTags of [
    () => [],
    () => ["UNKNOWN_FIXTURE_TAG"],
  ]) {
    const { routeModule } = loadReviewRoute({ generateRiskTags });
    const response = await postReview(routeModule, makeInput());

    assert.equal(response.status, 200);
    assert.ok(response.body.evidenceMetadata.sceneCandidates);
    assert.deepEqual(response.body.evidenceMetadata.sceneCandidates.candidates, []);
    assert.deepEqual(
      response.body.evidenceMetadata.sceneCandidates.candidateScenarioIds,
      []
    );
  }
});

test("EvidenceMetadataPreview renders scene candidates as candidates, not final diagnosis", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "components", "EvidenceMetadataPreview.tsx"),
    "utf8"
  );

  assert.match(source, /장면 후보/);
  assert.match(source, /추가 확인 필요/);
  assert.match(source, /sceneCandidates\.noteKo/);
  assert.match(source, /가능성/);
  assert.doesNotMatch(source, /정답|원인 확정/);
});

test("/api/review maps Gemini quota and unavailable errors", async () => {
  for (const fixture of [
    {
      status: 429,
      code: "RESOURCE_EXHAUSTED",
      message: "429 RESOURCE_EXHAUSTED generate_content_free_tier_requests",
      expected:
        "Gemini 무료 요청 한도를 초과했습니다. 잠시 후 다시 시도하거나 모델/결제 설정을 확인해 주세요.",
    },
    {
      status: 503,
      code: "UNAVAILABLE",
      message: "503 UNAVAILABLE high demand",
      expected: "Gemini 모델이 일시적으로 혼잡합니다. 잠시 후 다시 시도해 주세요.",
    },
  ]) {
    const { routeModule } = loadReviewRoute({
      generateCoachingReview: async () => {
        const error = new Error(fixture.message);
        error.status = fixture.status;
        error.code = fixture.code;
        error.headers = {
          "x-request-id": "gemini_review_req_fixture_should_not_reach_client",
        };
        throw error;
      },
    });

    const response = await postReview(routeModule, makeInput());

    assert.equal(response.status, fixture.status);
    assert.deepEqual(Object.keys(response.body), ["error"]);
    assert.equal(response.body.error, fixture.expected);
    assert.equal(
      JSON.stringify(response.body).includes("gemini_review_req_fixture"),
      false
    );
  }
});

test("AI_REVIEW_MOCK skips external review generation but keeps evidence metadata", async () => {
  const originalMock = process.env.AI_REVIEW_MOCK;
  let externalCallCount = 0;
  const { routeModule } = loadReviewRoute({
    generateCoachingReview: async () => {
      externalCallCount += 1;
      throw new Error("external call should be skipped");
    },
  });

  try {
    process.env.AI_REVIEW_MOCK = "true";
    const response = await postReview(routeModule, {
      manualInput: makeInput(),
      videoDraft: makeVideoDraft(),
    });

    assert.equal(response.status, 200);
    assert.equal(externalCallCount, 0);
    assert.match(response.body.result.main_question, /\[DEV MOCK\]/);
    assert.equal(response.body.evidenceMetadata.sourcePresence.manual, true);
    assert.equal(response.body.evidenceMetadata.sourcePresence.video, true);
  } finally {
    restoreEnv("AI_REVIEW_MOCK", originalMock);
  }
});
