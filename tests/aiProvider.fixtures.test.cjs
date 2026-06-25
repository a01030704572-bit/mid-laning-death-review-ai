/* eslint-disable @typescript-eslint/no-require-imports -- Node fixture harness transpiles the real TypeScript modules without network calls. */
const assert = require("node:assert/strict");
const { builtinModules } = require("node:module");
const { File: NodeFile } = require("node:buffer");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

if (!globalThis.File) {
  globalThis.File = NodeFile;
}

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
      if (
        moduleName.startsWith("node:") ||
        builtinModules.includes(moduleName)
      ) {
        return require(moduleName);
      }
      throw new Error(`Unexpected runtime dependency in AI provider fixture: ${moduleName}`);
    },
    loadedModule,
    loadedModule.exports
  );

  return loadedModule.exports;
}

let clientOptions;
let generateContentRequest;
let generateContentError;
let uploadedFileRequest;
let fileGetCalls = 0;
let fileDeleteCalls = 0;
let fakeOpenAiVideoDraftText = '{"summary":"openai fixture","keyFacts":[],"uncertainFacts":[],"suggestedFreeDescription":"OpenAI frame fixture description with enough length for parser fallback avoidance.","suggestedFields":{},"confidenceNote":"fixture"}';

const FileState = {
  PROCESSING: "PROCESSING",
  ACTIVE: "ACTIVE",
  FAILED: "FAILED",
};

class FakeGoogleGenAI {
  constructor(options) {
    clientOptions = options;
    this.models = {
      generateContent: async (request) => {
        generateContentRequest = request;
        if (generateContentError) throw generateContentError;
        return { text: '{"main_question":"fixture"}' };
      },
    };
    this.files = {
      upload: async (request) => {
        uploadedFileRequest = request;
        return {
          name: "files/video-fixture",
          state: FileState.PROCESSING,
          mimeType: request.config.mimeType,
        };
      },
      get: async () => {
        fileGetCalls += 1;
        return {
          name: "files/video-fixture",
          state: FileState.ACTIVE,
          uri: "https://generativelanguage.test/files/video-fixture",
          mimeType: "video/mp4",
        };
      },
      delete: async () => {
        fileDeleteCalls += 1;
      },
    };
  }
}

const geminiModule = loadTypeScriptModule("lib/ai/geminiProvider.ts", {
  "@google/genai": {
    GoogleGenAI: FakeGoogleGenAI,
    FileState,
    createPartFromUri: (uri, mimeType) => ({
      fileData: { fileUri: uri, mimeType },
    }),
  },
});
const generateReviewModule = loadTypeScriptModule("lib/ai/generateReview.ts", {
  "@/lib/ai/geminiProvider": geminiModule,
});
const openAiModule = loadTypeScriptModule("lib/ai/openAiFrameProvider.ts", {
  openai: class FakeOpenAI {},
  "ffmpeg-static": "C:\\fake\\ffmpeg.exe",
});
const fakeOpenAiProviderModule = {
  ...openAiModule,
  openAiFrameProvider: {
    generateVideoDraft: async () => fakeOpenAiVideoDraftText,
  },
};
const generateVideoDraftModule = loadTypeScriptModule(
  "lib/ai/generateVideoDraft.ts",
  {
    "@/lib/ai/geminiProvider": geminiModule,
    "@/lib/ai/openAiFrameProvider": fakeOpenAiProviderModule,
  }
);
const videoDraftModule = loadTypeScriptModule("lib/videoDraft.ts");

function loadVideoDraftRoute(generateVideoDraft) {
  return loadTypeScriptModule("app/api/video-draft/route.ts", {
    "next/server": {
      NextResponse: {
        json: (body, init = {}) => ({
          body,
          status: init.status ?? 200,
        }),
      },
    },
    "@/lib/ai/generateVideoDraft": {
      ...generateVideoDraftModule,
      generateVideoDraft,
    },
    "@/lib/videoDraft": videoDraftModule,
  });
}

