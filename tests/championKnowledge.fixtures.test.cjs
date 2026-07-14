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
  buildInferredKeySkillPromptBlock,
  buildEnemyChampionKnowledgePromptBlock,
  getChampionKnowledge,
  getSeedChampionKnowledgeNames,
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
  assert.match(block, /known_champion_db/);
  assert.match(block, /Do not invent cooldowns/);
  assert.match(block, /check question, not a confirmed mistake/);
});

test("static seed champion list stays limited to the approved five champions", () => {
  assert.deepEqual(getSeedChampionKnowledgeNames(), [
    "Ahri",
    "Fizz",
    "Vex",
    "Zed",
    "Akali",
  ]);
});

test("unknown champion gets inferred key skill hypothesis prompt block", () => {
  const block = buildInferredKeySkillPromptBlock("LeBlanc");

  assert.match(block, /Enemy champion inferred key skill hypothesis/);
  assert.match(block, /Enemy mid champion: LeBlanc/);
  assert.match(block, /unverified hypothesis/);
  assert.match(block, /Do not claim a skill was used/);
  assert.match(block, /확인해야 할 변수/);
  assert.match(block, /복기 질문/);
  assert.match(block, /model_inferred/);
});

test("known or empty champion does not get inferred prompt block", () => {
  assert.equal(buildInferredKeySkillPromptBlock("Fizz"), "");
  assert.equal(buildInferredKeySkillPromptBlock(""), "");
  assert.equal(buildInferredKeySkillPromptBlock(undefined), "");
});
