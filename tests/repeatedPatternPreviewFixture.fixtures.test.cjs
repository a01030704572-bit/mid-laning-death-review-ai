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
      throw new Error(
        `Unexpected runtime dependency in repeated pattern preview fixture: ${moduleName}`
      );
    },
    loadedModule,
    loadedModule.exports
  );

  return loadedModule.exports;
}

const tierCriteriaModule = loadTypeScriptModule(
  "lib/riot/tierAwarePatternCriteria.ts"
);
const analyzerModule = loadTypeScriptModule(
  "lib/riot/eliminationPatternAnalyzer.ts",
  {
    "@/lib/riot/tierAwarePatternCriteria": tierCriteriaModule,
  }
);
const groupingModule = loadTypeScriptModule("lib/riot/similarSceneGrouping.ts");
const previewModule = loadTypeScriptModule(
  "lib/riot/repeatedPatternPreviewFixture.ts",
  {
    "@/lib/riot/similarSceneGrouping": groupingModule,
    "@/lib/riot/eliminationPatternAnalyzer": analyzerModule,
  }
);

const { buildRepeatedPatternPreviewResults } = previewModule;

const REQUIRED_P0_GROUP_TYPES = [
  "push_gank_like",
  "no_flash_fight_like",
  "solo_kill_conversion_like",
  "objective_setup_like",
];

test("returns an array", () => {
  assert.ok(Array.isArray(buildRepeatedPatternPreviewResults()));
});

test("default tier is gold_platinum", () => {
  const results = buildRepeatedPatternPreviewResults();

  assert.ok(results.length > 0);
  assert.ok(results.every((result) => result.tierGroup === "gold_platinum"));
});

test("produces at least one result", () => {
  assert.ok(buildRepeatedPatternPreviewResults().length > 0);
});

test("includes all P0 group types", () => {
  const groupTypes = new Set(
    buildRepeatedPatternPreviewResults().map((result) => result.groupType)
  );

  for (const groupType of REQUIRED_P0_GROUP_TYPES) {
    assert.equal(groupTypes.has(groupType), true, `${groupType} is missing`);
  }
});

test("every result has primaryPatternKo", () => {
  assert.ok(
    buildRepeatedPatternPreviewResults().every(
      (result) => typeof result.primaryPatternKo === "string" && result.primaryPatternKo
    )
  );
});

test("every result has nextGameGoalKo", () => {
  assert.ok(
    buildRepeatedPatternPreviewResults().every(
      (result) => typeof result.nextGameGoalKo === "string" && result.nextGameGoalKo
    )
  );
});

test("every result has cautionKo", () => {
  assert.ok(
    buildRepeatedPatternPreviewResults().every(
      (result) => typeof result.cautionKo === "string" && result.cautionKo
    )
  );
});

test("broad repeated pattern conclusions are not confirmed_by_riot", () => {
  for (const result of buildRepeatedPatternPreviewResults()) {
    assert.equal(result.source, "similar_scene_grouping");
    for (const commonFactor of result.commonFactors) {
      assert.notEqual(commonFactor.evidenceCertainty, "confirmed_by_riot");
    }
  }
});

test("results are deterministic across two calls", () => {
  assert.deepEqual(
    buildRepeatedPatternPreviewResults(),
    buildRepeatedPatternPreviewResults()
  );
});

test("every result has at least two scenes", () => {
  assert.ok(
    buildRepeatedPatternPreviewResults().every((result) => result.sceneCount >= 2)
  );
});

test("every result has repeatedFactors array", () => {
  assert.ok(
    buildRepeatedPatternPreviewResults().every((result) =>
      Array.isArray(result.repeatedFactors)
    )
  );
});

test("package test:fixtures includes repeated pattern preview fixture", () => {
  const packageJson = fs.readFileSync(
    path.join(process.cwd(), "package.json"),
    "utf8"
  );

  assert.match(
    packageJson,
    /tests\/repeatedPatternPreviewFixture\.fixtures\.test\.cjs/
  );
});