function restoreEnv(name, value) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

test("Gemini model uses the configured value with the existing fallback", async () => {
  const originalModel = process.env.GEMINI_MODEL;
  const originalApiKey = process.env.GEMINI_API_KEY;

  try {
    delete process.env.GEMINI_MODEL;
    assert.equal(
      geminiModule.resolveGeminiModel(),
      "gemini-2.5-flash-lite"
    );
    assert.equal(
      geminiModule.resolveGeminiModel("  gemini-custom-model  "),
      "gemini-custom-model"
    );

    process.env.GEMINI_MODEL = "gemini-configured-model";
    const text = await geminiModule.geminiProvider.generateCoachingReview(
      "fixture prompt"
    );

    assert.equal(text, '{"main_question":"fixture"}');
    assert.deepEqual(generateContentRequest, {
      model: "gemini-configured-model",
      contents: "fixture prompt",
      config: { responseMimeType: "application/json" },
    });
    assert.equal(clientOptions.apiKey, originalApiKey);
  } finally {
    restoreEnv("GEMINI_MODEL", originalModel);
  }
});

test("AI provider defaults to Gemini and rejects unsupported values", async () => {
  const originalProvider = process.env.AI_PROVIDER;

  try {
    delete process.env.AI_PROVIDER;
    assert.equal(generateReviewModule.resolveAiProvider(), "gemini");
    assert.equal(generateReviewModule.resolveAiProvider(" GEMINI "), "gemini");
    assert.throws(
      () => generateReviewModule.resolveAiProvider("openai"),
      /Unsupported AI provider: openai/
    );

    const text = await generateReviewModule.generateCoachingReview(
      "provider fixture"
    );
    assert.equal(text, '{"main_question":"fixture"}');
  } finally {
    restoreEnv("AI_PROVIDER", originalProvider);
  }
});

test("OpenAI video model uses env override with code fallback", () => {
  const originalModel = process.env.OPENAI_VIDEO_MODEL;

  try {
    delete process.env.OPENAI_VIDEO_MODEL;
    assert.equal(openAiModule.resolveOpenAiVideoModel(), "gpt-5.5");
    assert.equal(
      openAiModule.resolveOpenAiVideoModel("  openai-video-fixture  "),
      "openai-video-fixture"
    );
  } finally {
    restoreEnv("OPENAI_VIDEO_MODEL", originalModel);
  }
});

