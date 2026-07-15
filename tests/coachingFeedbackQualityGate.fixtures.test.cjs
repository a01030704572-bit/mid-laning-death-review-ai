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
      if (moduleName === "@/lib/coachingFeedbackGuards") {
        return loadTypeScriptModule("lib/coachingFeedbackGuards.ts");
      }
      if (moduleName === "@/lib/nextGameGoalSelector") {
        return loadTypeScriptModule("lib/nextGameGoalSelector.ts");
      }
      throw new Error(
        `Unexpected runtime dependency in coaching feedback quality gate fixture: ${moduleName}`
      );
    },
    loadedModule,
    loadedModule.exports
  );

  return loadedModule.exports;
}

const {
  DEFINITIVE_WORDING_WARNING,
  EMPTY_IMPROVEMENT_WARNING,
  EMPTY_STRENGTH_WARNING,
  HIGH_CONFIDENCE_WITHOUT_EVIDENCE_WARNING,
  LOW_EVIDENCE_HIGH_CONFIDENCE_WARNING,
  NEXT_GOAL_REPAIRED_WARNING,
  PERSONALIZATION_REPAIRED_WARNING,
  WEAK_RECURRING_PATTERN_WARNING,
  normalizeCoachingFeedback,
} = loadTypeScriptModule("lib/coachingFeedbackQualityGate.ts");

function createValidFeedback(overrides = {}) {
  return {
    matchId: "KR_1",
    puuid: "puuid-1",
    generatedAtIsoTimestamp: "2026-07-15T00:00:00.000Z",
    matchSummary: {
      titleKo: "이번 판 복기 초안",
      summaryKo: "자동 장면 후보를 바탕으로 복기 포인트를 정리했습니다.",
      overallHypothesisKo:
        "현재 근거 기준으로는 다음 판 목표 후보가 있을 수 있습니다.",
      confidence: "medium",
    },
    sceneReviews: [
      {
        sceneId: "scene-1",
        titleKo: "정글 개입 후보",
        sceneType: "jungle_collapse",
        reviewHypothesisKo:
          "복기용 가설: 상대 정글 위치를 확인할 후보입니다.",
        evidence: [
          {
            source: "riot",
            confidence: "medium",
            labelKo: "Riot 이벤트 근거",
            sceneId: "scene-1",
          },
        ],
        confidence: "medium",
        correctionKo:
          "상대 정글 위치가 보이기 전에는 시야 없는 방향으로 압박하지 않습니다.",
      },
    ],
    strengths: [
      {
        id: "strength-1",
        category: "lane_priority",
        evidenceSceneIds: ["scene-1"],
        feedbackKo: "라인 주도권을 만든 점은 유지할 후보입니다.",
      },
    ],
    improvementCandidates: [
      {
        id: "improvement-1",
        category: "jungle_tracking",
        severity: "medium",
        repeatScore: 10,
        evidenceSceneIds: ["scene-1"],
        feedbackKo: "정글 위치 확인 전 압박을 줄이는 후보입니다.",
      },
    ],
    recurringPatterns: [
      {
        id: "pattern-1",
        category: "jungle_tracking",
        occurrenceCount: 2,
        evidenceSceneIds: ["scene-1"],
        hypothesisKo: "정글 위치 미확인 압박 반복 후보입니다.",
        confidence: "medium",
      },
    ],
    nextGameGoal: {
      goalKo:
        "다음 판에는 상대 정글 위치가 보이지 않을 때 시야 없는 방향으로 길게 압박하지 마세요.",
      triggerKo: "상대 정글 위치가 안 보일 때",
      successConditionKo:
        "압박 전에 강가 시야, 정글 위치, 아군 커버 중 하나를 확인합니다.",
      basedOn: {
        sceneIds: ["scene-1"],
        improvementCandidateId: "improvement-1",
      },
    },
    evidenceConfidence: "medium",
    personalization: {
      profileApplied: false,
    },
    ...overrides,
  };
}

test("valid feedback passes unchanged", () => {
  const feedback = createValidFeedback();
  const result = normalizeCoachingFeedback(feedback);

  assert.equal(result.changed, false);
  assert.deepEqual(result.feedback, feedback);
  assert.deepEqual(result.warnings, []);
});

test("missing or incomplete nextGameGoal is repaired", () => {
  const result = normalizeCoachingFeedback(
    createValidFeedback({
      nextGameGoal: {
        goalKo: "",
        triggerKo: "",
        successConditionKo: "",
        basedOn: { sceneIds: [] },
      },
    })
  );

  assert.equal(result.changed, true);
  assert.ok(result.warnings.includes(NEXT_GOAL_REPAIRED_WARNING));
  assert.ok(result.feedback.nextGameGoal.goalKo);
  assert.ok(result.feedback.nextGameGoal.triggerKo);
  assert.ok(result.feedback.nextGameGoal.successConditionKo);
});

