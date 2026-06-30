/* eslint-disable @typescript-eslint/no-require-imports -- Node fixture harness transpiles the real TypeScript module without adding a test dependency. */
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
      throw new Error(
        `Unexpected runtime dependency in review insight summary fixture: ${moduleName}`
      );
    },
    loadedModule,
    loadedModule.exports
  );

  return loadedModule.exports;
}

const {
  buildReviewInsightSummary,
  mapHabitPatternsToReviewInsightManualPatterns,
} = loadTypeScriptModule("lib/reviewInsightSummary.ts");

function automationResult(groupType, overrides = {}) {
  return {
    id: overrides.id ?? `result-${groupType}`,
    groupId: overrides.groupId ?? `group-${groupType}`,
    groupType,
    tierGroup: "gold_platinum",
    sceneCount: overrides.sceneCount ?? 4,
    primaryPatternKo: overrides.primaryPatternKo ?? "fixture primary",
    confidence: overrides.confidence ?? "high",
    repeatedFactors: [],
    commonFactors: [],
    eliminatedFactors: [],
    nextGameGoalKo:
      overrides.nextGameGoalKo ??
      "다음 게임에서는 상대 정글 위치가 확인되기 전까지 시야 없는 쪽으로 압박하지 않기.",
    evidenceRequirement: "video_recommended",
    cautionKo: "fixture caution",
    reviewNoteKo: "fixture note",
    source: "similar_scene_grouping",
  };
}

test("returns fallback summary when no input", () => {
  const summary = buildReviewInsightSummary({});

  assert.equal(summary.source, "automation_preview");
  assert.ok(summary.primaryHabitKo);
  assert.deepEqual(summary.supportingCandidatesKo, []);
});

test("automation-only push_gank_like creates vision and jungle pressure habit", () => {
  const summary = buildReviewInsightSummary({
    automationResults: [automationResult("push_gank_like")],
  });

  assert.equal(summary.source, "automation_preview");
  assert.match(summary.primaryHabitKo, /강가|정글|압박/);
  assert.match(summary.whyThisFirstKo, /푸시|정글|후보/);
});

test("automation-only no_flash_fight_like creates no-flash habit", () => {
  const summary = buildReviewInsightSummary({
    automationResults: [automationResult("no_flash_fight_like")],
  });

  assert.match(summary.primaryHabitKo, /점멸/);
});

test("automation-only solo_kill_conversion_like creates conversion habit", () => {
  const summary = buildReviewInsightSummary({
    automationResults: [automationResult("solo_kill_conversion_like")],
  });

  assert.match(summary.primaryHabitKo, /솔킬|전환/);
});

test("automation-only objective_setup_like creates objective setup habit", () => {
  const summary = buildReviewInsightSummary({
    automationResults: [automationResult("objective_setup_like")],
  });

  assert.match(summary.primaryHabitKo, /오브젝트|준비/);
});

test("nextGameGoalKo removes next-game prefix", () => {
  const summary = buildReviewInsightSummary({
    automationResults: [
      automationResult("push_gank_like", {
        nextGameGoalKo:
          "다음 게임에서는 상대 정글 위치가 확인되기 전까지 시야 없는 쪽으로 압박하지 않기.",
      }),
    ],
  });

  assert.equal(
    summary.nextGameGoalKo,
    "상대 정글 위치가 확인되기 전까지 시야 없는 쪽으로 압박하지 않기."
  );
});

test("supportingCandidatesKo returns max 3 chips and no groupType strings", () => {
  const summary = buildReviewInsightSummary({
    automationResults: [
      automationResult("push_gank_like"),
      automationResult("no_flash_fight_like"),
      automationResult("solo_kill_conversion_like"),
      automationResult("objective_setup_like"),
      automationResult("unsafe_warding_like"),
    ],
  });

  assert.equal(summary.supportingCandidatesKo.length, 3);
  assert.ok(
    summary.supportingCandidatesKo.every((candidate) => !candidate.includes("_"))
  );
});

