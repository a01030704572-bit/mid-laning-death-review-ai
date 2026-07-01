/* eslint-disable @typescript-eslint/no-require-imports -- Node fixture harness transpiles the real TypeScript modules without adding a test dependency. */
const assert = require("node:assert/strict");
const { builtinModules } = require("node:module");
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
      if (moduleName.startsWith("node:") || builtinModules.includes(moduleName)) {
        return require(moduleName);
      }
      throw new Error(`Unexpected runtime dependency in Riot fixture: ${moduleName}`);
    },
    loadedModule,
    loadedModule.exports
  );

  return loadedModule.exports;
}

const timelineParserModule = loadTypeScriptModule("lib/riot/timelineParser.ts");
const evidenceBuilderModule = loadTypeScriptModule("lib/riot/evidenceBuilder.ts", {
  "@/lib/riot/timelineParser": timelineParserModule,
});
const autoSceneExtractorModule = loadTypeScriptModule(
  "lib/riot/autoSceneExtractor.ts"
);
const riotClientModule = loadTypeScriptModule("lib/riot/client.ts");

function makeMatch({ enemyMidPosition = "MIDDLE" } = {}) {
  return {
    metadata: { matchId: "KR_1" },
    info: {
      gameCreation: 1760000000000,
      gameDuration: 1500,
      participants: [
        {
          puuid: "player-puuid",
          participantId: 1,
          teamId: 100,
          championName: "Ahri",
          individualPosition: "MIDDLE",
          teamPosition: "MIDDLE",
          kills: 3,
          deaths: 4,
          assists: 5,
          win: false,
        },
        {
          puuid: "enemy-mid-puuid",
          participantId: 6,
          teamId: 200,
          championName: "Syndra",
          individualPosition: enemyMidPosition,
          teamPosition: enemyMidPosition,
          kills: 5,
          deaths: 2,
          assists: 4,
          win: true,
        },
      ],
    },
  };
}

function participantFrame({
  participantId,
  minionsKilled,
  jungleMinionsKilled = 0,
  totalGold,
  currentGold,
  xp,
  level,
}) {
  return {
    participantId,
    minionsKilled,
    jungleMinionsKilled,
    totalGold,
    currentGold,
    xp,
    level,
  };
}

function makeTimeline(events = []) {
  return {
    metadata: { matchId: "KR_1" },
    info: {
      frames: [
        {
          timestamp: 240000,
          participantFrames: {
            "1": participantFrame({
              participantId: 1,
              minionsKilled: 42,
              totalGold: 3200,
              currentGold: 700,
              xp: 4100,
              level: 8,
            }),
            "6": participantFrame({
              participantId: 6,
              minionsKilled: 45,
              totalGold: 3300,
              currentGold: 800,
              xp: 4200,
              level: 8,
            }),
          },
          events: [],
        },
        {
          timestamp: 300000,
          participantFrames: {
            "1": participantFrame({
              participantId: 1,
              minionsKilled: 43,
              totalGold: 3260,
              currentGold: 760,
              xp: 4150,
              level: 8,
            }),
            "6": participantFrame({
              participantId: 6,
              minionsKilled: 51,
              totalGold: 3850,
              currentGold: 1350,
              xp: 4500,
              level: 9,
            }),
          },
          events,
        },
      ],
    },
  };
}

function buildEvidence(events, overrides = {}) {
  return evidenceBuilderModule.buildRiotTimelineEvidence({
    match: overrides.match ?? makeMatch(),
    timeline: overrides.timeline ?? makeTimeline(events),
    request: {
      matchId: "KR_1",
      puuid: "player-puuid",
      gameTimeSec: 240,
      windowSec: 60,
      ...overrides.request,
    },
  });
}

function loadEvidenceRoute(clientOverrides = {}, extractorOverrides = {}) {
  const clientModule = {
    ...riotClientModule,
    requireRiotApiKey: () => "riot-api-key",
    getMatchDetail: async () => makeMatch(),
    getMatchTimeline: async () => makeTimeline([]),
    ...clientOverrides,
  };

  return loadTypeScriptModule("app/api/riot/evidence/route.ts", {
    "next/server": {
      NextResponse: {
        json: (body, init = {}) => ({
          body,
          status: init.status ?? 200,
        }),
      },
    },
    "@/lib/riot/client": clientModule,
    "@/lib/riot/evidenceBuilder": evidenceBuilderModule,
    "@/lib/riot/autoSceneExtractor": {
      ...autoSceneExtractorModule,
      ...extractorOverrides,
    },
    "@/lib/riot/timelineParser": timelineParserModule,
  });
}

