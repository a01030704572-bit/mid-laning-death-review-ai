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
      if (moduleName === "@/types/review") return {};
      throw new Error(
        `Unexpected runtime dependency in video draft patch fixture: ${moduleName}`
      );
    },
    loadedModule,
    loadedModule.exports
  );

  return loadedModule.exports;
}

const {
  hasUsableVideoDraftPatch,
  mapVideoDraftToReviewFormPatch,
} = loadTypeScriptModule("lib/videoDraftToReviewFormPatch.ts");

test("returns empty patch for null or undefined", () => {
  assert.deepEqual(mapVideoDraftToReviewFormPatch(null), {});
  assert.deepEqual(mapVideoDraftToReviewFormPatch(undefined), {});
});

test("ignores unknown and empty fields", () => {
  assert.deepEqual(
    mapVideoDraftToReviewFormPatch({
      unknownField: "unused",
      myChampion: " ",
      suggestedFields: {
        currentOutcome: "",
      },
    }),
    {}
  );
});

test("maps player champion if present", () => {
  assert.deepEqual(mapVideoDraftToReviewFormPatch({ playerChampion: "Ahri" }), {
    myChampion: "Ahri",
  });
});

test("maps enemy champion if present", () => {
  assert.deepEqual(mapVideoDraftToReviewFormPatch({ opponentChampion: "Zed" }), {
    enemyChampion: "Zed",
  });
});

test("maps tier, time, and situation only when safely present", () => {
  assert.deepEqual(
    mapVideoDraftToReviewFormPatch({
      playerTier: "gold",
      gameTime: "before_14",
      suggestedFields: {
        currentOutcome: "solo_kill",
      },
    }),
    {
      playerTier: "gold",
      gameTime: "before_14",
      currentOutcome: "solo_kill",
    }
  );
});

test("does not invent missing values", () => {
  assert.deepEqual(
    mapVideoDraftToReviewFormPatch({
      summary: "",
      suggestedFields: {},
    }),
    {}
  );
});

test("hasUsableVideoDraftPatch returns false for empty patch", () => {
  assert.equal(hasUsableVideoDraftPatch({}), false);
});

test("hasUsableVideoDraftPatch returns true for at least one meaningful field", () => {
  assert.equal(hasUsableVideoDraftPatch({ freeDescription: "visible fact" }), true);
});

test("output is deterministic", () => {
  const draft = {
    playerChampion: "Orianna",
    enemyChampion: "Syndra",
    suggestedFreeDescription: "mid lane trade",
    suggestedFields: {
      laneStateDetail: "slow_pushing_to_enemy",
      enemyJungleInfo: "not_seen_recently",
    },
  };

  assert.deepEqual(
    mapVideoDraftToReviewFormPatch(draft),
    mapVideoDraftToReviewFormPatch(draft)
  );
});

test("does not mutate input", () => {
  const draft = {
    playerChampion: "Viktor",
    suggestedFields: {
      currentOutcome: "death",
    },
  };
  const before = JSON.stringify(draft);

  mapVideoDraftToReviewFormPatch(draft);

  assert.equal(JSON.stringify(draft), before);
});
