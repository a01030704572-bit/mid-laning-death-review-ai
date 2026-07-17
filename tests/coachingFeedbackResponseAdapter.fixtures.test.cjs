/* eslint-disable @typescript-eslint/no-require-imports -- Node fixture harness transpiles the real TypeScript module without adding a test dependency. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

function loadTypeScriptModule(relativePath, cache = new Map()) {
  const normalizedPath = relativePath.replaceAll("\\", "/");
  if (cache.has(normalizedPath)) return cache.get(normalizedPath);

  const absolutePath = path.join(process.cwd(), normalizedPath);
  const source = fs.readFileSync(absolutePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  const loadedModule = { exports: {} };
  cache.set(normalizedPath, loadedModule.exports);

  new Function("require", "module", "exports", output)(
    (moduleName) => {
      const aliases = {
        "@/lib/coachingFeedbackPipeline": "lib/coachingFeedbackPipeline.ts",
        "@/lib/coachingFeedbackDraftMapper":
          "lib/coachingFeedbackDraftMapper.ts",
        "@/lib/coachingFeedbackQualityGate":
          "lib/coachingFeedbackQualityGate.ts",
        "@/lib/coachingFeedbackGuards": "lib/coachingFeedbackGuards.ts",
        "@/lib/nextGameGoalSelector": "lib/nextGameGoalSelector.ts",
        "@/lib/feedbackJudgeAdapter": "lib/feedbackJudgeAdapter.ts",
        "@/lib/feedbackJudgeGuards": "lib/feedbackJudgeGuards.ts",
        "@/lib/feedbackJudgePrompt": "lib/feedbackJudgePrompt.ts",
      };
      if (aliases[moduleName]) {
        return loadTypeScriptModule(aliases[moduleName], cache);
      }
      throw new Error(
        `Unexpected runtime dependency in coaching feedback response adapter fixture: ${moduleName}`
      );
    },
    loadedModule,
    loadedModule.exports
  );

  return loadedModule.exports;
}

const { buildCoachingFeedbackPreviewForMatchReview } = loadTypeScriptModule(
  "lib/coachingFeedbackResponseAdapter.ts"
);
const { hasExactlyOneNextGameGoal } = loadTypeScriptModule(
  "lib/coachingFeedbackGuards.ts"
);

function makeReport(overrides = {}) {
  return {
    matchId: "KR_1",
    puuid: "player-puuid",
    generatedAt: "2026-07-17T00:00:00.000Z",
    rankedScenes: [
      {
        sceneId: "scene-1",
        autoSceneType: "jungle_gank_death_candidate",
        sceneValence: "bad_decision",
        reviewWorthinessScore: 98,
        displayNameKo: "정글 개입 사망 후보",
        evidenceSummaryKo: "정글 개입 가능성이 있는 장면 후보입니다.",
        riotEvidenceSummary: ["548초에 CHAMPION_KILL 이벤트가 확인되었습니다."],
      },
    ],
    topScenes: [],
    improvementScenes: [],
    strengthScenes: [],
    ...overrides,
  };
}

function makeFeedback(overrides = {}) {
  return {
    matchId: "KR_1",
    puuid: "player-puuid",
    generatedAtIsoTimestamp: "2026-07-17T00:00:00.000Z",
    matchSummary: {
      titleKo: "이번 판 코칭 요약",
      summaryKo: "상대 정글 위치가 보이지 않을 때 압박 범위를 줄이는 후보입니다.",
      overallHypothesisKo: "근거 기반 복기 후보입니다.",
      confidence: "medium",
    },
    sceneReviews: [],
    strengths: [],
    improvementCandidates: [],
    recurringPatterns: [],
    nextGameGoal: {
      goalKo:
        "상대 정글 위치가 보이지 않으면 압박 전에 와드를 확인하고, 5초 안에 라인 정리 또는 후퇴를 선택하세요.",
      triggerKo: "상대 정글 위치가 보이지 않으면",
      successConditionKo: "5초 안에 라인 정리 또는 후퇴 중 하나를 선택합니다.",
      basedOn: { sceneIds: [] },
    },
    evidenceConfidence: "medium",
    ...overrides,
  };
}

test("builds coachingFeedbackPreview from match review scene data", () => {
  const result = buildCoachingFeedbackPreviewForMatchReview({
    report: makeReport(),
  });

  assert.ok(result.coachingFeedbackPreview);
  assert.equal(result.coachingFeedbackPreview.feedback.matchId, "KR_1");
  assert.equal(result.coachingFeedbackPreview.feedback.puuid, "player-puuid");
  assert.equal(
    result.coachingFeedbackPreview.feedback.generatedAtIsoTimestamp,
    "2026-07-17T00:00:00.000Z"
  );
  assert.equal(
    hasExactlyOneNextGameGoal(result.coachingFeedbackPreview.feedback),
    true
  );
  assert.ok(result.feedbackJudgePreview);
  assert.equal(typeof result.feedbackJudgePreview.verdict, "string");
  assert.equal(typeof result.feedbackJudgePreview.qualityScore, "number");
  assert.ok(Array.isArray(result.feedbackJudgePreview.issues));
  assert.equal(typeof result.feedbackJudgePreview.shouldShowToUser, "boolean");
  assert.deepEqual(result.feedbackJudgePreviewWarnings, []);
});

test("empty scenes still return fallback coachingFeedbackPreview", () => {
  const result = buildCoachingFeedbackPreviewForMatchReview({
    report: makeReport({
      rankedScenes: [],
      topScenes: [],
      improvementScenes: [],
      strengthScenes: [],
    }),
    generatedAtIsoTimestamp: "2026-07-17T01:00:00.000Z",
  });

  assert.ok(result.coachingFeedbackPreview);
  assert.equal(result.coachingFeedbackPreview.feedback.sceneReviews.length, 0);
  assert.equal(
    result.coachingFeedbackPreview.feedback.generatedAtIsoTimestamp,
    "2026-07-17T01:00:00.000Z"
  );
  assert.equal(
    hasExactlyOneNextGameGoal(result.coachingFeedbackPreview.feedback),
    true
  );
  assert.ok(result.feedbackJudgePreview);
});

test("internal label in feedback causes feedbackJudgePreview verdict not pass", () => {
  const result = buildCoachingFeedbackPreviewForMatchReview(
    { report: makeReport() },
    () => ({
      feedback: makeFeedback({
        matchSummary: {
          ...makeFeedback().matchSummary,
          summaryKo: "jungle_tracking 기준으로 먼저 볼 장면입니다.",
        },
      }),
      warnings: [],
      changed: false,
    })
  );

  assert.ok(result.feedbackJudgePreview);
  assert.notEqual(result.feedbackJudgePreview.verdict, "pass");
  assert.ok(
    result.feedbackJudgePreview.issues.some(
      (issue) => issue.type === "internal_label"
    )
  );
});

test("judge failure returns warning without breaking coachingFeedbackPreview", () => {
  const result = buildCoachingFeedbackPreviewForMatchReview(
    { report: makeReport() },
    () => ({
      feedback: makeFeedback(),
      warnings: [],
      changed: false,
    }),
    () => {
      throw new Error("fixture judge failure");
    }
  );

  assert.ok(result.coachingFeedbackPreview);
  assert.equal(result.feedbackJudgePreview, null);
  assert.deepEqual(result.feedbackJudgePreviewWarnings, [
    "Feedback judge preview could not be generated.",
  ]);
});

test("pipeline failure returns null preview and warning without throwing", () => {
  const result = buildCoachingFeedbackPreviewForMatchReview(
    { report: makeReport() },
    () => {
      throw new Error("fixture pipeline failure");
    }
  );

  assert.equal(result.coachingFeedbackPreview, null);
  assert.deepEqual(result.coachingFeedbackPreviewWarnings, [
    "Coaching feedback preview could not be generated.",
  ]);
  assert.equal(result.feedbackJudgePreview, null);
  assert.deepEqual(result.feedbackJudgePreviewWarnings, []);
});

test("input report is not mutated", () => {
  const report = makeReport();
  const before = structuredClone(report);

  buildCoachingFeedbackPreviewForMatchReview({ report });

  assert.deepEqual(report, before);
});
