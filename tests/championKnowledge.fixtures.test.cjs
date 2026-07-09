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
    },
  }).outputText;
  const loadedModule = { exports: {} };

  new Function("require", "module", "exports", output)(
    (moduleName) => {
      throw new Error(
        `Unexpected runtime dependency in champion knowledge fixture: ${moduleName}`
      );
    },
    loadedModule,
    loadedModule.exports
  );

  return loadedModule.exports;
}

const {
  buildEnemyChampionKnowledgePromptBlock,
  getChampionKnowledge,
} = loadTypeScriptModule("lib/championKnowledge.ts");

test("getChampionKnowledge returns Fizz knowledge", () => {
  const knowledge = getChampionKnowledge("Fizz");

  assert.equal(knowledge?.championName, "Fizz");
  assert.ok(knowledge?.keyDefensiveTools.includes("E 재간둥이 회피/무적"));
  assert.ok(knowledge?.punishWindows.includes("E가 빠진 직후"));
});

test("getChampionKnowledge supports Korean aliases", () => {
  const knowledge = getChampionKnowledge("피즈");

  assert.equal(knowledge?.championName, "Fizz");
});

test("getChampionKnowledge returns null for unknown champion", () => {
  assert.equal(getChampionKnowledge("Syndra"), null);
  assert.equal(getChampionKnowledge(""), null);
  assert.equal(getChampionKnowledge(undefined), null);
});

test("enemy champion prompt block warns against confirmed cooldown claims", () => {
  const block = buildEnemyChampionKnowledgePromptBlock("Fizz");

  assert.match(block, /E 재간둥이 회피\/무적/);
  assert.match(block, /Use this champion knowledge only as matchup reference/);
  assert.match(block, /Do not invent cooldowns/);
  assert.match(block, /check question, not a confirmed mistake/);
});
