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
        `Unexpected runtime dependency in review readiness preview fixture: ${moduleName}`
      );
    },
    loadedModule,
    loadedModule.exports
  );

  return loadedModule.exports;
}

const { getReviewReadinessPreviewCards } = loadTypeScriptModule(
  "lib/reviewReadinessPreview.ts"
);

test("getReviewReadinessPreviewCards returns 4 cards with exact ids", () => {
  const cards = getReviewReadinessPreviewCards();

  assert.equal(cards.length, 4);
  assert.deepEqual(
    cards.map((card) => card.id),
    ["riot_ready", "video_ready", "match_inference_needed", "riot_fallback"]
  );
});

test("all cards have required Korean display fields", () => {
  const cards = getReviewReadinessPreviewCards();

  for (const card of cards) {
    assert.ok(card.titleKo);
    assert.ok(card.descriptionKo);
    assert.ok(card.evidenceLabelKo);
  }
});

test("preview card copy does not expose development-only wording", () => {
  const text = JSON.stringify(getReviewReadinessPreviewCards()).toLowerCase();

  assert.doesNotMatch(text, /mock/);
  assert.doesNotMatch(text, /fixture/);
  assert.doesNotMatch(text, /debug/);
});

test("all ids are unique", () => {
  const ids = getReviewReadinessPreviewCards().map((card) => card.id);

  assert.equal(new Set(ids).size, ids.length);
});