async function postEvidence(routeModule, body) {
  return routeModule.POST({
    json: async () => body,
  });
}

test("death scene includes death event and CS/XP loss draft", () => {
  const evidence = buildEvidence([
    {
      timestamp: 260000,
      type: "CHAMPION_KILL",
      killerId: 6,
      victimId: 1,
    },
  ]);

  assert.ok(evidence.events.some((event) => event.kind === "death"));
  assert.ok(evidence.playerDelta.csDelta >= 0);
  assert.ok(
    evidence.gainLossDraft.playerLosses.some((loss) => loss.includes("CS 손실 가능성"))
  );
  assert.ok(
    evidence.gainLossDraft.playerLosses.some((loss) => loss.includes("경험치 손실 가능성"))
  );
});

test("event importance separates primary, secondary, and minor events", () => {
  const evidence = buildEvidence([
    {
      timestamp: 250000,
      type: "WARD_PLACED",
      creatorId: 1,
    },
    {
      timestamp: 252000,
      type: "ITEM_PURCHASED",
      participantId: 1,
      itemId: 1056,
    },
    {
      timestamp: 254000,
      type: "LEVEL_UP",
      participantId: 1,
    },
    {
      timestamp: 260000,
      type: "CHAMPION_KILL",
      killerId: 6,
      victimId: 1,
    },
    {
      timestamp: 270000,
      type: "ELITE_MONSTER_KILL",
      monsterType: "DRAGON",
      teamId: 200,
      killerId: 6,
    },
    {
      timestamp: 280000,
      type: "BUILDING_KILL",
      buildingType: "TOWER_BUILDING",
      laneType: "MID_LANE",
      killerId: 6,
    },
    {
      timestamp: 290000,
      type: "TURRET_PLATE_DESTROYED",
      killerId: 6,
    },
  ]);

  assert.equal(
    evidence.events.find((event) => event.kind === "death").importance,
    "primary"
  );
  assert.equal(
    evidence.events.find((event) => event.kind === "objective").importance,
    "secondary"
  );
  assert.equal(
    evidence.events.find((event) => event.kind === "building").importance,
    "secondary"
  );
  assert.equal(
    evidence.events.find((event) => event.kind === "turret_plate").importance,
    "secondary"
  );
  assert.equal(
    evidence.events.find((event) => event.kind === "ward").importance,
    "minor"
  );
  assert.equal(
    evidence.events.find((event) => event.kind === "item").importance,
    "minor"
  );
  assert.equal(
    evidence.events.find((event) => event.kind === "level").importance,
    "minor"
  );
  assert.equal(evidence.events[0].kind, "death");
});

test("turret plate event is neutral when team attribution is not verified", () => {
  const evidence = buildEvidence([
    {
      timestamp: 270000,
      type: "TURRET_PLATE_DESTROYED",
      killerId: 6,
    },
  ]);

  assert.ok(evidence.events.some((event) => event.kind === "turret_plate"));
  assert.ok(
    evidence.gainLossDraft.enemyGains.some((gain) =>
      gain.includes("포탑 플레이트 파괴 이벤트 발생")
    )
  );
  assert.ok(
    evidence.gainLossDraft.enemyGains.some((gain) =>
      gain.includes("어느 팀의 이득인지는 추가 확인 필요")
    )
  );
  assert.ok(
    !evidence.gainLossDraft.enemyGains.some((gain) =>
      gain.includes("상대 플레이트 골드 획득")
    )
  );
  assert.doesNotMatch(evidence.gainLossDraft.swingSummary, /손해 장면/);
});

test("positive fight advantage-like deltas do not produce loss wording", () => {
  const evidence = buildEvidence(
    [
      {
        timestamp: 270000,
        type: "TURRET_PLATE_DESTROYED",
        killerId: 1,
      },
    ],
    {
      timeline: {
        metadata: { matchId: "KR_1" },
        info: {
          frames: [
            {
              timestamp: 240000,
              participantFrames: {
                "1": participantFrame({
                  participantId: 1,
                  minionsKilled: 42,
                  totalGold: 3200,
                  currentGold: 700,
                  xp: 4100,
                  level: 8,
                }),
                "6": participantFrame({
                  participantId: 6,
                  minionsKilled: 45,
                  totalGold: 3300,
                  currentGold: 800,
                  xp: 4200,
                  level: 8,
                }),
              },
              events: [],
            },
            {
              timestamp: 300000,
              participantFrames: {
                "1": participantFrame({
                  participantId: 1,
                  minionsKilled: 50,
                  totalGold: 4016,
                  currentGold: 1516,
                  xp: 4904,
                  level: 9,
                }),
                "6": participantFrame({
                  participantId: 6,
                  minionsKilled: 46,
                  totalGold: 3450,
                  currentGold: 950,
                  xp: 4300,
                  level: 8,
                }),
              },
              events: [
                {
                  timestamp: 270000,
                  type: "TURRET_PLATE_DESTROYED",
                  killerId: 1,
                },
              ],
            },
          ],
        },
      },
    }
  );

  assert.equal(evidence.playerDelta.totalGoldDelta, 816);
  assert.equal(evidence.playerDelta.xpDelta, 804);
  assert.doesNotMatch(evidence.gainLossDraft.swingSummary, /손해 장면/);
  assert.doesNotMatch(evidence.gainLossDraft.swingSummary, /단순 데스/);
  assert.ok(
    !evidence.gainLossDraft.enemyGains.some((gain) =>
      gain.includes("상대 플레이트 골드 획득")
    )
  );
});