test("OpenAI ffmpeg resolver prefers env, ignores ROOT import, and falls back to cwd", () => {
  const originalFfmpegPath = process.env.FFMPEG_PATH;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ffmpeg-fixture-"));
  const envFfmpegPath = path.join(
    tempDir,
    process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg"
  );
  const cwdFallbackPath = path.join(
    process.cwd(),
    "node_modules",
    "ffmpeg-static",
    process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg"
  );

  try {
    fs.writeFileSync(envFfmpegPath, "");
    process.env.FFMPEG_PATH = envFfmpegPath;
    assert.equal(
      openAiModule.resolveFfmpegPath("\\ROOT\\node_modules\\ffmpeg-static\\ffmpeg.exe"),
      envFfmpegPath
    );

    delete process.env.FFMPEG_PATH;
    assert.equal(
      openAiModule.resolveFfmpegPath("\\ROOT\\node_modules\\ffmpeg-static\\ffmpeg.exe"),
      cwdFallbackPath
    );
    assert.equal(
      openAiModule.resolveFfmpegPath("C:\\definitely\\missing\\ffmpeg.exe"),
      cwdFallbackPath
    );
  } finally {
    restoreEnv("FFMPEG_PATH", originalFfmpegPath);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("OpenAI ffmpeg resolver reports a clear missing executable error", () => {
  const originalFfmpegPath = process.env.FFMPEG_PATH;
  const originalCwd = process.cwd();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ffmpeg-missing-"));

  try {
    delete process.env.FFMPEG_PATH;
    process.chdir(tempDir);
    assert.throws(
      () => openAiModule.resolveFfmpegPath("\\ROOT\\node_modules\\ffmpeg-static\\ffmpeg.exe"),
      (error) =>
        error instanceof openAiModule.FfmpegExecutableMissingError &&
        /FFmpeg 실행 파일을 찾지 못했습니다/.test(error.message)
    );
  } finally {
    process.chdir(originalCwd);
    restoreEnv("FFMPEG_PATH", originalFfmpegPath);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("OpenAI provider missing key returns a clear error", async () => {
  const originalApiKey = process.env.OPENAI_API_KEY;
  const clip = new Blob(["fixture-video"], { type: "video/mp4" });

  try {
    delete process.env.OPENAI_API_KEY;
    await assert.rejects(
      openAiModule.openAiFrameProvider.generateVideoDraft(
        "draft prompt",
        clip,
        "video/mp4"
      ),
      (error) =>
        error instanceof openAiModule.OpenAiApiKeyMissingError &&
        /OPENAI_API_KEY/.test(error.message)
    );
  } finally {
    restoreEnv("OPENAI_API_KEY", originalApiKey);
  }
});

test("/api/video-draft returns a clear OpenAI missing key error", async () => {
  const routeModule = loadVideoDraftRoute(async () => {
    throw new generateVideoDraftModule.OpenAiApiKeyMissingError(
      "OPENAI_API_KEY is required"
    );
  });
  const formData = new FormData();
  const FileCtor = globalThis.File ?? NodeFile;
  formData.append(
    "clip",
    new FileCtor(["fixture-video"], "clip.mp4", { type: "video/mp4" })
  );
  formData.append("provider", "openai");

  const response = await routeModule.POST({
    formData: async () => formData,
  });

  assert.equal(response.status, 401);
  assert.match(response.body.error, /OPENAI_API_KEY/);
});

test("/api/video-draft returns a clear FFmpeg missing executable error", async () => {
  const routeModule = loadVideoDraftRoute(async () => {
    throw new generateVideoDraftModule.FfmpegExecutableMissingError(
      "FFmpeg 실행 파일을 찾지 못했습니다. npm install 후 다시 시도해 주세요."
    );
  });
  const formData = new FormData();
  const FileCtor = globalThis.File ?? NodeFile;
  formData.append(
    "clip",
    new FileCtor(["fixture-video"], "clip.mp4", { type: "video/mp4" })
  );
  formData.append("provider", "openai");

  const response = await routeModule.POST({
    formData: async () => formData,
  });

  assert.equal(response.status, 500);
  assert.equal(
    response.body.error,
    "FFmpeg 실행 파일을 찾지 못했습니다. npm install 후 다시 시도해 주세요."
  );
});

test("/api/video-draft returns a clear OpenAI insufficient quota error", async () => {
  const routeModule = loadVideoDraftRoute(async () => {
    const error = new Error(
      "429 insufficient_quota You exceeded your current quota, please check your plan and billing details."
    );
    error.status = 429;
    error.code = "insufficient_quota";
    error.type = "insufficient_quota";
    error.headers = {
      "x-request-id": "req_fixture_should_not_reach_client",
      "set-cookie": "secret-cookie",
    };
    return Promise.reject(error);
  });
  const formData = new FormData();
  const FileCtor = globalThis.File ?? NodeFile;
  formData.append(
    "clip",
    new FileCtor(["fixture-video"], "clip.mp4", { type: "video/mp4" })
  );
  formData.append("provider", "openai");
  const originalWarn = console.warn;
  const warnCalls = [];

  try {
    console.warn = (...args) => warnCalls.push(args);
    const response = await routeModule.POST({
      formData: async () => formData,
    });

    assert.equal(response.status, 429);
    assert.deepEqual(Object.keys(response.body), ["error"]);
    assert.equal(
      response.body.error,
      "OpenAI API 사용 가능 크레딧 또는 결제 한도가 부족합니다. OpenAI Platform의 Billing/Usage를 확인해 주세요."
    );
    assert.equal(JSON.stringify(response.body).includes("req_fixture"), false);
    assert.equal(JSON.stringify(response.body).includes("secret-cookie"), false);
    assert.equal(warnCalls.length, 1);
    assert.deepEqual(warnCalls[0][1], {
      status: 429,
      code: "insufficient_quota",
      type: "insufficient_quota",
    });
  } finally {
    console.warn = originalWarn;
  }
});


test("video draft validates MIME type and file size", () => {
  assert.equal(
    videoDraftModule.MAX_VIDEO_DRAFT_BYTES,
    100 * 1024 * 1024
  );
  assert.equal(
    videoDraftModule.getVideoDraftFileValidationError({
      type: "video/mp4",
      size: 1024,
    }),
    null
  );
  assert.equal(
    videoDraftModule.getVideoDraftFileValidationError({
      type: "video/mp4",
      size: 20 * 1024 * 1024 + 1,
    }),
    null
  );
  assert.equal(
    videoDraftModule.getVideoDraftFileValidationError({
      type: "video/avi",
      size: 1024,
    }).status,
    400
  );
  assert.equal(
    videoDraftModule.getVideoDraftFileValidationError({
      type: "video/mp4",
      size: videoDraftModule.MAX_VIDEO_DRAFT_BYTES + 1,
    }).status,
    413
  );
});

test("video draft prompt extracts existing form inputs instead of generic coaching", () => {
  const prompt = videoDraftModule.buildVideoDraftPrompt(
    "용 싸움 장면, 아칼리 시점."
  );

  assert.match(prompt, /NOT a generic video summary/);
  assert.match(prompt, /lane state and wave position before movement/);
  assert.match(prompt, /enemy mid movement/);
  assert.match(prompt, /objective preparation\/timing/);
  assert.match(prompt, /post-fight conversion/);
  assert.match(prompt, /용 싸움 장면, 아칼리 시점/);
  assert.match(prompt, /laneStateDetail/);
  assert.match(prompt, /enemyMidState/);
  assert.match(prompt, /timeToObjective/);
  assert.match(prompt, /postPushIntent/);
  assert.match(prompt, /currentOutcome/);
  assert.match(prompt, /self-review hypothesis/);
  assert.match(prompt, /visibleFacts/);
  assert.match(prompt, /교전 자체에 대한 판단은 필요/);
});

test("video draft parser rejects malformed JSON and removes invalid enums", () => {
  assert.throws(
    () => videoDraftModule.parseVideoReviewDraft("not-json"),
    videoDraftModule.InvalidVideoDraftResponseError
  );

  const draft = videoDraftModule.parseVideoReviewDraft(
    JSON.stringify({
      suggestedScenarioType: "FULL_TEAMFIGHT",
      suggestedSceneOutcomeAssessment: "perfect_play",
      summary: " 용 앞 교전 ",
      keyFacts: ["아칼리가 강가로 이동함", 123],
      uncertainFacts: ["상대 정글 위치 확인 필요"],
      suggestedFreeDescription: "강가 교전 장면",
      suggestedFields: {
        objectiveType: "baron",
        lanePriority: "have_prio",
        laneStateDetail: "crashed_into_enemy_tower",
        enemyMidState: "following_me",
        timeToObjective: "soon",
        movementDirection: "left_side",
        postPushIntent: "recall",
      },
      confidenceNote: "미니맵 정보는 확인 필요",
    })
  );

  assert.equal(draft.suggestedScenarioType, null);
  assert.equal(draft.suggestedSceneOutcomeAssessment, null);
  assert.deepEqual(draft.keyFacts, ["아칼리가 강가로 이동함"]);
  assert.deepEqual(draft.suggestedFields, {
    lanePriority: "have_prio",
    laneStateDetail: "crashed_into_enemy_tower",
    enemyMidState: "following_me",
    postPushIntent: "recall",
  });
});

test("weak video descriptions fall back to note, visible facts, and manual checks", () => {
  const draft = videoDraftModule.parseVideoReviewDraft(
    JSON.stringify({
      summary: "중앙 지역에서 교전이 발생",
      keyFacts: ["플레이어가 용 쪽 강가로 이동함"],
      uncertainFacts: [
        "이동 전 미드 웨이브 상태",
        "상대 미드의 선이동 여부",
      ],
      suggestedFreeDescription: "교전 자체에 대한 판단은 필요",
      suggestedFields: {},
      confidenceNote: "일부 미니맵 정보는 확인 필요",
    }),
    "용 싸움 장면, 아칼리 시점."
  );

  assert.match(draft.suggestedFreeDescription, /용 싸움 장면, 아칼리 시점/);
  assert.match(draft.suggestedFreeDescription, /플레이어가 용 쪽 강가로 이동함/);
  assert.match(draft.suggestedFreeDescription, /이동 전 미드 웨이브 상태/);
  assert.equal(
    draft.suggestedFreeDescription.includes("교전 자체에 대한 판단은 필요"),
    false
  );
  assert.equal(
    draft.suggestedFreeDescription.includes("중앙 지역에서 교전이 발생"),
    false
  );
});

test("unclear video drafts provide manual form checks instead of empty uncertainty", () => {
  const draft = videoDraftModule.parseVideoReviewDraft(
    JSON.stringify({
      summary: "일부 움직임만 확인됨",
      keyFacts: [],
      uncertainFacts: [],
      suggestedFreeDescription: "",
      suggestedFields: {},
      confidenceNote: "",
    })
  );

  assert.deepEqual(draft.uncertainFacts, [
    "이동 전 미드 웨이브 상태",
    "상대 미드의 이동 여부",
    "교전 결과와 이후 전환",
  ]);
  assert.match(draft.suggestedFreeDescription, /미드 웨이브/);
});

test("solo kill video draft does not include objective fields", () => {
  const draft = videoDraftModule.parseVideoReviewDraft(
    JSON.stringify({
      suggestedScenarioType: "SOLO_KILL_TRADE",
      suggestedSceneOutcomeAssessment: "good_decision",
      summary: "미드 1:1 교전에서 솔로킬을 냄",
      keyFacts: ["상대 미드와 1:1 교전"],
      uncertainFacts: [],
      suggestedFreeDescription:
        "미드 1:1 교전에서 솔로킬을 낸 장면입니다. 오브젝트 정보는 직접 확인이 필요합니다.",
      suggestedFields: {
        currentOutcome: "solo_kill",
        objectiveType: "dragon",
        timeToObjective: "under_thirty",
        objectivePrepAction: "moved_first",
        lanePriority: "have_prio",
      },
      confidenceNote: "솔로킬 장면으로 보입니다.",
    })
  );

  assert.equal(draft.suggestedFields.currentOutcome, "solo_kill");
  assert.equal(draft.suggestedFields.objectiveType, undefined);
  assert.equal(draft.suggestedFields.timeToObjective, undefined);
  assert.equal(draft.suggestedFields.objectivePrepAction, undefined);
  assert.equal(draft.suggestedFields.lanePriority, "have_prio");
});

test("warding death video draft does not include objective fields", () => {
  const draft = videoDraftModule.parseVideoReviewDraft(
    JSON.stringify({
      suggestedScenarioType: "UNSAFE_WARDING",
      suggestedSceneOutcomeAssessment: "death",
      summary: "강가 시야를 잡다가 죽은 장면",
      keyFacts: ["강가로 와딩하러 이동함"],
      uncertainFacts: [],
      suggestedFreeDescription:
        "강가 시야를 잡다가 죽은 장면입니다. 정글 위치와 아군 커버를 확인해야 합니다.",
      suggestedFields: {
        currentOutcome: "died_while_warding",
        objectiveType: "dragon",
        timeToObjective: "sixty_to_thirty",
        objectivePrepAction: "placed_vision",
        enemyJungleInfo: "not_seen_recently",
      },
      confidenceNote: "시야 장면입니다.",
    })
  );

  assert.equal(draft.suggestedFields.objectiveType, undefined);
  assert.equal(draft.suggestedFields.timeToObjective, undefined);
  assert.equal(draft.suggestedFields.objectivePrepAction, undefined);
  assert.equal(draft.suggestedFields.enemyJungleInfo, "not_seen_recently");
});

test("death or loss note does not become risky_but_successful by default", () => {
  const deathDraft = videoDraftModule.parseVideoReviewDraft(
    JSON.stringify({
      suggestedScenarioType: "GENERAL_LANING_DEATH",
      suggestedSceneOutcomeAssessment: "risky_but_successful",
      summary: "갱을 당해 죽은 장면",
      keyFacts: ["상대 정글이 미드에 개입함"],
      uncertainFacts: [],
      suggestedFreeDescription:
        "갱을 당해 죽은 장면입니다. 웨이브와 시야 상태를 확인해야 합니다.",
      suggestedFields: { currentOutcome: "death" },
      confidenceNote: "죽음 장면입니다.",
    }),
    "갱을 당해서 죽었다"
  );
  const lossDraft = videoDraftModule.parseVideoReviewDraft(
    JSON.stringify({
      suggestedScenarioType: "GANKED_WHILE_PUSHING",
      suggestedSceneOutcomeAssessment: "risky_but_successful",
      summary: "갱은 피했지만 라인 손해를 봄",
      keyFacts: ["상대 정글 압박으로 뒤로 빠짐"],
      uncertainFacts: [],
      suggestedFreeDescription:
        "갱은 피했지만 라인 손해를 본 장면입니다. 웨이브 손실을 확인해야 합니다.",
      suggestedFields: { currentOutcome: "survived_but_lost" },
      confidenceNote: "손해 장면입니다.",
    }),
    "살았지만 손해를 봤다"
  );

  assert.equal(deathDraft.suggestedSceneOutcomeAssessment, "death");
  assert.equal(lossDraft.suggestedSceneOutcomeAssessment, "loss");
});

test("dragon secured note maps conversion to objective secured instead of lane roam", () => {
  const draft = videoDraftModule.parseVideoReviewDraft(
    JSON.stringify({
      suggestedScenarioType: "ADVANTAGE_CONVERSION",
      suggestedSceneOutcomeAssessment: "good_decision",
      summary: "미드 주도권 이후 드래곤을 챙긴 장면",
      keyFacts: ["드래곤 쪽으로 전환함"],
      uncertainFacts: ["라인 정리 여부 확인 필요"],
      suggestedFreeDescription:
        "미드 주도권 이후 드래곤을 챙긴 장면입니다. 라인 정리와 합류 타이밍을 확인해야 합니다.",
      suggestedFields: {
        currentOutcome: "secured_objective",
        objectiveType: "dragon",
        postPushIntent: "roam",
      },
      confidenceNote: "드래곤 확보로 보입니다.",
    }),
    "미드 밀고 드래곤 먹은 장면"
  );

  assert.equal(draft.suggestedFields.currentOutcome, "secured_objective");
  assert.equal(draft.suggestedFields.objectiveType, "dragon");
  assert.equal(draft.suggestedFields.postPushIntent, undefined);
});

test("Gemini video draft uploads, polls until active, and attempts cleanup", async () => {
  const originalProvider = process.env.AI_PROVIDER;
  const originalModel = process.env.GEMINI_MODEL;
  const clip = new Blob(["fixture-video"], { type: "video/mp4" });

  generateContentError = undefined;
  uploadedFileRequest = undefined;
  fileGetCalls = 0;
  fileDeleteCalls = 0;

  try {
    process.env.AI_PROVIDER = "gemini";
    process.env.GEMINI_MODEL = "gemini-video-fixture";
    const text = await generateVideoDraftModule.generateVideoDraft(
      "draft prompt",
      clip,
      "video/mp4",
      { pollIntervalMs: 0, timeoutMs: 100 }
    );

    assert.equal(text, '{"main_question":"fixture"}');
    assert.equal(uploadedFileRequest.file, clip);
    assert.equal(uploadedFileRequest.config.mimeType, "video/mp4");
    assert.equal(fileGetCalls, 1);
    assert.equal(fileDeleteCalls, 1);
    assert.equal(generateContentRequest.model, "gemini-video-fixture");
    assert.equal(generateContentRequest.config.responseMimeType, "application/json");
    assert.deepEqual(generateContentRequest.contents[0].parts[0], {
      fileData: {
        fileUri: "https://generativelanguage.test/files/video-fixture",
        mimeType: "video/mp4",
      },
    });
    assert.equal(generateContentRequest.contents[0].parts[1].text, "draft prompt");
  } finally {
    restoreEnv("AI_PROVIDER", originalProvider);
    restoreEnv("GEMINI_MODEL", originalModel);
  }
});

test("OpenAI video draft provider dispatch returns the same normalized shape", async () => {
  const originalProvider = process.env.AI_PROVIDER;
  const clip = new Blob(["fixture-video"], { type: "video/mp4" });

  try {
    process.env.AI_PROVIDER = "openai";
    fakeOpenAiVideoDraftText = JSON.stringify({
      suggestedScenarioType: "ADVANTAGE_CONVERSION",
      suggestedSceneOutcomeAssessment: "good_decision",
      summary: "OpenAI frame vision summary",
      keyFacts: ["프레임에서 미드 이동 확인"],
      uncertainFacts: ["정확한 정글 위치 확인 필요"],
      suggestedFreeDescription:
        "OpenAI frame vision으로 확인한 장면입니다. 미드 이동과 이후 전환을 직접 확인해야 합니다.",
      suggestedFields: {
        currentOutcome: "fight_advantage",
        lanePriority: "have_prio",
      },
      confidenceNote: "OpenAI frame fixture",
    });

    const text = await generateVideoDraftModule.generateVideoDraft(
      "draft prompt",
      clip,
      "video/mp4",
      { provider: "openai" }
    );
    const draft = videoDraftModule.parseVideoReviewDraft(text);

    assert.deepEqual(Object.keys(draft).sort(), [
      "confidenceNote",
      "keyFacts",
      "suggestedFields",
      "suggestedFreeDescription",
      "suggestedScenarioType",
      "suggestedSceneOutcomeAssessment",
      "summary",
      "uncertainFacts",
    ].sort());
    assert.equal(draft.suggestedFields.currentOutcome, "fight_advantage");
    assert.equal(draft.suggestedFields.lanePriority, "have_prio");
  } finally {
    restoreEnv("AI_PROVIDER", originalProvider);
  }
});

test("video draft reports unsupported provider and Gemini video model errors", async () => {
  const originalProvider = process.env.AI_PROVIDER;
  const clip = new Blob(["fixture-video"], { type: "video/mp4" });

  try {
    process.env.AI_PROVIDER = "unsupported";
    await assert.rejects(
      generateVideoDraftModule.generateVideoDraft(
        "draft prompt",
        clip,
        "video/mp4"
      ),
      generateVideoDraftModule.UnsupportedVideoProviderError
    );

    process.env.AI_PROVIDER = "gemini";
    generateContentError = new Error("Input modality is not supported by this model");
    fileDeleteCalls = 0;
    await assert.rejects(
      generateVideoDraftModule.generateVideoDraft(
        "draft prompt",
        clip,
        "video/mp4",
        { pollIntervalMs: 0, timeoutMs: 100 }
      ),
      generateVideoDraftModule.VideoInputUnsupportedError
    );
    assert.equal(fileDeleteCalls, 1);
  } finally {
    generateContentError = undefined;
    restoreEnv("AI_PROVIDER", originalProvider);
  }
});
