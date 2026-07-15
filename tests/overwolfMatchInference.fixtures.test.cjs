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
        `Unexpected runtime dependency in Overwolf match inference fixture: ${moduleName}`
      );
    },
    loadedModule,
    loadedModule.exports
  );

  return loadedModule.exports;
}

const { inferRiotMatchFromOverwolfPackage } = loadTypeScriptModule(
  "lib/overwolfMatchInference.ts"
);

const END_TIME_MS = 1_800_000;

function makePackage(overrides = {}) {
  return {
    packageId: "ow-package",
    source: "overwolf",
    puuidGuess: "player-puuid",
    events: [
      {
        id: "event-1",
        type: "death",
        localTimestampMs: END_TIME_MS - 30_000,
        confidence: "high",
      },
    ],
    clips: [],
    collectedAtLocalTimestampMs: END_TIME_MS,
    ...overrides,
  };
}

function makeCandidate(overrides = {}) {
  return {
    matchId: overrides.matchId ?? "KR_1",
    puuid: overrides.puuid ?? "player-puuid",
    gameEndTimestampMs: overrides.gameEndTimestampMs ?? END_TIME_MS + 60_000,
    gameStartTimestampMs: overrides.gameStartTimestampMs,
    gameDurationSec: overrides.gameDurationSec,
    championName: overrides.championName ?? "Ahri",
    queueId: overrides.queueId ?? 420,
  };
}

test("empty candidates returns unknown", () => {
  const result = inferRiotMatchFromOverwolfPackage(makePackage(), []);

  assert.equal(result.status, "unknown");
  assert.equal(result.confidenceScore, 0);
  assert.equal(result.candidateCount, 0);
});

test("exact puuid and close end time returns confirmed", () => {
  const result = inferRiotMatchFromOverwolfPackage(makePackage(), [
    makeCandidate({ matchId: "KR_confirmed", gameEndTimestampMs: END_TIME_MS + 120_000 }),
  ]);

  assert.equal(result.status, "confirmed");
  assert.equal(result.matchId, "KR_confirmed");
  assert.ok(result.confidenceScore > 0.8);
});

test("puuid match but time far away returns unknown with warning context", () => {
  const result = inferRiotMatchFromOverwolfPackage(makePackage(), [
    makeCandidate({ matchId: "KR_far", gameEndTimestampMs: END_TIME_MS + 45 * 60_000 }),
  ]);

  assert.equal(result.status, "unknown");
  assert.equal(result.matchId, undefined);
  assert.ok(result.warningsKo.length > 0);
});

test("no puuid but close single candidate returns likely", () => {
  const result = inferRiotMatchFromOverwolfPackage(
    makePackage({ puuidGuess: undefined }),
    [makeCandidate({ matchId: "KR_likely", puuid: undefined })]
  );

  assert.equal(result.status, "likely");
  assert.equal(result.matchId, "KR_likely");
  assert.ok(result.warningsKo.some((warning) => warning.includes("puuid")));
});

test("multiple close candidates returns unknown with ambiguity warning", () => {
  const result = inferRiotMatchFromOverwolfPackage(makePackage(), [
    makeCandidate({ matchId: "KR_1", gameEndTimestampMs: END_TIME_MS + 60_000 }),
    makeCandidate({ matchId: "KR_2", gameEndTimestampMs: END_TIME_MS + 120_000 }),
  ]);

  assert.equal(result.status, "unknown");
  assert.equal(result.matchId, undefined);
  assert.ok(result.confidenceScore <= 0.49);
  assert.ok(
    result.reasonsKo.includes(
      "시간대가 가까운 후보는 있지만 단일 매치로 확정하기 어렵습니다."
    )
  );
  assert.ok(result.warningsKo.some((warning) => warning.includes("여러 개")));
});

test("missing gameEndTimestampMs uses start plus duration", () => {
  const result = inferRiotMatchFromOverwolfPackage(makePackage(), [
    makeCandidate({
      matchId: "KR_duration",
      gameEndTimestampMs: undefined,
      gameStartTimestampMs: END_TIME_MS - 1800_000,
      gameDurationSec: 1800,
    }),
  ]);

  assert.equal(result.status, "confirmed");
  assert.equal(result.matchId, "KR_duration");
});

test("package with no useful timestamp returns unknown", () => {
  const result = inferRiotMatchFromOverwolfPackage(
    makePackage({
      collectedAtLocalTimestampMs: undefined,
      events: [{ id: "event-1", type: "death", confidence: "high" }],
      clips: [],
    }),
    [makeCandidate()]
  );

  assert.equal(result.status, "unknown");
  assert.equal(result.confidenceScore, 0);
});

test("input mutation is not performed", () => {
  const pkg = makePackage();
  const candidates = [makeCandidate()];
  const beforePkg = structuredClone(pkg);
  const beforeCandidates = structuredClone(candidates);

  inferRiotMatchFromOverwolfPackage(pkg, candidates);

  assert.deepEqual(pkg, beforePkg);
  assert.deepEqual(candidates, beforeCandidates);
});

test("deterministic output", () => {
  const pkg = makePackage();
  const candidates = [makeCandidate({ matchId: "KR_1" })];

  assert.deepEqual(
    inferRiotMatchFromOverwolfPackage(pkg, candidates),
    inferRiotMatchFromOverwolfPackage(pkg, candidates)
  );
});
