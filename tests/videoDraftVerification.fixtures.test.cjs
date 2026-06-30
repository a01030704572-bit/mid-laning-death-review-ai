/* eslint-disable @typescript-eslint/no-require-imports -- Node fixture harness transpiles the real TypeScript modules without adding a test dependency. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

function transpile(relativePath, dependencies = {}) {
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
        `Unexpected runtime dependency in video draft verification fixture: ${moduleName}`
      );
    },
    loadedModule,
    loadedModule.exports
  );

  return loadedModule.exports;
}

const normalizer = transpile("lib/championNameNormalizer.ts");
const riotContextModule = transpile("lib/riotChampionContext.ts", {
  "@/lib/championNameNormalizer": normalizer,
});
const verificationModule = transpile("lib/videoDraftVerification.ts", {
  "@/lib/championNameNormalizer": normalizer,
  "@/lib/riotChampionContext": riotContextModule,
  "@/lib/videoDraftToReviewFormPatch": {},
});
const trustGateModule = transpile("lib/videoDraftTrustGate.ts", {
  "@/types/review": {},
  "@/lib/videoDraftToReviewFormPatch": {},
});

const { championNamesMatch, normalizeChampionName } = normalizer;
const { buildRiotChampionContext } = riotContextModule;
const { filterVideoDraftPatchWithVerification } = verificationModule;
const {
  buildVideoDraftApplyWarning,
  filterVideoDraftPatchByTrustGate,
  hasExistingCoreSceneInput,
} = trustGateModule;

test("Korean and English champion normalization matches immediate regression cases", () => {
  assert.equal(championNamesMatch("아칼리", "Akali"), true);
  assert.equal(championNamesMatch("리산드라", "Lissandra"), true);
  assert.equal(championNamesMatch("리 신", "LeeSin"), true);
  assert.equal(championNamesMatch("리신", "Lee Sin"), true);
  assert.equal(normalizeChampionName(" Lee   Sin "), "leesin");
});

test("regression: Riot says Akali but video guessed Lissandra, so champion patch is filtered", () => {
  const riotContext = buildRiotChampionContext({
    playerPuuid: "player-1",
    participants: [
      participant("player-1", 100, "Akali", "MIDDLE"),
      participant("enemy-mid", 200, "Lee Sin", "MIDDLE"),
    ],
  });
  const result = filterVideoDraftPatchWithVerification({
    patch: {
      myChampion: "Lissandra",
      enemyChampion: "Lee Sin",
      freeDescription: "visible trade timing",
      laneStateDetail: "slow_pushing_to_enemy",
    },
    manualInput: { myChampion: "Akali" },
    riotContext,
  });

  assert.equal(result.championStatuses.myChampion, "manual_value_preserved");
  assert.equal(result.conflicts.length, 1);
  assert.equal(result.conflicts[0].field, "myChampion");
  assert.equal(result.filteredPatch.myChampion, undefined);
  assert.equal(result.filteredPatch.enemyChampion, "Lee Sin");
  assert.equal(result.filteredPatch.freeDescription, "visible trade timing");
  assert.equal(result.filteredPatch.laneStateDetail, "slow_pushing_to_enemy");
});

test("wrong champion draft through trust gate and champion guard preserves safe text", () => {
  const trustGate = filterVideoDraftPatchByTrustGate({
    myChampion: "Lissandra",
    freeDescription: "safe visible observation",
  });
  const verification = filterVideoDraftPatchWithVerification({
    patch: trustGate.filteredPatch,
    manualInput: { myChampion: "Akali" },
  });

  assert.equal(verification.filteredPatch.myChampion, undefined);
  assert.equal(
    verification.filteredPatch.freeDescription,
    "safe visible observation"
  );
});

test("video champion matching Riot is allowed when manual input does not conflict", () => {
  const riotContext = buildRiotChampionContext({
    playerPuuid: "player-1",
    participants: [participant("player-1", 100, "Akali", "MIDDLE")],
  });
  const result = filterVideoDraftPatchWithVerification({
    patch: { myChampion: "아칼리" },
    riotContext,
  });

  assert.equal(result.championStatuses.myChampion, "verified_match");
  assert.equal(result.filteredPatch.myChampion, "아칼리");
  assert.deepEqual(result.conflicts, []);
});

test("missing Riot evidence does not crash or create a false conflict", () => {
  const riotContext = buildRiotChampionContext();
  const result = filterVideoDraftPatchWithVerification({
    patch: { myChampion: "Akali", freeDescription: "safe detail" },
    riotContext,
  });

  assert.equal(riotContext.status, "no_riot_context");
  assert.equal(result.championStatuses.myChampion, "unverified_no_riot_context");
  assert.equal(result.filteredPatch.myChampion, undefined);
  assert.equal(result.filteredPatch.freeDescription, "safe detail");
  assert.deepEqual(result.conflicts, []);
});

test("manual Akali and video Akali Korean candidate allows champion field", () => {
  const result = filterVideoDraftPatchWithVerification({
    patch: {
      myChampion: "아칼리",
      freeDescription: "safe non champion detail",
    },
    manualInput: { myChampion: "Akali" },
  });

  assert.equal(result.championStatuses.myChampion, "verified_match");
  assert.equal(result.filteredPatch.myChampion, "아칼리");
  assert.equal(result.filteredPatch.freeDescription, "safe non champion detail");
  assert.deepEqual(result.conflicts, []);
});

test("no Riot and no manual champion skips video champion but keeps non-champion fields", () => {
  const result = filterVideoDraftPatchWithVerification({
    patch: {
      myChampion: "Lissandra",
      currentOutcome: "death",
      freeDescription: "visible wave state",
    },
  });

  assert.equal(result.championStatuses.myChampion, "unverified_no_riot_context");
  assert.equal(result.filteredPatch.myChampion, undefined);
  assert.equal(result.filteredPatch.currentOutcome, "death");
  assert.equal(result.filteredPatch.freeDescription, "visible wave state");
  assert.deepEqual(result.conflicts, []);
});

test("wrong objective framing is blocked by trust gate while safe text passes", () => {
  const trustGate = filterVideoDraftPatchByTrustGate({
    objectiveType: "dragon",
    currentOutcome: "objective_trade_gain",
    freeDescription: "player walked into fog before fight",
  });

  assert.deepEqual(trustGate.filteredPatch, {
    freeDescription: "player walked into fog before fight",
  });
  assert.deepEqual(trustGate.blockedFields, ["objectiveType", "currentOutcome"]);
});

test("wrong fight type and routing-critical fields are blocked without verification", () => {
  const trustGate = filterVideoDraftPatchByTrustGate({
    currentOutcome: "solo_kill",
    laneStateDetail: "slow_pushing_to_enemy",
    enemyJungleInfoBeforeFight: "not_seen_recently",
  });

  assert.deepEqual(trustGate.filteredPatch, {});
  assert.deepEqual(trustGate.blockedFields, [
    "currentOutcome",
    "laneStateDetail",
    "enemyJungleInfoBeforeFight",
  ]);
});

test("safe text apply remains allowed", () => {
  const trustGate = filterVideoDraftPatchByTrustGate({
    freeDescription: "only visible observation text",
  });

  assert.deepEqual(trustGate.filteredPatch, {
    freeDescription: "only visible observation text",
  });
  assert.deepEqual(trustGate.blockedFields, []);
});

test("stale manual conflict warning exists when core scene input is present", () => {
  const stale = hasExistingCoreSceneInput({
    myChampion: "Akali",
    enemyChampion: "Vex",
  });
  const warning = buildVideoDraftApplyWarning({
    hasExistingCoreSceneInput: stale,
    blockedFields: ["currentOutcome"],
  });

  assert.equal(stale, true);
  assert.ok(warning);
  assert.match(warning.message, /기존 수동 입력/);
});

test("deny-by-default blocks unclassified patch fields at runtime", () => {
  const trustGate = filterVideoDraftPatchByTrustGate({
    freeDescription: "safe",
    madeUpRoutingField: "unsafe",
  });

  assert.deepEqual(trustGate.filteredPatch, { freeDescription: "safe" });
  assert.deepEqual(trustGate.blockedFields, ["madeUpRoutingField"]);
});

test("playerPuuid not found among participants does not guess player champion", () => {
  const riotContext = buildRiotChampionContext({
    playerPuuid: "missing-player",
    participants: Array.from({ length: 10 }, (_, index) =>
      participant(`puuid-${index}`, index < 5 ? 100 : 200, `Champion${index}`, "MIDDLE")
    ),
  });

  assert.equal(riotContext.status, "player_puuid_not_found");
  assert.equal(riotContext.playerChampion, null);
  assert.equal(riotContext.playerChampionKey, null);
});

test("missing or ambiguous middle position is uncertain and does not throw", () => {
  const missingPosition = buildRiotChampionContext({
    playerPuuid: "player-1",
    participants: [
      participant("player-1", 100, "Akali"),
      participant("enemy-1", 200, "Lissandra"),
    ],
  });
  const ambiguousPosition = buildRiotChampionContext({
    playerPuuid: "player-1",
    participants: [
      participant("player-1", 100, "Akali", "MIDDLE"),
      participant("enemy-1", 200, "Lissandra", "MIDDLE"),
      participant("enemy-2", 200, "Ahri", "MIDDLE"),
    ],
  });

  assert.equal(missingPosition.enemyMidStatus, "missing");
  assert.equal(missingPosition.enemyMidChampion, null);
  assert.equal(ambiguousPosition.enemyMidStatus, "ambiguous");
  assert.equal(ambiguousPosition.enemyMidChampion, null);
});

test("manual champion conflict preserves manual value and filters video champion", () => {
  const result = filterVideoDraftPatchWithVerification({
    patch: {
      myChampion: "Lissandra",
      enemyChampion: "Zed",
      freeDescription: "draft remains useful",
    },
    manualInput: {
      myChampion: "Akali",
      enemyChampion: "Zed",
    },
  });

  assert.equal(result.filteredPatch.myChampion, undefined);
  assert.equal(result.filteredPatch.enemyChampion, "Zed");
  assert.equal(result.filteredPatch.freeDescription, "draft remains useful");
  assert.equal(result.championStatuses.myChampion, "manual_value_preserved");
  assert.equal(result.championStatuses.enemyChampion, "verified_match");
});

test("manual enemy champion conflict filters enemyChampion and keeps non-champion fields", () => {
  const result = filterVideoDraftPatchWithVerification({
    patch: {
      enemyChampion: "Lissandra",
      laneStateDetail: "slow_pushing_to_enemy",
    },
    manualInput: {
      enemyChampion: "Akali",
    },
  });

  assert.equal(result.championStatuses.enemyChampion, "manual_value_preserved");
  assert.equal(result.filteredPatch.enemyChampion, undefined);
  assert.equal(result.filteredPatch.laneStateDetail, "slow_pushing_to_enemy");
  assert.equal(result.conflicts.length, 1);
  assert.equal(result.conflicts[0].field, "enemyChampion");
});

test("non-champion patch fields remain when champion fields are filtered", () => {
  const result = filterVideoDraftPatchWithVerification({
    patch: {
      myChampion: "Lissandra",
      currentOutcome: "death",
      laneStateDetail: "slow_pushing_to_enemy",
      enemyJungleInfoBeforeFight: "not_seen_recently",
    },
    manualInput: { myChampion: "Akali" },
  });

  assert.deepEqual(result.filteredPatch, {
    currentOutcome: "death",
    laneStateDetail: "slow_pushing_to_enemy",
    enemyJungleInfoBeforeFight: "not_seen_recently",
  });
});

test("actionable conflict cap excludes informational no-context statuses", () => {
  const result = filterVideoDraftPatchWithVerification({
    patch: {
      myChampion: "Lissandra",
      enemyChampion: "Ahri",
    },
    manualInput: {
      myChampion: "Akali",
      enemyChampion: "Zed",
    },
    conflictCap: 1,
  });
  const noContext = filterVideoDraftPatchWithVerification({
    patch: { myChampion: "Akali" },
  });

  assert.equal(result.conflicts.length, 2);
  assert.equal(result.actionableConflicts.length, 1);
  assert.equal(noContext.actionableConflicts.length, 0);
});

test("combined block reasons preserve safe text and distinguish trust gate from champion guard", () => {
  const trustGate = filterVideoDraftPatchByTrustGate({
    myChampion: "Lissandra",
    currentOutcome: "solo_kill",
    objectiveType: "dragon",
    freeDescription: "safe observation",
  });
  const verification = filterVideoDraftPatchWithVerification({
    patch: trustGate.filteredPatch,
    manualInput: { myChampion: "Akali" },
  });

  assert.deepEqual(trustGate.blockedFields, ["currentOutcome", "objectiveType"]);
  assert.equal(verification.conflicts[0].field, "myChampion");
  assert.deepEqual(verification.filteredPatch, {
    freeDescription: "safe observation",
  });
});

function participant(puuid, teamId, championName, teamPosition) {
  return {
    puuid,
    teamId,
    championName,
    teamPosition,
    individualPosition: teamPosition,
  };
}