test("objective actual kill list stays separate from nearest scheduled objective", () => {
  const evidence = buildEvidence(
    [
      {
        timestamp: 1045000,
        type: "ELITE_MONSTER_KILL",
        monsterType: "DRAGON",
        teamId: 200,
        killerId: 6,
      },
    ],
    { request: { gameTimeSec: 1025, windowSec: 60 } }
  );

  assert.equal(evidence.objectiveContext.nearestObjective, "baron");
  assert.equal(evidence.objectiveContext.timeToObjectiveSec, 175);
  assert.equal(evidence.objectiveContext.objectiveKilledInWindow, true);
  assert.deepEqual(evidence.objectiveContext.actualObjectivesKilledInWindow, [
    {
      type: "dragon",
      timestampSec: 1045,
      killerTeamId: 200,
    },
  ]);
});

test("death near dragon, horde, and herald marks objective impact as estimated", () => {
  for (const [gameTimeSec, nearestObjective] of [
    [240, "dragon"],
    [300, "horde"],
    [780, "rift_herald"],
  ]) {
    const evidence = buildEvidence(
      [
        {
          timestamp: (gameTimeSec + 10) * 1000,
          type: "ELITE_MONSTER_KILL",
          monsterType:
            nearestObjective === "dragon"
              ? "DRAGON"
              : nearestObjective === "horde"
                ? "HORDE"
                : "RIFTHERALD",
          killerId: 6,
        },
      ],
      { request: { gameTimeSec } }
    );

    assert.equal(evidence.objectiveContext.impactsDeath, true);
    assert.equal(evidence.objectiveContext.nearestObjective, nearestObjective);
    assert.notEqual(evidence.objectiveContext.nearestObjective, "none");
    assert.equal(evidence.objectiveContext.isEstimated, true);
  }
});

test("warding scene includes ward event", () => {
  const evidence = buildEvidence([
    {
      timestamp: 250000,
      type: "WARD_PLACED",
      creatorId: 1,
      wardType: "YELLOW_TRINKET",
    },
  ]);

  assert.ok(evidence.events.some((event) => event.kind === "ward"));
});

test("turret plate mapping only uses TURRET_PLATE_DESTROYED", () => {
  const evidence = buildEvidence(
    [
      {
        timestamp: 1020000,
        type: "BUILDING_KILL",
        buildingType: "TOWER_BUILDING",
        towerType: "OUTER_TURRET",
        laneType: "MID_LANE",
        killerId: 6,
      },
      {
        timestamp: 1030000,
        type: "TURRET_PLATE_DESTROYED",
        killerId: 6,
      },
    ],
    { request: { gameTimeSec: 1010, windowSec: 60 } }
  );

  const buildingEvent = evidence.events.find(
    (event) => event.timestampSec === 1020
  );
  const plateEvent = evidence.events.find(
    (event) => event.timestampSec === 1030
  );

  assert.equal(buildingEvent.kind, "building");
  assert.notEqual(buildingEvent.kind, "turret_plate");
  assert.match(buildingEvent.description, /포탑 파괴/);
  assert.equal(plateEvent.kind, "turret_plate");
});

test("RiotEvidencePanel labels the forward-looking window clearly", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "components", "RiotEvidencePanel.tsx"),
    "utf8"
  );

  assert.match(source, /장면 이후 분석 범위/);
  assert.match(
    source,
    /입력한 게임 시간부터 이후 N초 동안의 Riot timeline 이벤트와 delta를 확인합니다/
  );
  assert.doesNotMatch(source, />Window</);
});

