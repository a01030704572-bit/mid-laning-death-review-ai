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
        `Unexpected runtime dependency in coaching feedback draft mapper fixture: ${moduleName}`
      );
    },
    loadedModule,
    loadedModule.exports
  );

  return loadedModule.exports;
}

const {
  buildCoachingFeedbackDraftFromScenes,
  inferEvidenceConfidenceFromScene,
  mapSceneToImprovementCategory,
  mapSceneTypeToCoachingSceneType,
} = loadTypeScriptModule("lib/coachingFeedbackDraftMapper.ts");
const {
  getCoachingFeedbackQualityWarnings,
  hasExactlyOneNextGameGoal,
} = loadTypeScriptModule("lib/coachingFeedbackGuards.ts");

function makeScene(overrides = {}) {
  return {
    sceneId: "scene-1",
    matchId: "KR_1",
    gameTimeSec: 548,
    autoSceneType: "jungle_gank_death_candidate",
    sceneValence: "bad_decision",
    reviewWorthinessScore: 96,
    displayNameKo: "정글 개입 사망 후보",
    evidenceSummaryKo: "상대 정글 개입 가능성이 있는 사망 이벤트입니다.",
    riotEvidenceSummary: ["548초에 CHAMPION_KILL 이벤트가 확인되었습니다."],
    confirmationQuestions: [],
    habitSignals: [],
    ...overrides,
  };
}

test("empty input returns valid CoachingFeedback with fallback nextGameGoal", () => {
  const feedback = buildCoachingFeedbackDraftFromScenes({});

  assert.equal(feedback.sceneReviews.length, 0);
  assert.equal(feedback.evidenceConfidence, "low");
  assert.equal(hasExactlyOneNextGameGoal(feedback), true);
  assert.equal(feedback.nextGameGoal.basedOn.sceneIds.length, 0);
});

test("top scene creates one sceneReview", () => {
  const feedback = buildCoachingFeedbackDraftFromScenes({
    matchId: "KR_1",
    puuid: "player-puuid",
    topScenes: [makeScene()],
  });

  assert.equal(feedback.matchId, "KR_1");
  assert.equal(feedback.puuid, "player-puuid");
  assert.equal(feedback.sceneReviews.length, 1);
  assert.equal(feedback.sceneReviews[0].sceneId, "scene-1");
  assert.equal(feedback.sceneReviews[0].sceneType, "jungle_collapse");
  assert.ok(feedback.sceneReviews[0].reviewHypothesisKo.includes("복기용 가설"));
});

test("improvement scene creates improvementCandidate and nextGameGoal based on it", () => {
  const feedback = buildCoachingFeedbackDraftFromScenes({
    improvementScenes: [
      makeScene({
        sceneId: "improve-1",
        autoSceneType: "objective_setup_failure_candidate",
        displayNameKo: "오브젝트 전 준비 손실 후보",
        sceneValence: "missed_opportunity",
      }),
    ],
  });

  assert.equal(feedback.improvementCandidates.length, 1);
  assert.equal(feedback.improvementCandidates[0].category, "objective_setup");
  assert.equal(
    feedback.nextGameGoal.basedOn.improvementCandidateId,
    "improvement-improve-1"
  );
  assert.deepEqual(feedback.nextGameGoal.basedOn.sceneIds, ["improve-1"]);
});

test("strength scene creates CoachingStrength", () => {
  const feedback = buildCoachingFeedbackDraftFromScenes({
    strengthScenes: [
      makeScene({
        sceneId: "strength-1",
        autoSceneType: "solo_kill_candidate",
        sceneValence: "good_decision",
        displayNameKo: "솔로킬 좋은 판단 후보",
      }),
    ],
  });

  assert.equal(feedback.strengths.length, 1);
  assert.equal(feedback.strengths[0].id, "strength-strength-1");
  assert.equal(feedback.strengths[0].category, "kill_angle");
});

test("videoEvidence on a scene creates video evidence item", () => {
  const feedback = buildCoachingFeedbackDraftFromScenes({
    topScenes: [
      makeScene({
        videoEvidenceStatus: "attached",
        videoEvidence: {
          confidence: "confirmed",
          noteKo: "근처 클립이 연결되었습니다.",
        },
      }),
    ],
  });
  const evidence = feedback.sceneReviews[0].evidence;

  assert.ok(evidence.some((item) => item.source === "video"));
  assert.equal(feedback.evidenceConfidence, "high");
});

test("recurringPatterns remains empty if no repeated metadata exists", () => {
  const feedback = buildCoachingFeedbackDraftFromScenes({
    rankedScenes: [makeScene()],
  });

  assert.deepEqual(feedback.recurringPatterns, []);
});

test("no input mutation", () => {
  const input = {
    rankedScenes: [makeScene()],
    improvementScenes: [makeScene({ sceneId: "improve-1" })],
  };
  const before = JSON.stringify(input);

  buildCoachingFeedbackDraftFromScenes(input);

  assert.equal(JSON.stringify(input), before);
});

test("output passes guard checks with expected warnings only", () => {
  const feedback = buildCoachingFeedbackDraftFromScenes({
    topScenes: [makeScene()],
    improvementScenes: [makeScene({ sceneId: "improve-1" })],
    strengthScenes: [
      makeScene({
        sceneId: "strength-1",
        autoSceneType: "solo_kill_candidate",
        sceneValence: "good_decision",
      }),
    ],
  });
  const warnings = getCoachingFeedbackQualityWarnings(feedback);

  assert.equal(hasExactlyOneNextGameGoal(feedback), true);
  assert.deepEqual(warnings, []);
});

test("nextGameGoal is always present and complete", () => {
  const feedback = buildCoachingFeedbackDraftFromScenes({
    topScenes: [
      makeScene({
        sceneId: "scene-no-evidence",
        riotEvidenceSummary: [],
        evidenceSummaryKo: undefined,
      }),
    ],
  });

  assert.equal(hasExactlyOneNextGameGoal(feedback), true);
  assert.ok(feedback.nextGameGoal.goalKo);
  assert.ok(feedback.nextGameGoal.triggerKo);
  assert.ok(feedback.nextGameGoal.successConditionKo);
});

test("high confidence is not assigned when no evidence exists", () => {
  const feedback = buildCoachingFeedbackDraftFromScenes({
    topScenes: [
      makeScene({
        sceneId: "scene-no-evidence",
        riotEvidenceSummary: [],
        evidenceSummaryKo: undefined,
        reviewWorthinessScore: 88,
      }),
    ],
  });

  assert.notEqual(feedback.sceneReviews[0].confidence, "high");
  assert.equal(inferEvidenceConfidenceFromScene(feedback.sceneReviews[0]), "low");
});

test("scene type and improvement category helpers map common scene strings", () => {
  const conversionScene = makeScene({
    autoSceneType: "post_kill_conversion_candidate",
  });

  assert.equal(
    mapSceneTypeToCoachingSceneType(conversionScene),
    "post_kill_conversion"
  );
  assert.equal(
    mapSceneToImprovementCategory(conversionScene),
    "post_kill_conversion"
  );
});
