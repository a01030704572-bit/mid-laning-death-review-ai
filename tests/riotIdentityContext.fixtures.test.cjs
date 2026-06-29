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
        `Unexpected runtime dependency in Riot identity fixture: ${moduleName}`
      );
    },
    loadedModule,
    loadedModule.exports
  );

  return loadedModule.exports;
}

const { buildRiotIdentityContext, normalizeParticipantRole } =
  loadTypeScriptModule("lib/riot/riotIdentityContext.ts");

function makeParticipants(overrides = []) {
  const participants = [
    {
      participantId: 1,
      teamId: 100,
      championName: "Ahri",
      puuid: "target-puuid",
      individualPosition: "MIDDLE",
      teamPosition: "MIDDLE",
      summonerName: "Target",
    },
    {
      participantId: 2,
      teamId: 100,
      championName: "Vi",
      individualPosition: "JUNGLE",
      teamPosition: "JUNGLE",
    },
    {
      participantId: 5,
      teamId: 100,
      championName: "Nautilus",
      individualPosition: "UTILITY",
      teamPosition: "UTILITY",
    },
    {
      participantId: 6,
      teamId: 200,
      championName: "Syndra",
      individualPosition: "MIDDLE",
      teamPosition: "MIDDLE",
    },
    {
      participantId: 7,
      teamId: 200,
      championName: "LeeSin",
      individualPosition: "JUNGLE",
      teamPosition: "JUNGLE",
    },
    {
      participantId: 10,
      teamId: 200,
      championName: "Rakan",
      individualPosition: "UTILITY",
      teamPosition: "UTILITY",
    },
  ];

  for (const override of overrides) {
    const index = participants.findIndex(
      (participant) => participant.participantId === override.participantId
    );
    if (index >= 0) participants[index] = { ...participants[index], ...override };
    else participants.push(override);
  }

  return participants;
}

function frame(timestampSec, events = []) {
  return {
    timestamp: timestampSec * 1000,
    events: events.map((event) => ({
      timestamp: timestampSec * 1000,
      ...event,
    })),
  };
}

function makeInput({ participants = makeParticipants(), frames = [] } = {}) {
  return {
    matchId: "KR_IDENTITY",
    participantId: 1,
    matchDetail: {
      info: {
        participants,
      },
    },
    timeline: {
      info: {
        frames,
      },
    },
  };
}

test("builds participant identities and marks target, ally, and enemy by teamId", () => {
  const context = buildRiotIdentityContext(makeInput());

  assert.equal(context.targetParticipantId, 1);
  assert.equal(context.targetTeamId, 100);
  assert.equal(context.target.participantId, 1);
  assert.equal(context.target.isTarget, true);
  assert.equal(context.participantsById[1].side, "ally");
  assert.equal(context.participantsById[2].side, "ally");
  assert.equal(context.participantsById[6].side, "enemy");
  assert.equal(context.allies.length, 3);
  assert.equal(context.enemies.length, 3);
});

test("finds mid, jungle, and support identities by team and normalized role", () => {
  const context = buildRiotIdentityContext(makeInput());

  assert.equal(context.allyMid.championName, "Ahri");
  assert.equal(context.enemyMid.championName, "Syndra");
  assert.equal(context.allyJungler.championName, "Vi");
  assert.equal(context.enemyJungler.championName, "LeeSin");
  assert.equal(context.allySupport.championName, "Nautilus");
  assert.equal(context.enemySupport.championName, "Rakan");
});

test("handles missing teamId without crashing and marks side unknown", () => {
  const context = buildRiotIdentityContext(
    makeInput({
      participants: makeParticipants([
        {
          participantId: 1,
          teamId: undefined,
        },
      ]),
    })
  );

  assert.equal(context.targetTeamId, undefined);
  assert.equal(context.participantsById[1].side, "unknown");
  assert.equal(context.participantsById[6].side, "unknown");
  assert.ok(context.missingInfo.some((item) => item.includes("teamId")));
});

test("normalizes role aliases", () => {
  assert.equal(normalizeParticipantRole({ teamPosition: "MID" }), "MIDDLE");
  assert.equal(normalizeParticipantRole({ teamPosition: "BOT" }), "BOTTOM");
  assert.equal(normalizeParticipantRole({ teamPosition: "ADC" }), "BOTTOM");
  assert.equal(normalizeParticipantRole({ teamPosition: "CARRY" }), "BOTTOM");
  assert.equal(normalizeParticipantRole({ teamPosition: "SUP" }), "UTILITY");
  assert.equal(normalizeParticipantRole({ teamPosition: "SUPPORT" }), "UTILITY");
  assert.equal(normalizeParticipantRole({ teamPosition: "invalid" }), "UNKNOWN");
});