test("combined manual vision pattern and push_gank_like returns combined source", () => {
  const summary = buildReviewInsightSummary({
    manualPatterns: [{ labelKo: "강가 시야 없이 압박하는 판단", count: 3, total: 5 }],
    automationResults: [automationResult("push_gank_like")],
  });

  assert.equal(summary.source, "combined");
  assert.match(summary.whyThisFirstKo, /수동 복기|자동화 샘플/);
});

test("combined manual flash pattern and no_flash_fight_like returns combined source", () => {
  const summary = buildReviewInsightSummary({
    manualPatterns: [{ labelKo: "점멸 없는 교전", count: 3, total: 5 }],
    automationResults: [automationResult("no_flash_fight_like")],
  });

  assert.equal(summary.source, "combined");
  assert.ok(summary.primaryHabitKo.length > 0);
});

test("manual-only pattern returns manual_history source", () => {
  const summary = buildReviewInsightSummary({
    manualPatterns: [{ labelKo: "점멸 없는 교전", count: 3, total: 5 }],
  });

  assert.equal(summary.source, "manual_history");
  assert.match(summary.nextGameGoalKo, /점멸|교전/);
});

test("cautionKo differs by source", () => {
  const automation = buildReviewInsightSummary({
    automationResults: [automationResult("push_gank_like")],
  });
  const manual = buildReviewInsightSummary({
    manualPatterns: [{ labelKo: "점멸 없는 교전", count: 3, total: 5 }],
  });
  const combined = buildReviewInsightSummary({
    manualPatterns: [{ labelKo: "강가 시야 없이 압박하는 판단", count: 3, total: 5 }],
    automationResults: [automationResult("push_gank_like")],
  });

  assert.notEqual(automation.cautionKo, manual.cautionKo);
  assert.notEqual(combined.cautionKo, automation.cautionKo);
  assert.notEqual(combined.cautionKo, manual.cautionKo);
});

test("maps habit analyzer output into review insight manual patterns", () => {
  const mapped = mapHabitPatternsToReviewInsightManualPatterns({
    recentSceneCount: 5,
    topRiskTags: [],
    repeatedPatterns: [
      {
        tag: "NO_RIVER_VISION",
        label: "媛뺢? ?쒖빞 ?놁씠 諛嫄곕굹 援먯쟾???먮떒",
        count: 4,
        ratio: 0.8,
        level: "core",
      },
      {
        tag: "NO_FLASH_WINDOW",
        label: "?먮㈇???놁쓣 ??援먯쟾?섍굅???붾쪟?섎뒗 ?먮떒",
        count: 3,
        ratio: 0.6,
        level: "repeated",
      },
    ],
    primaryHabitFocus: null,
    nextReviewGoal: null,
    sampleSizeWarning: null,
  });

  assert.deepEqual(mapped, [
    {
      labelKo: "媛뺢? ?쒖빞 ?놁씠 諛嫄곕굹 援먯쟾???먮떒",
      count: 4,
      total: 5,
    },
    {
      labelKo: "?먮㈇???놁쓣 ??援먯쟾?섍굅???붾쪟?섎뒗 ?먮떒",
      count: 3,
      total: 5,
    },
  ]);
});

test("output is deterministic across repeated calls", () => {
  const input = {
    manualPatterns: [{ labelKo: "강가 시야 없이 압박하는 판단", count: 3, total: 5 }],
    automationResults: [
      automationResult("push_gank_like"),
      automationResult("no_flash_fight_like"),
    ],
  };

  assert.deepEqual(
    buildReviewInsightSummary(input),
    buildReviewInsightSummary(input)
  );
});

test("package test:fixtures includes review insight summary fixture", () => {
  const packageJson = fs.readFileSync(
    path.join(process.cwd(), "package.json"),
    "utf8"
  );

  assert.match(
    packageJson,
    /tests\/reviewInsightSummary\.fixtures\.test\.cjs/
  );
});
