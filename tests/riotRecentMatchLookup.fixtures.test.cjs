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
      if (moduleName === "@/types/riot") return {};
      throw new Error(
        `Unexpected runtime dependency in Riot recent match lookup fixture: ${moduleName}`
      );
    },
    loadedModule,
    loadedModule.exports
  );

  return loadedModule.exports;
}

const {
  buildRecentMatchIdsResponse,
  mapRecentMatchRiotStatus,
  normalizeRecentMatchCount,
  normalizeRecentMatchLookupRequest,
  RecentMatchLookupValidationError,
  riotRecentMatchErrorMessage,
  safeRecentMatchErrorLog,
} = loadTypeScriptModule("lib/riot/recentMatchLookup.ts");

test("count defaults to 5 and clamps between 1 and 10", () => {
  assert.equal(normalizeRecentMatchCount(null), 5);
  assert.equal(normalizeRecentMatchCount("0"), 1);
  assert.equal(normalizeRecentMatchCount("11"), 10);
  assert.equal(normalizeRecentMatchCount("abc"), 5);
  assert.equal(normalizeRecentMatchCount(7.8), 7);
});

test("lookup request normalizes route and trims inputs", () => {
  const request = normalizeRecentMatchLookupRequest(
    new URLSearchParams({
      gameName: "  Mid Tester ",
      tagLine: " KR1 ",
      regionalRoute: "europe",
      count: "9",
    })
  );

  assert.deepEqual(request, {
    gameName: "Mid Tester",
    tagLine: "KR1",
    regionalRoute: "europe",
    count: 9,
  });
});

test("lookup request defaults regionalRoute to asia", () => {
  const request = normalizeRecentMatchLookupRequest(
    new URLSearchParams({
      gameName: "Tester",
      tagLine: "KR1",
      regionalRoute: "invalid",
    })
  );

  assert.equal(request.regionalRoute, "asia");
  assert.equal(request.count, 5);
});

test("lookup request validates required gameName and tagLine", () => {
  assert.throws(
    () =>
      normalizeRecentMatchLookupRequest(
        new URLSearchParams({ tagLine: "KR1" })
      ),
    RecentMatchLookupValidationError
  );
  assert.throws(
    () =>
      normalizeRecentMatchLookupRequest(
        new URLSearchParams({ gameName: "Tester" })
      ),
    RecentMatchLookupValidationError
  );
});

test("response shape returns match IDs only", () => {
  assert.deepEqual(
    buildRecentMatchIdsResponse({
      puuid: "puuid-1",
      gameName: "Tester",
      tagLine: "KR1",
      regionalRoute: "asia",
      matchIds: ["KR_1", "KR_2"],
    }),
    {
      puuid: "puuid-1",
      gameName: "Tester",
      tagLine: "KR1",
      regionalRoute: "asia",
      matchIds: ["KR_1", "KR_2"],
    }
  );
});

test("Riot error messages are concise and user-facing", () => {
  assert.match(riotRecentMatchErrorMessage(400), /파라미터/);
  assert.equal(
    riotRecentMatchErrorMessage(403),
    "Riot API key is invalid or expired."
  );
  assert.match(riotRecentMatchErrorMessage(404), /찾지 못했습니다/);
  assert.match(riotRecentMatchErrorMessage(429), /rate limit/);
  assert.match(riotRecentMatchErrorMessage(500), /오류/);
});

test("Riot status mapping keeps auth, not-found, and rate-limit errors visible", () => {
  assert.equal(mapRecentMatchRiotStatus(401), 403);
  assert.equal(mapRecentMatchRiotStatus(403), 403);
  assert.equal(mapRecentMatchRiotStatus(404), 404);
  assert.equal(mapRecentMatchRiotStatus(429), 429);
  assert.equal(mapRecentMatchRiotStatus(500), 500);
});

test("safe log helper does not expose arbitrary raw objects", () => {
  assert.deepEqual(safeRecentMatchErrorLog(new Error("network failed")), {
    name: "Error",
    message: "network failed",
  });
  assert.deepEqual(safeRecentMatchErrorLog({ token: "secret" }), {
    message: "Unknown non-error thrown",
  });
});
