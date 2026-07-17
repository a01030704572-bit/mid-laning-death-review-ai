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
        "@/lib/feedbackJudgePrompt": "lib/feedbackJudgePrompt.ts",
      };
      if (aliases[moduleName]) {
        return loadTypeScriptModule(aliases[moduleName], cache);
      }
      throw new Error(
        `Unexpected runtime dependency in feedback judge guard fixture: ${moduleName}`
      );
    },
    loadedModule,
    loadedModule.exports
  );

  cache.set(normalizedPath, loadedModule.exports);
  return loadedModule.exports;
}

const {
  detectHiddenPsychProfilePhrases,
  detectInternalLabelLeaks,
  detectManipulativePhrases,
  enforceFeedbackJudgeResultSafety,
  hasActionableNextGameGoal,
} = loadTypeScriptModule("lib/feedbackJudgeGuards.ts");

function makeJudgeResult(overrides = {}) {
  return {
    verdict: "pass",
    qualityScore: 0.85,
    issues: [],
    shouldShowToUser: true,
    ...overrides,
  };
}

test("detects known internal labels", () => {
  const leaks = detectInternalLabelLeaks(
    "이 피드백은 jungle_tracking과 objective_setup 기준입니다."
  );

  assert.ok(leaks.includes("jungle_tracking"));
  assert.ok(leaks.includes("objective_setup"));
});

test("detects snake_case and SCREAMING_CASE tokens", () => {
  const leaks = detectInternalLabelLeaks(
    "post_kill_conversion 후보와 SOLO_KILL_TRADE 라우팅이 보입니다."
  );

  assert.ok(leaks.includes("post_kill_conversion"));
  assert.ok(leaks.includes("SOLO_KILL_TRADE"));
});

test("detects hidden psych profile Korean phrase", () => {
  const phrases = detectHiddenPsychProfilePhrases(
    "이 장면은 인내심이 부족해서 생긴 문제입니다."
  );

  assert.deepEqual(phrases, ["인내심이 부족"]);
});

test("detects manipulative fear phrase", () => {
  const phrases = detectManipulativePhrases(
    "지금 안 고치면 계속 질 것입니다."
  );

  assert.ok(phrases.includes("지금 안 고치면"));
  assert.ok(phrases.includes("계속 질 것입니다"));
});

test("vague next-game goal fails actionability", () => {
  assert.equal(hasActionableNextGameGoal("더 신중하게 플레이하세요"), false);
  assert.equal(hasActionableNextGameGoal("잘하세요"), false);
  assert.equal(hasActionableNextGameGoal("판단력을 기르세요"), false);
});

test("concrete trigger-based next-game goal passes actionability", () => {
  const goal =
    "상대 정글 위치가 보이지 않으면 압박 전에 와드를 확인하고, 5초 안에 라인 정리 또는 후퇴를 선택하세요.";

  assert.equal(hasActionableNextGameGoal(goal), true);
});

test("enforce rejects high hidden psych profile issue", () => {
  const result = enforceFeedbackJudgeResultSafety(
    makeJudgeResult({
      issues: [
        {
          type: "hidden_psych_profile",
          severity: "high",
          messageKo: "성격 단정 표현입니다.",
        },
      ],
    })
  );

  assert.equal(result.verdict, "reject");
  assert.equal(result.shouldShowToUser, false);
});

test("enforce rejects high manipulative issue", () => {
  const result = enforceFeedbackJudgeResultSafety(
    makeJudgeResult({
      issues: [
        {
          type: "manipulative",
          severity: "high",
          messageKo: "공포 기반 압박 표현입니다.",
        },
      ],
    })
  );

  assert.equal(result.verdict, "reject");
  assert.equal(result.shouldShowToUser, false);
});

test("enforce revises internal label issue", () => {
  const result = enforceFeedbackJudgeResultSafety(
    makeJudgeResult({
      issues: [
        {
          type: "internal_label",
          severity: "medium",
          messageKo: "내부 라벨이 노출됐습니다.",
        },
      ],
    })
  );

  assert.equal(result.verdict, "revise");
  assert.equal(result.shouldShowToUser, true);
});

test("enforce blocks shouldShowToUser when verdict is reject", () => {
  const result = enforceFeedbackJudgeResultSafety(
    makeJudgeResult({
      verdict: "reject",
      shouldShowToUser: true,
    })
  );

  assert.equal(result.verdict, "reject");
  assert.equal(result.shouldShowToUser, false);
});

test("input mutation is not performed", () => {
  const result = makeJudgeResult({
    issues: [
      {
        type: "internal_label",
        severity: "low",
        messageKo: "내부 라벨입니다.",
      },
    ],
    safeRewrite: {
      summaryKo: "요약",
      notesKo: ["첫 번째 노트"],
    },
  });
  const before = structuredClone(result);

  enforceFeedbackJudgeResultSafety(result);

  assert.deepEqual(result, before);
});
