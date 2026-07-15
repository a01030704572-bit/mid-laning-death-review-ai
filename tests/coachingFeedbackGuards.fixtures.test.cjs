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
        `Unexpected runtime dependency in coaching feedback guard fixture: ${moduleName}`
      );
    },
    loadedModule,
    loadedModule.exports
  );

  return loadedModule.exports;
}

const {
  getCoachingFeedbackQualityWarnings,
  hasEvidenceBackedSceneReviews,
  hasExactlyOneNextGameGoal,
} = loadTypeScriptModule("lib/coachingFeedbackGuards.ts");

function createValidFeedback(overrides = {}) {
  return {
    matchId: "KR_1",
    puuid: "puuid-1",
    generatedAtIsoTimestamp: "2026-07-15T00:00:00.000Z",
    matchSummary: {
      titleKo: "이번 판 복기 요약",
      summaryKo: "정글 위치 확인 전 압박 장면을 먼저 복기합니다.",
      overallHypothesisKo: "복기용 가설로는 시야 없는 압박이 핵심 후보입니다.",
      confidence: "medium",
    },
    sceneReviews: [
      {
        sceneId: "scene-1",
        titleKo: "9분 강가 압박 장면",
        sceneType: "jungle_collapse",
        reviewHypothesisKo: "상대 정글 위치 확인 전 압박한 후보입니다.",
        evidence: [
          {
            source: "riot",
            confidence: "medium",
            labelKo: "근처 사망 이벤트",
            sceneId: "scene-1",
          },
        ],
        confidence: "medium",
        correctionKo: "웨이브를 밀기 전에 정글 위치부터 확인합니다.",
      },
    ],
    strengths: [
      {
        id: "strength-1",
        category: "lane_priority",
        evidenceSceneIds: ["scene-1"],
        feedbackKo: "라인 주도권을 만든 점은 유지할 만합니다.",
      },
    ],
    improvementCandidates: [
      {
        id: "improvement-1",
        category: "jungle_tracking",
        severity: "medium",
        repeatScore: 0.6,
        evidenceSceneIds: ["scene-1"],
        feedbackKo: "정글 위치 확인 후 압박하는 습관을 우선 체크합니다.",
      },
    ],
    recurringPatterns: [
      {
        id: "pattern-1",
        category: "jungle_tracking",
        occurrenceCount: 2,
        evidenceSceneIds: ["scene-1"],
        hypothesisKo: "시야 없는 쪽으로 압박하는 반복 후보입니다.",
        confidence: "medium",
      },
    ],
    nextGameGoal: {
      goalKo: "상대 정글 위치가 확인되기 전까지 시야 없는 쪽으로 압박하지 않기.",
      triggerKo: "미드 웨이브를 길게 밀기 전",
      successConditionKo: "압박 전에 강가 시야 또는 정글 위치를 한 번 확인합니다.",
      basedOn: {
        sceneIds: ["scene-1"],
        improvementCandidateId: "improvement-1",
      },
    },
    evidenceConfidence: "medium",
    ...overrides,
  };
}

test("valid minimal feedback passes guard checks", () => {
  const feedback = createValidFeedback();

  assert.equal(hasExactlyOneNextGameGoal(feedback), true);
  assert.equal(hasEvidenceBackedSceneReviews(feedback), true);
  assert.deepEqual(getCoachingFeedbackQualityWarnings(feedback), []);
});

test("missing nextGameGoal fields warns", () => {
  const feedback = createValidFeedback({
    nextGameGoal: {
      goalKo: " ",
      triggerKo: "미드 웨이브를 밀기 전",
      successConditionKo: "",
      basedOn: { sceneIds: ["scene-1"] },
    },
  });
  const warnings = getCoachingFeedbackQualityWarnings(feedback);

  assert.equal(hasExactlyOneNextGameGoal(feedback), false);
  assert.ok(
    warnings.some((warning) =>
      warning.includes("goalKo, triggerKo, successConditionKo")
    )
  );
});

test("high confidence scene without evidence warns and fails evidence guard", () => {
  const feedback = createValidFeedback({
    sceneReviews: [
      {
        ...createValidFeedback().sceneReviews[0],
        confidence: "high",
        evidence: [],
      },
    ],
  });
  const warnings = getCoachingFeedbackQualityWarnings(feedback);

  assert.equal(hasEvidenceBackedSceneReviews(feedback), false);
  assert.ok(
    warnings.some((warning) =>
      warning.includes("높은 신뢰도의 장면 리뷰(scene-1)에 근거가 없습니다")
    )
  );
});

test("low confidence scene without evidence is allowed by evidence guard", () => {
  const feedback = createValidFeedback({
    sceneReviews: [
      {
        ...createValidFeedback().sceneReviews[0],
        confidence: "low",
        evidence: [],
      },
    ],
  });

  assert.equal(hasEvidenceBackedSceneReviews(feedback), true);
});

test("no strengths warns", () => {
  const warnings = getCoachingFeedbackQualityWarnings(
    createValidFeedback({ strengths: [] })
  );

  assert.ok(warnings.includes("유지할 강점 후보가 없습니다."));
});

test("no improvement candidates warns", () => {
  const warnings = getCoachingFeedbackQualityWarnings(
    createValidFeedback({ improvementCandidates: [] })
  );

  assert.ok(warnings.includes("개선 후보가 없습니다."));
});

test("personalization profileApplied true without confidence warns", () => {
  const warnings = getCoachingFeedbackQualityWarnings(
    createValidFeedback({
      personalization: {
        profileApplied: true,
        styleLabels: ["stable"],
      },
    })
  );

  assert.ok(
    warnings.includes("개인화 프로필을 적용한 경우 profileConfidence가 필요합니다.")
  );
});

test("input mutation is not performed", () => {
  const feedback = createValidFeedback();
  const before = JSON.stringify(feedback);

  hasExactlyOneNextGameGoal(feedback);
  hasEvidenceBackedSceneReviews(feedback);
  getCoachingFeedbackQualityWarnings(feedback);

  assert.equal(JSON.stringify(feedback), before);
});