test("extracts known objective identities from timeline", () => {
  const context = buildRiotIdentityContext(
    makeInput({
      frames: [
        frame(300, [
          { type: "ELITE_MONSTER_KILL", monsterType: "DRAGON", killerId: 7 },
        ]),
        frame(600, [
          {
            type: "ELITE_MONSTER_KILL",
            monsterType: "DRAGON",
            monsterSubType: "ELDER_DRAGON",
            killerId: 7,
          },
        ]),
        frame(840, [
          { type: "ELITE_MONSTER_KILL", monsterType: "HORDE", killerId: 2 },
        ]),
        frame(900, [
          { type: "ELITE_MONSTER_KILL", monsterType: "RIFTHERALD", killerId: 2 },
        ]),
        frame(1200, [
          {
            type: "ELITE_MONSTER_KILL",
            monsterType: "BARON_NASHOR",
            killerId: 7,
            teamId: 200,
            position: { x: 5000, y: 10000 },
          },
        ]),
      ],
    })
  );

  assert.deepEqual(
    context.objectives.map((objective) => objective.objectiveType),
    ["dragon", "elder_dragon", "void_grub", "rift_herald", "baron"]
  );
  assert.equal(context.objectives[4].killerTeamId, 200);
  assert.deepEqual(context.objectives[4].position, { x: 5000, y: 10000 });
  assert.ok(
    context.objectives.every(
      (objective) => objective.certainty === "confirmed_by_riot"
    )
  );
});

test("unknown objective type is kept as unknown and adds missing info", () => {
  const context = buildRiotIdentityContext(
    makeInput({
      frames: [
        frame(500, [
          { type: "ELITE_MONSTER_KILL", killerId: 7, teamId: 200 },
        ]),
      ],
    })
  );

  assert.equal(context.objectives[0].objectiveType, "unknown");
  assert.equal(context.objectives[0].certainty, "inferred_from_timeline");
  assert.ok(
    context.missingInfo.some((item) => item.includes("monsterType"))
  );
});

test("empty or missing timeline returns no objectives and does not crash", () => {
  const emptyContext = buildRiotIdentityContext(makeInput());
  const missingContext = buildRiotIdentityContext({
    ...makeInput(),
    timeline: undefined,
  });

  assert.deepEqual(emptyContext.objectives, []);
  assert.deepEqual(missingContext.objectives, []);
  assert.ok(emptyContext.missingInfo.some((item) => item.includes("timeline")));
  assert.ok(missingContext.missingInfo.some((item) => item.includes("timeline")));
});

test("participantsById is populated correctly", () => {
  const context = buildRiotIdentityContext(makeInput());

  assert.equal(context.participantsById[1].championName, "Ahri");
  assert.equal(context.participantsById[7].role, "JUNGLE");
  assert.equal(context.participantsById[10].side, "enemy");
});

test("does not infer side or role from video-like or champion-only data", () => {
  const context = buildRiotIdentityContext(
    makeInput({
      participants: [
        {
          participantId: 1,
          championName: "Ahri",
          summonerName: "looks like blue side mid",
        },
        {
          participantId: 2,
          championName: "LeeSin",
          summonerName: "enemy jungle in video",
        },
      ],
    })
  );

  assert.equal(context.participantsById[1].side, "unknown");
  assert.equal(context.participantsById[1].role, "UNKNOWN");
  assert.equal(context.participantsById[2].side, "unknown");
  assert.equal(context.participantsById[2].role, "UNKNOWN");
});

test("all objective summaries use cautious Riot timeline wording", () => {
  const context = buildRiotIdentityContext(
    makeInput({
      frames: [
        frame(300, [
          { type: "ELITE_MONSTER_KILL", monsterType: "DRAGON", killerId: 7 },
        ]),
        frame(500, [
          { type: "ELITE_MONSTER_KILL", killerId: 7 },
        ]),
      ],
    })
  );

  assert.ok(context.objectives.length > 0);
  for (const objective of context.objectives) {
    assert.match(objective.summaryKo, /Riot timeline 기준/);
    assert.match(objective.summaryKo, /확인/);
    assert.doesNotMatch(objective.summaryKo, /무조건|원인|확정 원인/);
  }
});
