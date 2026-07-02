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
    () => ({}),
    loadedModule,
    loadedModule.exports
  );

  return loadedModule.exports;
}

const { buildReviewRequestPayload } = loadTypeScriptModule(
  "lib/reviewRequestPayload.ts"
);

function makeInput(overrides = {}) {
  return {
    myChampion: "Akali",
    enemyChampion: "Ahri",
    currentOutcome: "death",
    freeDescription: "manual scene note",
    ...overrides,
  };
}

function makeRiotEvidence(overrides = {}) {
  return {
    events: [
      {
        kind: "death",
        timestampSec: 420,
        description: "Player died",
        importance: "primary",
      },
    ],
    playerDelta: {
      csDelta: -4,
      xpDelta: -120,
      totalGoldDelta: 0,
    },
    uncertainInfo: [],
    ...overrides,
  };
}

test("manual-only review keeps the legacy flat request payload", () => {
  const input = makeInput();

  assert.equal(buildReviewRequestPayload({ input }), input);
});

test("Riot evidence is sent as supporting evidence without overriding manual input", () => {
  const input = makeInput({ myChampion: "Akali" });
  const riotEvidence = makeRiotEvidence({ championName: "Lissandra" });
  const payload = buildReviewRequestPayload({ input, riotEvidence });

  assert.equal(payload.manualInput, input);
  assert.equal(payload.manualInput.myChampion, "Akali");
  assert.equal(payload.riotEvidence, riotEvidence);
  assert.equal("myChampion" in payload.riotEvidence, false);
});

test("video draft and Riot evidence can be sent together", () => {
  const input = makeInput();
  const videoDraft = { suggestedFreeDescription: "video observation" };
  const riotEvidence = makeRiotEvidence();
  const payload = buildReviewRequestPayload({
    input,
    videoDraft,
    riotEvidence,
  });

  assert.deepEqual(Object.keys(payload).sort(), [
    "manualInput",
    "riotEvidence",
    "videoDraft",
  ]);
  assert.equal(payload.manualInput, input);
  assert.equal(payload.videoDraft, videoDraft);
  assert.equal(payload.riotEvidence, riotEvidence);
});

test("generated but unapplied video draft sends source state without video evidence", () => {
  const input = makeInput();
  const payload = buildReviewRequestPayload({
    input,
    videoDraft: null,
    videoDraftSourceState: "generated_not_applied",
  });

  assert.equal(payload.manualInput, input);
  assert.equal(payload.videoDraftSourceState, "generated_not_applied");
  assert.equal("videoDraft" in payload, false);
});

test("applied video draft sends source state and video evidence", () => {
  const input = makeInput();
  const videoDraft = { suggestedFreeDescription: "video observation" };
  const payload = buildReviewRequestPayload({
    input,
    videoDraft,
    videoDraftSourceState: "applied",
  });

  assert.equal(payload.manualInput, input);
  assert.equal(payload.videoDraft, videoDraft);
  assert.equal(payload.videoDraftSourceState, "applied");
});