test("CS XP gold delta is estimated and enemy mid CS delta affects gains", () => {
  const evidence = buildEvidence([
    {
      timestamp: 260000,
      type: "CHAMPION_KILL",
      killerId: 6,
      victimId: 1,
    },
  ]);

  assert.equal(evidence.playerDelta.isEstimated, true);
  assert.ok(evidence.playerDelta.csDelta >= 0);
  assert.equal(evidence.enemyMidDelta.csDelta, 6);
  assert.ok(
    evidence.gainLossDraft.enemyGains.some((gain) =>
      gain.includes("상대 미드 CS/XP 이득 가능성")
    )
  );
});

test("enemy mid delta is null when enemy middle participant cannot be identified", () => {
  const evidence = buildEvidence([], {
    match: makeMatch({ enemyMidPosition: "TOP" }),
  });

  assert.equal(evidence.enemyMidDelta.participantId, null);
  assert.equal(evidence.enemyMidDelta.csBefore, null);
  assert.equal(evidence.enemyMidDelta.csAfter, null);
  assert.equal(evidence.enemyMidDelta.csDelta, null);
  assert.ok(evidence.uncertainInfo.includes("상대 미드 participantId를 특정하지 못했습니다."));
});

test("matchId empty string returns 400", async () => {
  const response = await postEvidence(loadEvidenceRoute(), {
    matchId: "",
    puuid: "player-puuid",
    gameTimeSec: 1,
  });
  assert.equal(response.status, 400);
});

test("puuid empty string returns 400", async () => {
  const response = await postEvidence(loadEvidenceRoute(), {
    matchId: "KR_1",
    puuid: "",
    gameTimeSec: 1,
  });
  assert.equal(response.status, 400);
});

test("negative gameTimeSec returns 400", async () => {
  const response = await postEvidence(loadEvidenceRoute(), {
    matchId: "KR_1",
    puuid: "player-puuid",
    gameTimeSec: -1,
  });
  assert.equal(response.status, 400);
});

test("zero windowSec returns 400", async () => {
  const response = await postEvidence(loadEvidenceRoute(), {
    matchId: "KR_1",
    puuid: "player-puuid",
    gameTimeSec: 1,
    windowSec: 0,
  });
  assert.equal(response.status, 400);
});

test("missing RIOT_API_KEY returns 500", async () => {
  const response = await postEvidence(
    loadEvidenceRoute({
      requireRiotApiKey: () => {
        throw new riotClientModule.RiotApiKeyMissingError(
          "RIOT_API_KEY 서버 설정이 필요합니다."
        );
      },
    }),
    {
      matchId: "KR_1",
      puuid: "player-puuid",
      gameTimeSec: 1,
    }
  );
  assert.equal(response.status, 500);
});

test("/api/riot/evidence includes auto scene candidates from the same Riot data", async () => {
  const timeline = makeTimeline([
    {
      timestamp: 260000,
      type: "CHAMPION_KILL",
      killerId: 6,
      victimId: 1,
    },
  ]);
  const response = await postEvidence(
    loadEvidenceRoute({
      getMatchTimeline: async () => timeline,
    }),
    {
      matchId: "KR_1",
      puuid: "player-puuid",
      gameTimeSec: 240,
    }
  );

  assert.equal(response.status, 200);
  assert.ok(response.body.evidence);
  assert.ok(Array.isArray(response.body.autoSceneCandidates));
  assert.ok(response.body.autoSceneCandidates.length > 0);
  assert.equal(
    response.body.autoSceneCandidates[0].type,
    "death_review_candidate"
  );
  assert.equal(response.body.autoSceneCandidates[0].matchId, "KR_1");
});

test("/api/riot/evidence keeps evidence response when auto scene extraction fails", async () => {
  const response = await postEvidence(
    loadEvidenceRoute(
      {},
      {
        extractAutoSceneCandidates: () => {
          throw new Error("fixture extractor failure");
        },
      }
    ),
    {
      matchId: "KR_1",
      puuid: "player-puuid",
      gameTimeSec: 240,
    }
  );

  assert.equal(response.status, 200);
  assert.ok(response.body.evidence);
  assert.deepEqual(response.body.autoSceneCandidates, []);
});

for (const status of [403, 404, 429, 500]) {
  test(`Riot API ${status} maps to ${status}`, async () => {
    const response = await postEvidence(
      loadEvidenceRoute({
        getMatchDetail: async () => {
          throw new riotClientModule.RiotApiError(status, "fixture");
        },
      }),
      {
        matchId: "KR_1",
        puuid: "player-puuid",
        gameTimeSec: 1,
      }
    );
    assert.equal(response.status, status);
  });
}
