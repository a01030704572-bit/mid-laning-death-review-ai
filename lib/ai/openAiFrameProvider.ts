import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import OpenAI from "openai";
import type { AiVideoDraftProvider } from "@/lib/ai/types";

export const DEFAULT_OPENAI_VIDEO_MODEL = "gpt-5.5";
export const OPENAI_FRAME_PERCENTS = [0, 20, 40, 60, 80, 95] as const;

type ExtractedFrame = {
  percent: number;
  timestampSeconds: number;
  base64Jpeg: string;
};

type FfmpegResult = {
  stderr: string;
  stdout: string;
};

export class OpenAiApiKeyMissingError extends Error {}
export class FfmpegExecutableMissingError extends Error {}
export class FrameExtractionError extends Error {}

export function resolveOpenAiVideoModel(
  model = process.env.OPENAI_VIDEO_MODEL
) {
  return model?.trim() || DEFAULT_OPENAI_VIDEO_MODEL;
}

function requireOpenAiApiKey(apiKey = process.env.OPENAI_API_KEY) {
  const trimmed = apiKey?.trim();
  if (!trimmed) {
    throw new OpenAiApiKeyMissingError(
      "OPENAI_API_KEY is required to use the OpenAI frame vision video draft provider."
    );
  }
  return trimmed;
}

function resolveVideoExtension(mimeType: string) {
  switch (mimeType) {
    case "video/webm":
      return ".webm";
    case "video/quicktime":
      return ".mov";
    default:
      return ".mp4";
  }
}

function isUsableExecutablePath(executablePath: string | null | undefined) {
  const trimmedPath = executablePath?.trim();
  if (!trimmedPath) return false;
  if (trimmedPath.startsWith("\\ROOT") || trimmedPath.startsWith("/ROOT")) {
    return false;
  }
  return existsSync(trimmedPath);
}

function readFfmpegStaticPath() {
  try {
    const requiredValue = new Function(
      "moduleName",
      "return require(moduleName)"
    )("ffmpeg-static") as unknown;
    return typeof requiredValue === "string" ? requiredValue : null;
  } catch {
    return null;
  }
}

export function resolveFfmpegPath(
  importedFfmpegPath = readFfmpegStaticPath(),
  envFfmpegPath = process.env.FFMPEG_PATH
): string {
  const trimmedEnvPath = envFfmpegPath?.trim();
  if (trimmedEnvPath && isUsableExecutablePath(trimmedEnvPath)) {
    return trimmedEnvPath;
  }

  const trimmedImportedPath = importedFfmpegPath?.trim();
  if (trimmedImportedPath && isUsableExecutablePath(trimmedImportedPath)) {
    return trimmedImportedPath;
  }

  const fallbackPath = path.join(
    /* turbopackIgnore: true */ process.cwd(),
    "node_modules",
    "ffmpeg-static",
    process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg"
  );
  if (isUsableExecutablePath(fallbackPath)) {
    return fallbackPath;
  }

  throw new FfmpegExecutableMissingError(
    "FFmpeg 실행 파일을 찾지 못했습니다. npm install 후 다시 시도해 주세요."
  );
}

async function blobToBuffer(blob: Blob) {
  return Buffer.from(await blob.arrayBuffer());
}

function runFfmpeg(args: string[], allowNonZeroExit = false) {
  const resolvedFfmpegPath = resolveFfmpegPath();

  return new Promise<FfmpegResult>((resolve, reject) => {
    const child = spawn(resolvedFfmpegPath, args, {
      windowsHide: true,
    });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout.on("data", (chunk) => stdoutChunks.push(Buffer.from(chunk)));
    child.stderr.on("data", (chunk) => stderrChunks.push(Buffer.from(chunk)));
    child.on("error", reject);
    child.on("close", (code) => {
      const result = {
        stdout: Buffer.concat(stdoutChunks).toString("utf8"),
        stderr: Buffer.concat(stderrChunks).toString("utf8"),
      };
      if (code === 0 || allowNonZeroExit) {
        resolve(result);
        return;
      }
      reject(
        new FrameExtractionError(
          `ffmpeg failed while extracting video frames. Exit code: ${code ?? "unknown"}`
        )
      );
    });
  });
}

