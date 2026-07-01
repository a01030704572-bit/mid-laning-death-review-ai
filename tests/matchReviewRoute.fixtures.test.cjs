/* eslint-disable @typescript-eslint/no-require-imports -- Node fixture harness transpiles route code without live Riot API calls. */
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
      throw new Error(
        `Unexpected runtime dependency in match review route fixture: ${moduleName}`
      );
    },
    loadedModule,
    loadedModule.exports
  );

  return loadedModule.exports;
}

const riotClientModule = loadTypeScriptModule("lib/riot/client.ts");
const autoSceneExtractorModule = loadTypeScriptModule(
  "lib/riot/autoSceneExtractor.ts"
);
const riotIdentityContextModule = loadTypeScriptModule(
  "lib/riot/riotIdentityContext.ts"
);
const matchSceneRankerModule = loadTypeScriptModule(
  "lib/riot/matchSceneRanker.ts"
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

function makeMatch() {
  return {
    metadata: { matchId: "KR_1" },
    info: {
      gameCreation: 1760000000000,
      gameDuration: 1800,
      participants: [
        {
          puuid: "player-puuid",
          participantId: 1,
          teamId: 100,
          championName: "Ahri",
          individualPosition: "MIDDLE",
          teamPosition: "MIDDLE",
        },
        {
          puuid: "ally-jungle",
          participantId: 2,
          teamId: 100,
          championName: "LeeSin",
          individualPosition: "JUNGLE",
          teamPosition: "JUNGLE",
        },
        {
          puuid: "enemy-mid",
          participantId: 6,
          teamId: 200,
          championName: "Syndra",
          individualPosition: "MIDDLE",
          teamPosition: "MIDDLE",
        },
        {
          puuid: "enemy-jungle",
          participantId: 7,
          teamId: 200,
          championName: "Vi",
          individualPosition: "JUNGLE",
          teamPosition: "JUNGLE",
        },
      ],
    },
  };
}

function makeTimeline(events = []) {
  return {
    metadata: { matchId: "KR_1" },
    info: {
      frames: [
        {
          timestamp: 570000,
          participantFrames: {
            "1": participantFrame({
              participantId: 1,
              totalGold: 3000,
              minionsKilled: 80,
            }),
            "6": participantFrame({
              participantId: 6,
              totalGold: 3200,
              minionsKilled: 82,
            }),
          },
          events: [],
        },
        {
          timestamp: 600000,
          participantFrames: {
            "1": participantFrame({
              participantId: 1,
              totalGold: 3400,
              minionsKilled: 84,
            }),
            "6": participantFrame({
              participantId: 6,
              totalGold: 3220,
              minionsKilled: 82,
            }),
          },
          events: events.map((event) => ({
            timestamp: 600000,
            ...event,
          })),
        },
      ],
    },
  };
}

function loadRoute({ clientOverrides = {}, extractorOverrides = {} } = {}) {
  const clientModule = {
    ...riotClientModule,
    requireRiotApiKey: () => "riot-api-key",
    getMatchDetail: async () => makeMatch(),
    getMatchTimeline: async () =>
      makeTimeline([
        {
          type: "CHAMPION_KILL",
          killerId: 1,
          victimId: 6,
          assistingParticipantIds: [],
        },
      ]),
    ...clientOverrides,
  };

  return loadTypeScriptModule("app/api/riot/match-review/route.ts", {
    "next/server": {
      NextResponse: {
        json: (body, init = {}) => ({
          body,
          status: init.status ?? 200,
        }),
      },
    },
    "@/lib/riot/client": clientModule,
    "@/lib/riot/autoSceneExtractor": {
      ...autoSceneExtractorModule,
      ...extractorOverrides,
    },
    "@/lib/riot/riotIdentityContext": riotIdentityContextModule,
    "@/lib/riot/matchSceneRanker": matchSceneRankerModule,
  });
}

function getMatchReview(routeModule, query) {
  const url = `https://fixture.test/api/riot/match-review?${query}`;
  return routeModule.GET({ url });
}

test("missing matchId returns 400", async () => {
  const response = await getMatchReview(
    loadRoute(),
    new URLSearchParams({ puuid: "player-puuid" }).toString()
  );

  assert.equal(response.status, 400);
  assert.match(response.body.error, /matchId/);
});

test("missing puuid returns 400", async () => {
  const response = await getMatchReview(
    loadRoute(),
    new URLSearchParams({ matchId: "KR_1" }).toString()
  );

  assert.equal(response.status, 400);
  assert.match(response.body.error, /puuid/);
});

test("successful fixture returns report with topScenes array", async () => {
  const response = await getMatchReview(
    loadRoute(),
    new URLSearchParams({
      matchId: "KR_1",
      puuid: "player-puuid",
      regionalRoute: "asia",
    }).toString()
  );

  assert.equal(response.status, 200);
  assert.ok(response.body.report);
  assert.equal(response.body.report.matchId, "KR_1");
  assert.equal(response.body.report.puuid, "player-puuid");
  assert.equal(response.body.report.playerChampion, "Ahri");
  assert.equal(response.body.report.enemyMidChampion, "Syndra");
  assert.equal(response.body.report.gameDurationSec, 1800);
  assert.ok(Array.isArray(response.body.report.topScenes));
  assert.ok(response.body.report.topScenes.length > 0);
});

test("extractor failure returns partial report instead of 500", async () => {
  const response = await getMatchReview(
    loadRoute({
      extractorOverrides: {
        extractAutoSceneCandidates: () => {
          throw new Error("fixture extractor failure");
        },
      },
    }),
    new URLSearchParams({
      matchId: "KR_1",
      puuid: "player-puuid",
    }).toString()
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.report.analysisStatus, "partial");
  assert.deepEqual(response.body.report.topScenes, []);
});

test("missing RIOT_API_KEY returns clear 500", async () => {
  const response = await getMatchReview(
    loadRoute({
      clientOverrides: {
        requireRiotApiKey: () => {
          throw new riotClientModule.RiotApiKeyMissingError(
            "RIOT_API_KEY 서버 설정이 필요합니다."
          );
        },
      },
    }),
    new URLSearchParams({
      matchId: "KR_1",
      puuid: "player-puuid",
    }).toString()
  );

  assert.equal(response.status, 500);
  assert.equal(response.body.error, "RIOT_API_KEY 서버 설정이 필요합니다.");
});

for (const status of [403, 404, 429, 500]) {
  test(`Riot API ${status} maps safely`, async () => {
    const response = await getMatchReview(
      loadRoute({
        clientOverrides: {
          getMatchDetail: async () => {
            throw new riotClientModule.RiotApiError(status, "fixture");
          },
        },
      }),
      new URLSearchParams({
        matchId: "KR_1",
        puuid: "player-puuid",
      }).toString()
    );

    assert.equal(response.status, status);
    assert.equal(typeof response.body.error, "string");
    assert.doesNotMatch(response.body.error, /riot-api-key/);
  });
}
