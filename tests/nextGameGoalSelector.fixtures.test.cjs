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
        `Unexpected runtime dependency in next game goal selector fixture: ${moduleName}`
      );
    },
    loadedModule,
    loadedModule.exports
  );

  return loadedModule.exports;
}

const { selectNextGameGoal } = loadTypeScriptModule(
  "lib/nextGameGoalSelector.ts"
);

function makeImprovement(overrides = {}) {
  return {
    id: "improvement-1",
    category: "jungle_tracking",
    severity: "medium",
    repeatScore: 10,
    evidenceSceneIds: ["scene-1"],
    feedbackKo: "정글 위치 확인 후보입니다.",
    ...overrides,
  };
}

function makePattern(overrides = {}) {
  return {
    id: "pattern-1",
    category: "wave_management",
    occurrenceCount: 2,
    evidenceSceneIds: ["scene-2"],
    hypothesisKo: "웨이브 정리 전 이동 반복 후보입니다.",
    confidence: "medium",
    ...overrides,
  };
}

function makeSceneReview(overrides = {}) {
  return {
    sceneId: "scene-review-1",
    titleKo: "장면 복기 후보",
    sceneType: "objective_setup",
    reviewHypothesisKo: "복기용 가설입니다.",
    evidence: [],
    confidence: "low",
    correctionKo: "오브젝트 전에 미드 웨이브를 먼저 확인합니다.",
    ...overrides,
  };
}

function assertCompleteGoal(goal) {
  assert.equal(typeof goal.goalKo, "string");
  assert.equal(typeof goal.triggerKo, "string");
  assert.equal(typeof goal.successConditionKo, "string");
  assert.ok(goal.goalKo.trim());
  assert.ok(goal.triggerKo.trim());
  assert.ok(goal.successConditionKo.trim());
  assert.ok(!goal.goalKo.includes("잘하기"));
  assert.ok(!goal.goalKo.includes("조심하기"));
}

test("recurring pattern beats improvement candidate", () => {
  const goal = selectNextGameGoal({
    recurringPatterns: [makePattern()],
    improvementCandidates: [makeImprovement({ severity: "high", repeatScore: 99 })],
  });

  assert.equal(goal.basedOn.recurringPatternId, "pattern-1");
  assert.equal(goal.basedOn.improvementCandidateId, undefined);
  assert.deepEqual(goal.basedOn.sceneIds, ["scene-2"]);
});

test("high severity improvement beats lower severity", () => {
  const goal = selectNextGameGoal({
    improvementCandidates: [
      makeImprovement({
        id: "medium-high-score",
        category: "wave_management",
        severity: "medium",
        repeatScore: 100,
        evidenceSceneIds: ["scene-medium"],
      }),
      makeImprovement({
        id: "high-low-score",
        category: "jungle_tracking",
        severity: "high",
        repeatScore: 1,
        evidenceSceneIds: ["scene-high"],
      }),
    ],
  });

  assert.equal(goal.basedOn.improvementCandidateId, "high-low-score");
  assert.deepEqual(goal.basedOn.sceneIds, ["scene-high"]);
});

test("higher repeatScore wins among same severity", () => {
  const goal = selectNextGameGoal({
    improvementCandidates: [
      makeImprovement({
        id: "lower",
        severity: "medium",
        repeatScore: 3,
        evidenceSceneIds: ["scene-lower"],
      }),
      makeImprovement({
        id: "higher",
        severity: "medium",
        repeatScore: 8,
        evidenceSceneIds: ["scene-higher"],
      }),
    ],
  });

  assert.equal(goal.basedOn.improvementCandidateId, "higher");
  assert.deepEqual(goal.basedOn.sceneIds, ["scene-higher"]);
});

test("scene review fallback works", () => {
  const goal = selectNextGameGoal({
    sceneReviews: [makeSceneReview()],
  });

  assert.equal(goal.basedOn.improvementCandidateId, undefined);
  assert.deepEqual(goal.basedOn.sceneIds, ["scene-review-1"]);
  assert.ok(goal.goalKo.includes("오브젝트 60초 전"));
});

test("empty input returns generic fallback goal", () => {
  const goal = selectNextGameGoal({});

  assert.deepEqual(goal.basedOn.sceneIds, []);
  assert.ok(goal.goalKo.includes("가장 위험했던 장면"));
  assertCompleteGoal(goal);
});

test("category templates produce concrete trigger and success condition", () => {
  const cases = [
    ["post_kill_conversion", "킬을 딴 뒤", "5초 안에"],
    ["jungle_tracking", "상대 정글 위치가 안 보일 때", "압박 전에"],
    ["objective_setup", "오브젝트 60초 전", "미드 웨이브"],
    ["fight_direction", "교전을 계속 이어가기 전", "아군 커버"],
    ["recall_timing", "큰 이득을 만든 직후", "다음 웨이브"],
    ["vision_timing", "강가나 안 보이는 곳으로 움직이기 전", "와드"],
    ["wave_management", "라인을 밀고 움직이기 전", "미드 웨이브"],
    ["roam_timing", "로밍을 시작하기 전", "상대 타워"],
    ["death_avoidance", "큰 손해가 날 수 있는 교전 전", "상대 정글"],
  ];

  for (const [category, trigger, success] of cases) {
    const goal = selectNextGameGoal({
      improvementCandidates: [
        makeImprovement({
          category,
          evidenceSceneIds: [`scene-${category}`],
        }),
      ],
    });

    assert.equal(goal.triggerKo, trigger);
    assert.ok(goal.successConditionKo.includes(success));
    assertCompleteGoal(goal);
  }
});

test("exactly one goal is returned", () => {
  const goal = selectNextGameGoal({
    recurringPatterns: [
      makePattern({ id: "pattern-a", occurrenceCount: 2 }),
      makePattern({ id: "pattern-b", occurrenceCount: 5 }),
    ],
    improvementCandidates: [makeImprovement()],
    sceneReviews: [makeSceneReview()],
  });

  assert.equal(Array.isArray(goal), false);
  assert.equal(goal.basedOn.recurringPatternId, "pattern-b");
});

test("no vague empty fields", () => {
  const goal = selectNextGameGoal({
    improvementCandidates: [
      makeImprovement({
        category: "unknown",
        evidenceSceneIds: ["scene-unknown"],
      }),
    ],
  });

  assertCompleteGoal(goal);
});

test("input mutation is not performed", () => {
  const input = {
    recurringPatterns: [makePattern()],
    improvementCandidates: [makeImprovement()],
    sceneReviews: [makeSceneReview()],
  };
  const before = JSON.stringify(input);

  selectNextGameGoal(input);

  assert.equal(JSON.stringify(input), before);
});