function parseDurationSeconds(stderr: string) {
  const match = stderr.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)/);
  if (!match) return null;
  const [, hours, minutes, seconds] = match;
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

async function readVideoDuration(inputPath: string) {
  const result = await runFfmpeg(["-hide_banner", "-i", inputPath], true);
  const duration = parseDurationSeconds(result.stderr);
  if (!duration || !Number.isFinite(duration) || duration <= 0) {
    throw new FrameExtractionError("Could not read video duration before extracting frames.");
  }
  return duration;
}

function formatTimestamp(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds - minutes * 60;
  return `${minutes}:${remainingSeconds.toFixed(1).padStart(4, "0")}`;
}

async function extractVideoFrames(
  clip: Blob,
  mimeType: string
): Promise<ExtractedFrame[]> {
  const tempDir = await mkdtemp(path.join(tmpdir(), "video-draft-"));
  const inputPath = path.join(tempDir, `clip${resolveVideoExtension(mimeType)}`);

  try {
    await writeFile(inputPath, await blobToBuffer(clip));
    const durationSeconds = await readVideoDuration(inputPath);
    const frames: ExtractedFrame[] = [];

    for (const percent of OPENAI_FRAME_PERCENTS) {
      const timestampSeconds = durationSeconds * (percent / 100);
      const outputPath = path.join(tempDir, `frame-${percent}.jpg`);

      await runFfmpeg([
        "-y",
        "-ss",
        timestampSeconds.toFixed(3),
        "-i",
        inputPath,
        "-frames:v",
        "1",
        "-vf",
        "scale='min(960,iw)':-2",
        "-q:v",
        "3",
        outputPath,
      ]);

      frames.push({
        percent,
        timestampSeconds,
        base64Jpeg: (await readFile(outputPath)).toString("base64"),
      });
    }

    return frames;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

function buildOpenAiFramePrompt(prompt: string, frames: ExtractedFrame[]) {
  const frameList = frames
    .map(
      (frame, index) =>
        `Frame ${index + 1}: approximately ${formatTimestamp(frame.timestampSeconds)} (${frame.percent}%).`
    )
    .join("\n");

  return `${prompt}

OpenAI frame vision evidence:
${frameList}

Use the player scene note only as the player's self-review hypothesis, not as ground truth.
Use the frames as visual evidence. Compare visibleFacts, playerHypothesis, coachingHypotheses, uncertainFacts, riskReasoning, and likelyGainLossStructure before choosing form fields.
Do not simply agree with the player. Do not say "you were wrong." Explain in the JSON text fields why a decision was risky, when it could be valid, what to check next time, and the likely gain/loss structure when relevant.
Return only the exact JSON object requested above.`;
}

function buildOpenAiResponseContent(prompt: string, frames: ExtractedFrame[]) {
  const content: Array<
    | { type: "input_text"; text: string }
    | { type: "input_image"; image_url: string; detail: "low" }
  > = [{ type: "input_text", text: buildOpenAiFramePrompt(prompt, frames) }];

  for (const [index, frame] of frames.entries()) {
    content.push({
      type: "input_text",
      text: `Frame ${index + 1}: approximately ${formatTimestamp(frame.timestampSeconds)} (${frame.percent}%).`,
    });
    content.push({
      type: "input_image",
      image_url: `data:image/jpeg;base64,${frame.base64Jpeg}`,
      detail: "low",
    });
  }

  return content;
}

export const openAiFrameProvider: AiVideoDraftProvider = {
  async generateVideoDraft(prompt, clip, mimeType) {
    const apiKey = requireOpenAiApiKey();
    const frames = await extractVideoFrames(clip, mimeType);
    const openai = new OpenAI({ apiKey });

    const response = await openai.responses.create({
      model: resolveOpenAiVideoModel(),
      input: [
        {
          role: "user",
          content: buildOpenAiResponseContent(prompt, frames),
        },
      ],
      text: {
        format: { type: "json_object" },
      },
    });

    return response.output_text;
  },
};
