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
        `Unexpected runtime dependency in auto scene fixture: ${moduleName}`
      );
    },
    loadedModule,
    loadedModule.exports
  );

  return loadedModule.exports;
}

const { extractAutoSceneCandidates } = loadTypeScriptModule(
  "lib/riot/autoSceneExtractor.ts"
);

function participantFrame({
  participantId,
  totalGold,
  minionsKilled,
  jungleMinionsKilled = 0,
  level = 8,
}) {
  return {
    participantId,
    totalGold,
    minionsKilled,
    jungleMinionsKilled,
    level,
    position: { x: 7000, y: 7000 },
  };
}

function frame(timestampSec, events = [], targetOverrides = {}) {
  return {
    timestamp: timestampSec * 1000,
    participantFrames: {
      "1": participantFrame({
        participantId: 1,
        totalGold: 3000,
        minionsKilled: 80,
        ...targetOverrides,
      }),
      "6": participantFrame({
        participantId: 6,
        totalGold: 3200,
        minionsKilled: 82,
      }),
    },
    events: events.map((event) => ({
      timestamp: timestampSec * 1000,
      ...event,
    })),
  };
}

function makeInput({ frames = [], participants } = {}) {
  return {
    matchId: "KR_7A2",
    participantId: 1,
    championName: "Ahri",
    opponentChampionName: "Syndra",
    matchDetail: {
      info: {
        gameDuration: 1800,
        participants:
          participants ??
          [
            {
              participantId: 1,
              teamId: 100,
              championName: "Ahri",
              individualPosition: "MIDDLE",
              teamPosition: "MIDDLE",
            },
            {
              participantId: 5,
              teamId: 100,
              championName: "Leona",
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
          ],
      },
    },
    timeline: {
      info: {
        frames,
      },
    },
  };
}

function findCandidate(candidates, type) {
  return candidates.find((candidate) => candidate.type === type);
}

test("returns [] for empty or missing timeline frames", () => {
  assert.deepEqual(extractAutoSceneCandidates(makeInput()), []);
  assert.deepEqual(
    extractAutoSceneCandidates({
      ...makeInput(),
      timeline: { info: {} },
    }),
    []
  );
});

test("detects death_review_candidate from target CHAMPION_KILL victim", () => {
  const candidates = extractAutoSceneCandidates(
    makeInput({
      frames: [
        frame(600, [
          {
            type: "CHAMPION_KILL",
            killerId: 6,
            victimId: 1,
            assistingParticipantIds: [7],
            position: { x: 7200, y: 7100 },
          },
        ]),
      ],
    })
  );

  const candidate = findCandidate(candidates, "death_review_candidate");
  assert.ok(candidate);
  assert.equal(candidate.gameTimeSec, 600);
  assert.equal(candidate.confidence, "high");
  assert.equal(candidate.reviewSeed.currentOutcome, "death");
  assert.equal(candidate.reviewSeed.scenarioType, "death_review");
  assert.equal(candidate.evidence[0].certainty, "confirmed_by_riot");
  assert.deepEqual(candidate.reviewSeed.timeWindowSec, {
    startSec: 570,
    endSec: 630,
  });
});

test("detects jungle_gank_death_candidate when enemy jungler is killer or assist", () => {
  const candidates = extractAutoSceneCandidates(
    makeInput({
      frames: [
        frame(620, [
          {
            type: "CHAMPION_KILL",
            killerId: 6,
            victimId: 1,
            assistingParticipantIds: [7],
          },
        ]),
      ],
    })
  );

  const candidate = findCandidate(candidates, "jungle_gank_death_candidate");
  assert.ok(candidate);
  assert.equal(candidate.confidence, "high");
  assert.ok(candidate.riskTagSeeds.includes("ENEMY_JUNGLER_UNKNOWN"));
  assert.match(candidate.reasonKo, /정글러/);
  assert.ok(
    candidate.missingInfo.some((item) => item.includes("시야 상태"))
  );
});

test("detects solo_kill_candidate when target kills without ally assists", () => {
  const candidates = extractAutoSceneCandidates(
    makeInput({
      frames: [
        frame(700, [
          {
            type: "CHAMPION_KILL",
            killerId: 1,
            victimId: 6,
            assistingParticipantIds: [],
          },
        ]),
      ],
    })
  );

  const candidate = findCandidate(candidates, "solo_kill_candidate");
  assert.ok(candidate);
  assert.equal(candidate.reviewSeed.currentOutcome, "solo_kill");
  assert.equal(candidate.reviewSeed.scenarioType, "solo_kill_review");
  assert.match(candidate.reviewSeed.noteKo, /웨이브/);
  assert.equal(candidate.evidence[0].certainty, "confirmed_by_riot");
});

test("detects post_kill_conversion_candidate after solo kill with low gain", () => {
  const candidates = extractAutoSceneCandidates(
    makeInput({
      frames: [
        frame(700, [
          {
            type: "CHAMPION_KILL",
            killerId: 1,
            victimId: 6,
            assistingParticipantIds: [],
          },
        ], {
          totalGold: 3000,
          minionsKilled: 80,
        }),
        frame(790, [], {
          totalGold: 3150,
          minionsKilled: 82,
        }),
      ],
    })
  );

  const candidate = findCandidate(candidates, "post_kill_conversion_candidate");
  assert.ok(candidate);
  assert.equal(candidate.confidence, "medium");
  assert.ok(
    candidate.evidence.some(
      (evidence) => evidence.certainty === "inferred_from_timeline"
    )
  );
  assert.ok(
    candidate.missingInfo.some((item) => item.includes("웨이브 크래시"))
  );
});

test("detects post_kill_conversion_candidate when target dies within 90 seconds", () => {
  const candidates = extractAutoSceneCandidates(
    makeInput({
      frames: [
        frame(700, [
          {
            type: "CHAMPION_KILL",
            killerId: 1,
            victimId: 6,
          },
        ], {
          totalGold: 3000,
          minionsKilled: 80,
        }),
        frame(760, [
          {
            type: "CHAMPION_KILL",
            killerId: 7,
            victimId: 1,
          },
        ], {
          totalGold: 3400,
          minionsKilled: 86,
        }),
        frame(790, [], {
          totalGold: 3450,
          minionsKilled: 87,
        }),
      ],
    })
  );

  assert.ok(findCandidate(candidates, "post_kill_conversion_candidate"));
});

test("detects objective_setup_failure_candidate within 90 seconds before objective", () => {
  const candidates = extractAutoSceneCandidates(
    makeInput({
      frames: [
        frame(1000, [
          {
            type: "CHAMPION_KILL",
            killerId: 6,
            victimId: 1,
          },
        ]),
        frame(1060, [
          {
            type: "ELITE_MONSTER_KILL",
            killerId: 7,
            monsterType: "DRAGON",
            teamId: 200,
          },
        ]),
      ],
    })
  );

  const candidate = findCandidate(
    candidates,
    "objective_setup_failure_candidate"
  );
  assert.ok(candidate);
  assert.equal(candidate.confidence, "medium");
  assert.equal(candidate.evidence.length, 2);
  assert.ok(candidate.reasonKo.includes("90초"));
});

test("does not create objective_setup_failure_candidate outside 90 seconds", () => {
  const candidates = extractAutoSceneCandidates(
    makeInput({
      frames: [
        frame(900, [
          {
            type: "CHAMPION_KILL",
            killerId: 6,
            victimId: 1,
          },
        ]),
        frame(1000, [
          {
            type: "ELITE_MONSTER_KILL",
            killerId: 7,
            monsterType: "BARON_NASHOR",
            teamId: 200,
          },
        ]),
      ],
    })
  );

  assert.equal(
    findCandidate(candidates, "objective_setup_failure_candidate"),
    undefined
  );
});

test("all candidates include evidence certainty and reviewSeed time window", () => {
  const candidates = extractAutoSceneCandidates(
    makeInput({
      frames: [
        frame(600, [
          {
            type: "CHAMPION_KILL",
            killerId: 6,
            victimId: 1,
            assistingParticipantIds: [7],
          },
        ]),
        frame(700, [
          {
            type: "CHAMPION_KILL",
            killerId: 1,
            victimId: 6,
          },
        ]),
        frame(760, [
          {
            type: "ELITE_MONSTER_KILL",
            killerId: 7,
            monsterType: "DRAGON",
          },
        ]),
        frame(790, [], {
          totalGold: 3100,
          minionsKilled: 81,
        }),
      ],
    })
  );

  assert.ok(candidates.length > 0);
  for (const candidate of candidates) {
    assert.ok(candidate.reviewSeed.timeWindowSec);
    assert.equal(typeof candidate.reviewSeed.timeWindowSec.startSec, "number");
    assert.equal(typeof candidate.reviewSeed.timeWindowSec.endSec, "number");
    assert.ok(candidate.evidence.length > 0);
    assert.ok(candidate.evidence.every((evidence) => evidence.certainty));
  }
});

test("candidates are sorted by gameTimeSec ascending", () => {
  const candidates = extractAutoSceneCandidates(
    makeInput({
      frames: [
        frame(900, [
          {
            type: "CHAMPION_KILL",
            killerId: 1,
            victimId: 6,
          },
        ]),
        frame(500, [
          {
            type: "CHAMPION_KILL",
            killerId: 6,
            victimId: 1,
          },
        ]),
        frame(600, [
          {
            type: "ELITE_MONSTER_KILL",
            killerId: 7,
            monsterType: "DRAGON",
          },
        ]),
        frame(990, [], {
          totalGold: 3050,
          minionsKilled: 81,
        }),
      ],
    })
  );

  const times = candidates.map((candidate) => candidate.gameTimeSec);
  assert.deepEqual(times, [...times].sort((left, right) => left - right));
});
