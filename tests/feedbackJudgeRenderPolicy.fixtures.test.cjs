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
        `Unexpected runtime dependency in feedback judge render policy fixture: ${moduleName}`
      );
    },
    loadedModule,
    loadedModule.exports
  );

  return loadedModule.exports;
}

const { getFeedbackJudgeRenderPolicy } = loadTypeScriptModule(
  "lib/feedbackJudgeRenderPolicy.ts"
);

function makeJudgePreview(overrides = {}) {
  return {
    verdict: "pass",
    qualityScore: 95,
    issues: [],
    shouldShowToUser: true,
    ...overrides,
  };
}

test("pass uses raw feedback", () => {
  const policy = getFeedbackJudgeRenderPolicy({
    hasFeedback: true,
    feedbackJudgePreview: makeJudgePreview(),
  });

  assert.equal(policy.shouldRenderCard, true);
  assert.equal(policy.shouldRenderFeedback, true);
  assert.equal(policy.renderSource, "raw");
});

test("missing judge uses raw feedback", () => {
  const policy = getFeedbackJudgeRenderPolicy({
    hasFeedback: true,
  });

  assert.equal(policy.shouldRenderCard, true);
  assert.equal(policy.shouldRenderFeedback, true);
  assert.equal(policy.renderSource, "raw");
});

test("revise with safeRewrite uses safeRewrite", () => {
  const policy = getFeedbackJudgeRenderPolicy({
    hasFeedback: true,
    feedbackJudgePreview: makeJudgePreview({ verdict: "revise" }),
    feedbackJudgeSafeRewrite: {
      summaryKo: "안전한 요약",
      nextGameGoalKo: "안전한 목표",
      toneNotes: ["internal note"],
    },
  });

  assert.equal(policy.shouldRenderCard, true);
  assert.equal(policy.shouldRenderFeedback, true);
  assert.equal(policy.renderSource, "safeRewrite");
  assert.equal(policy.shouldRenderRawSupportingSections, false);
  assert.equal(policy.safeRewrite.summaryKo, "안전한 요약");
  assert.equal(policy.safeRewrite.nextGameGoalKo, "안전한 목표");
});

test("reject hides in user mode", () => {
  const policy = getFeedbackJudgeRenderPolicy({
    hasFeedback: true,
    feedbackJudgePreview: makeJudgePreview({
      verdict: "reject",
      shouldShowToUser: false,
    }),
  });

  assert.equal(policy.shouldRenderCard, false);
  assert.equal(policy.shouldRenderFeedback, false);
  assert.equal(policy.renderSource, "hidden");
});

test("reject shows debug notice in debug mode", () => {
  const policy = getFeedbackJudgeRenderPolicy({
    hasFeedback: true,
    debugMode: true,
    feedbackJudgePreview: makeJudgePreview({
      verdict: "reject",
      qualityScore: 40,
      shouldShowToUser: false,
      issues: [
        {
          type: "shaming",
          severity: "high",
          messageKo: "비난 표현",
        },
      ],
    }),
  });

  assert.equal(policy.shouldRenderCard, true);
  assert.equal(policy.shouldRenderFeedback, false);
  assert.equal(policy.shouldRenderRawSupportingSections, false);
  assert.equal(policy.debugNotice.verdict, "reject");
  assert.deepEqual(policy.debugNotice.issues, [
    { type: "shaming", severity: "high" },
  ]);
});

test("shouldShowToUser false hides in user mode", () => {
  const policy = getFeedbackJudgeRenderPolicy({
    hasFeedback: true,
    feedbackJudgePreview: makeJudgePreview({
      verdict: "revise",
      shouldShowToUser: false,
    }),
  });

  assert.equal(policy.shouldRenderCard, false);
});

test("toneNotes are not included in user-facing safeRewrite", () => {
  const policy = getFeedbackJudgeRenderPolicy({
    hasFeedback: true,
    feedbackJudgePreview: makeJudgePreview({ verdict: "revise" }),
    feedbackJudgeSafeRewrite: {
      summaryKo: "안전한 요약",
      toneNotes: ["debug-only tone note"],
    },
  });

  assert.equal("toneNotes" in policy.safeRewrite, false);
});

test("raw supporting sections remain available in debug safeRewrite mode", () => {
  const policy = getFeedbackJudgeRenderPolicy({
    hasFeedback: true,
    debugMode: true,
    feedbackJudgePreview: makeJudgePreview({ verdict: "revise" }),
    feedbackJudgeSafeRewrite: {
      summaryKo: "안전한 요약",
    },
  });

  assert.equal(policy.renderSource, "safeRewrite");
  assert.equal(policy.shouldRenderRawSupportingSections, true);
});

test("input mutation is not performed", () => {
  const input = {
    hasFeedback: true,
    feedbackJudgePreview: makeJudgePreview({ verdict: "revise" }),
    feedbackJudgeSafeRewrite: {
      summaryKo: "안전한 요약",
      toneNotes: ["debug-only tone note"],
    },
  };
  const before = structuredClone(input);

  getFeedbackJudgeRenderPolicy(input);

  assert.deepEqual(input, before);
});