test("high confidence scene without evidence is downgraded", () => {
  const result = normalizeCoachingFeedback(
    createValidFeedback({
      sceneReviews: [
        {
          ...createValidFeedback().sceneReviews[0],
          confidence: "high",
          evidence: [],
        },
      ],
    })
  );

  assert.equal(result.changed, true);
  assert.equal(result.feedback.sceneReviews[0].confidence, "low");
  assert.ok(result.warnings.includes(HIGH_CONFIDENCE_WITHOUT_EVIDENCE_WARNING));
});

test("all-low evidence prevents high scene confidence", () => {
  const result = normalizeCoachingFeedback(
    createValidFeedback({
      sceneReviews: [
        {
          ...createValidFeedback().sceneReviews[0],
          confidence: "high",
          evidence: [
            {
              source: "manual",
              confidence: "low",
              labelKo: "낮은 신뢰도 근거",
            },
          ],
        },
      ],
    })
  );

  assert.equal(result.changed, true);
  assert.equal(result.feedback.sceneReviews[0].confidence, "medium");
  assert.ok(result.warnings.includes(LOW_EVIDENCE_HIGH_CONFIDENCE_WARNING));
});

test("overall evidenceConfidence high without evidence is downgraded", () => {
  const result = normalizeCoachingFeedback(
    createValidFeedback({
      sceneReviews: [
        {
          ...createValidFeedback().sceneReviews[0],
          confidence: "medium",
          evidence: [],
        },
      ],
      evidenceConfidence: "high",
    })
  );

  assert.equal(result.changed, true);
  assert.equal(result.feedback.evidenceConfidence, "medium");
});

test("matchSummary high confidence is downgraded when evidenceConfidence is low", () => {
  const result = normalizeCoachingFeedback(
    createValidFeedback({
      sceneReviews: [],
      evidenceConfidence: "high",
      matchSummary: {
        ...createValidFeedback().matchSummary,
        confidence: "high",
      },
    })
  );

  assert.equal(result.changed, true);
  assert.equal(result.feedback.evidenceConfidence, "low");
  assert.equal(result.feedback.matchSummary.confidence, "low");
});

test("empty strengths warns but does not invent fake strength", () => {
  const result = normalizeCoachingFeedback(
    createValidFeedback({ strengths: [] })
  );

  assert.equal(result.feedback.strengths.length, 0);
  assert.ok(result.warnings.includes(EMPTY_STRENGTH_WARNING));
});

test("empty improvementCandidates warns", () => {
  const result = normalizeCoachingFeedback(
    createValidFeedback({ improvementCandidates: [] })
  );

  assert.equal(result.feedback.improvementCandidates.length, 0);
  assert.ok(result.warnings.includes(EMPTY_IMPROVEMENT_WARNING));
});

test("occurrenceCount <= 1 recurring pattern is downgraded", () => {
  const result = normalizeCoachingFeedback(
    createValidFeedback({
      recurringPatterns: [
        {
          ...createValidFeedback().recurringPatterns[0],
          occurrenceCount: 1,
          confidence: "high",
        },
      ],
    })
  );

  assert.equal(result.changed, true);
  assert.equal(result.feedback.recurringPatterns[0].confidence, "low");
  assert.ok(result.warnings.includes(WEAK_RECURRING_PATTERN_WARNING));
});

test("personalization applied without confidence is corrected", () => {
  const result = normalizeCoachingFeedback(
    createValidFeedback({
      personalization: {
        profileApplied: true,
        styleLabels: ["stable"],
      },
    })
  );

  assert.equal(result.changed, true);
  assert.equal(result.feedback.personalization.profileApplied, false);
  assert.equal(
    result.feedback.personalization.profileConfidence,
    "insufficient_data"
  );
  assert.ok(result.warnings.includes(PERSONALIZATION_REPAIRED_WARNING));
});

test("definitive wording warning is emitted", () => {
  const result = normalizeCoachingFeedback(
    createValidFeedback({
      matchSummary: {
        ...createValidFeedback().matchSummary,
        overallHypothesisKo: "이 장면은 확정 원인입니다.",
      },
    })
  );

  assert.equal(result.changed, false);
  assert.ok(result.warnings.includes(DEFINITIVE_WORDING_WARNING));
});

test("input mutation is not performed", () => {
  const feedback = createValidFeedback({
    sceneReviews: [
      {
        ...createValidFeedback().sceneReviews[0],
        confidence: "high",
        evidence: [],
      },
    ],
  });
  const before = JSON.stringify(feedback);

  normalizeCoachingFeedback(feedback);

  assert.equal(JSON.stringify(feedback), before);
});
