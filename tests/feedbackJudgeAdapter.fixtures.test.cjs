/* eslint-disable @typescript-eslint/no-require-imports -- Node fixture harness transpiles the real TypeScript module without adding a test dependency. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

function loadTypeScriptModule(relativePath, cache = new Map()) {
  const normalizedPath = path.normalize(relativePath);
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
        "@/lib/feedbackJudgeAdapter": "lib/feedbackJudgeAdapter.ts",
        "@/lib/feedbackJudgeGuards": "lib/feedbackJudgeGuards.ts",
        "@/lib/feedbackJudgePrompt": "lib/feedbackJudgePrompt.ts",
      };
      if (aliases[moduleName]) {
        return loadTypeScriptModule(aliases[moduleName], cache);
      }
      throw new Error(
        `Unexpected runtime dependency in feedback judge adapter fixture: ${moduleName}`
      );
    },
    loadedModule,
    loadedModule.exports
  );

  cache.set(normalizedPath, loadedModule.exports);
  return loadedModule.exports;
}

const {
  buildFeedbackJudgeInputFromCoachingFeedback,
  runLocalFeedbackJudgePrecheck,
  runLocalFeedbackJudgePrecheckForCoachingFeedback,
} = loadTypeScriptModule("lib/feedbackJudgeAdapter.ts");

function makeFeedback(overrides = {}) {
  return {
    matchId: "KR_1",
    puuid: "puuid-1",
    generatedAtIsoTimestamp: "2026-07-17T00:00:00.000Z",
    matchSummary: {
      titleKo: "이번 판 코칭 요약",
      summaryKo: "강가 시야가 없는 쪽으로 길게 압박한 장면을 먼저 복기합니다.",
      overallHypothesisKo: "상대 정글 위치가 보이지 않을 때 압박 범위를 줄이는지가 핵심입니다.",
      confidence: "medium",
    },
    sceneReviews: [
      {
        sceneId: "scene-1",
        titleKo: "9분 강가 압박 장면",
        sceneType: "jungle_collapse",
        reviewHypothesisKo: "상대 정글 위치가 보이지 않는 상태에서 압박한 후보입니다.",
        evidence: [
          {
            source: "riot",
            confidence: "medium",
            labelKo: "근처 사망 이벤트",
            detailKo: "9분대 미드 근처 교전 기록",
            sceneId: "scene-1",
          },
        ],
        confidence: "medium",
        correctionKo: "압박 전에 강가 시야나 상대 정글 위치를 확인합니다.",
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
        feedbackKo: "상대 정글 위치 확인 전 압박 범위를 줄이는 후보입니다.",
      },
    ],
    recurringPatterns: [],
    nextGameGoal: {
      goalKo:
        "상대 정글 위치가 보이지 않으면 압박 전에 와드를 확인하고, 5초 안에 라인 정리 또는 후퇴를 선택하세요.",
      triggerKo: "상대 정글 위치가 보이지 않으면",
      successConditionKo: "5초 안에 라인 정리 또는 후퇴 중 하나를 선택합니다.",
      basedOn: {
        sceneIds: ["scene-1"],
        improvementCandidateId: "improvement-1",
      },
    },
    evidenceConfidence: "medium",
    ...overrides,
  };
}

function issueTypes(result) {
  return result.issues.map((issue) => issue.type);
}

test("clean CoachingFeedback returns pass and shouldShowToUser true", () => {
  const result = runLocalFeedbackJudgePrecheckForCoachingFeedback(makeFeedback());

  assert.equal(result.verdict, "pass");
  assert.equal(result.shouldShowToUser, true);
  assert.deepEqual(result.issues, []);
});

test("CoachingFeedback containing jungle_tracking returns revise and internal_label issue", () => {
  const feedback = makeFeedback({
    matchSummary: {
      ...makeFeedback().matchSummary,
      summaryKo: "jungle_tracking 기준으로 먼저 볼 장면입니다.",
    },
  });
  const result = runLocalFeedbackJudgePrecheckForCoachingFeedback(feedback);

  assert.equal(result.verdict, "revise");
  assert.ok(issueTypes(result).includes("internal_label"));
  assert.equal(result.shouldShowToUser, true);
});

test("safeRewrite removes jungle_tracking and objective_setup", () => {
  const feedback = makeFeedback({
    matchSummary: {
      ...makeFeedback().matchSummary,
      summaryKo: "jungle_tracking 및 objective_setup 후보를 확인합니다.",
    },
  });
  const result = runLocalFeedbackJudgePrecheckForCoachingFeedback(feedback);

  assert.ok(!result.safeRewrite.summaryKo.includes("jungle_tracking"));
  assert.ok(!result.safeRewrite.summaryKo.includes("objective_setup"));
});

test("adapter detects jungle_tracking inside improvement candidate text", () => {
  const result = runLocalFeedbackJudgePrecheckForCoachingFeedback(
    makeFeedback({
      improvementCandidates: [
        {
          ...makeFeedback().improvementCandidates[0],
          feedbackKo: "jungle_tracking 기준으로 다시 볼 후보입니다.",
        },
      ],
    })
  );

  assert.equal(result.verdict, "revise");
  assert.ok(issueTypes(result).includes("internal_label"));
});

test("adapter detects objective_setup inside improvement candidate text", () => {
  const result = runLocalFeedbackJudgePrecheckForCoachingFeedback(
    makeFeedback({
      improvementCandidates: [
        {
          ...makeFeedback().improvementCandidates[0],
          feedbackKo: "objective_setup 확인이 필요한 후보입니다.",
        },
      ],
    })
  );

  assert.equal(result.verdict, "revise");
  assert.ok(issueTypes(result).includes("internal_label"));
});

test("adapter detects internal label inside strength text", () => {
  const result = runLocalFeedbackJudgePrecheckForCoachingFeedback(
    makeFeedback({
      strengths: [
        {
          ...makeFeedback().strengths[0],
          feedbackKo: "post_kill_conversion 강점 후보입니다.",
        },
      ],
    })
  );

  assert.equal(result.verdict, "revise");
  assert.ok(issueTypes(result).includes("internal_label"));
});

test("adapter detects internal label inside scene review text", () => {
  const result = runLocalFeedbackJudgePrecheckForCoachingFeedback(
    makeFeedback({
      sceneReviews: [
        {
          ...makeFeedback().sceneReviews[0],
          titleKo: "SOLO_KILL_TRADE 장면",
          reviewHypothesisKo: "wave_management 확인 후보입니다.",
        },
      ],
    })
  );

  assert.equal(result.verdict, "revise");
  assert.ok(issueTypes(result).includes("internal_label"));
});

test("internal_label only returns revise, not reject, and remains showable", () => {
  const result = runLocalFeedbackJudgePrecheckForCoachingFeedback(
    makeFeedback({
      matchSummary: {
        ...makeFeedback().matchSummary,
        summaryKo: "jungle_tracking objective_setup post_kill_conversion",
      },
      strengths: [
        {
          ...makeFeedback().strengths[0],
          feedbackKo: "fight_direction recall_timing vision_timing",
        },
      ],
      improvementCandidates: [
        {
          ...makeFeedback().improvementCandidates[0],
          feedbackKo: "wave_management roam_timing death_avoidance",
        },
      ],
    })
  );

  assert.equal(result.verdict, "revise");
  assert.equal(result.shouldShowToUser, true);
  assert.equal(
    result.issues.filter((issue) => issue.type === "internal_label").length,
    1
  );
});

test("hidden psych phrase forces reject", () => {
  const result = runLocalFeedbackJudgePrecheckForCoachingFeedback(
    makeFeedback({
      matchSummary: {
        ...makeFeedback().matchSummary,
        summaryKo: "이 장면은 인내심이 부족해서 생긴 문제입니다.",
      },
    })
  );

  assert.equal(result.verdict, "reject");
  assert.equal(result.shouldShowToUser, false);
  assert.ok(issueTypes(result).includes("hidden_psych_profile"));
});

test("manipulative phrase forces reject", () => {
  const result = runLocalFeedbackJudgePrecheckForCoachingFeedback(
    makeFeedback({
      matchSummary: {
        ...makeFeedback().matchSummary,
        summaryKo: "지금 안 고치면 계속 질 것입니다.",
      },
    })
  );

  assert.equal(result.verdict, "reject");
  assert.equal(result.shouldShowToUser, false);
  assert.ok(issueTypes(result).includes("manipulative"));
});

test("shaming phrase forces reject", () => {
  const result = runLocalFeedbackJudgePrecheckForCoachingFeedback(
    makeFeedback({
      matchSummary: {
        ...makeFeedback().matchSummary,
        summaryKo: "당신 때문에 게임이 망했습니다.",
      },
    })
  );

  assert.equal(result.verdict, "reject");
  assert.equal(result.shouldShowToUser, false);
  assert.ok(issueTypes(result).includes("shaming"));
});

test("vague nextGameGoal returns not_actionable and not pass", () => {
  const result = runLocalFeedbackJudgePrecheckForCoachingFeedback(
    makeFeedback({
      nextGameGoal: {
        ...makeFeedback().nextGameGoal,
        goalKo: "더 신중하게 플레이하세요",
      },
    })
  );

  assert.notEqual(result.verdict, "pass");
  assert.ok(issueTypes(result).includes("not_actionable"));
});

test("hypothesis confidence plus certainty words triggers overclaiming", () => {
  const result = runLocalFeedbackJudgePrecheckForCoachingFeedback(
    makeFeedback({
      matchSummary: {
        ...makeFeedback().matchSummary,
        summaryKo: "이 장면은 definitely 확실히 무조건 손해로 이어진 장면입니다.",
      },
    }),
    { evidenceConfidence: "hypothesis" }
  );

  assert.equal(result.verdict, "revise");
  assert.ok(issueTypes(result).includes("overclaiming"));
});

test("repeated candidate phrasing triggers too_robotic", () => {
  const result = runLocalFeedbackJudgePrecheckForCoachingFeedback(
    makeFeedback({
      matchSummary: {
        ...makeFeedback().matchSummary,
        summaryKo:
          "정글 추적 후보입니다. 시야 확인 후보입니다. 교전 방향 후보입니다.",
      },
    })
  );

  assert.ok(issueTypes(result).includes("too_robotic"));
});

test("buildFeedbackJudgeInputFromCoachingFeedback defaults selectedMode to direct", () => {
  const input = buildFeedbackJudgeInputFromCoachingFeedback(makeFeedback());

  assert.equal(input.selectedMode, "direct");
  assert.equal(input.mode, "direct");
  assert.equal(typeof input.modeDefinition, "string");
  assert.equal(input.evidenceConfidence, "hypothesis");
  assert.equal(input.draftFeedback.nextGameGoalRaw, makeFeedback().nextGameGoal.goalKo);
});

test("input feedback is not mutated", () => {
  const feedback = makeFeedback();
  const before = structuredClone(feedback);

  buildFeedbackJudgeInputFromCoachingFeedback(feedback);
  runLocalFeedbackJudgePrecheckForCoachingFeedback(feedback);

  assert.deepEqual(feedback, before);
});

test("reject always forces shouldShowToUser false", () => {
  const input = buildFeedbackJudgeInputFromCoachingFeedback(makeFeedback());
  const result = runLocalFeedbackJudgePrecheck({
    ...input,
    draftFeedback: {
      ...input.draftFeedback,
      summaryRaw: "당신 때문에 게임이 망했습니다.",
    },
  });

  assert.equal(result.verdict, "reject");
  assert.equal(result.shouldShowToUser, false);
});
