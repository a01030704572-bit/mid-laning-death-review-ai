import { NextResponse } from "next/server";
import {
  FfmpegExecutableMissingError,
  generateVideoDraft,
  OpenAiApiKeyMissingError,
  UnsupportedVideoProviderError,
  VideoInputUnsupportedError,
} from "@/lib/ai/generateVideoDraft";
import {
  GEMINI_QUOTA_ERROR_MESSAGE,
  GEMINI_UNAVAILABLE_ERROR_MESSAGE,
  getGeminiErrorLogContext,
  isGeminiQuotaError,
  isGeminiUnavailableError,
} from "@/lib/ai/geminiProvider";
import {
  buildVideoDraftPrompt,
  getVideoDraftFileValidationError,
  InvalidVideoDraftResponseError,
  MAX_VIDEO_DRAFT_NOTE_LENGTH,
  parseVideoReviewDraft,
} from "@/lib/videoDraft";
import { parseLockedRiotVideoContext } from "@/lib/videoDraftRiotContext";

const OPENAI_INSUFFICIENT_QUOTA_ERROR =
  "OpenAI API 사용 가능 크레딧 또는 결제 한도가 부족합니다. OpenAI Platform의 Billing/Usage를 확인해 주세요.";

function getErrorField(error: unknown, field: string) {
  if (!error || typeof error !== "object") return undefined;
  const value = (error as Record<string, unknown>)[field];
  return typeof value === "string" || typeof value === "number"
    ? value
    : undefined;
}

function isOpenAiInsufficientQuotaError(error: unknown) {
  const status = getErrorField(error, "status");
  const code = getErrorField(error, "code");
  const type = getErrorField(error, "type");
  const message = error instanceof Error ? error.message : "";

  return (
    status === 429 &&
    (code === "insufficient_quota" ||
      type === "insufficient_quota" ||
      message.includes("insufficient_quota"))
  );
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const clip = formData.get("clip");
    const rawNote = formData.get("note");
    const rawProvider = formData.get("provider");
    const rawLockedRiotContext = formData.get("lockedRiotContext");

    if (!(clip instanceof File)) {
      return NextResponse.json(
        { error: "영상 클립 파일을 선택해주세요." },
        { status: 400 }
      );
    }

    const validationError = getVideoDraftFileValidationError(clip);
    if (validationError) {
      return NextResponse.json(
        { error: validationError.message },
        { status: validationError.status }
      );
    }

    const note = typeof rawNote === "string" ? rawNote.trim() : "";
    const provider = typeof rawProvider === "string" ? rawProvider.trim() : "";
    const lockedRiotContext = parseLockedRiotVideoContext(rawLockedRiotContext);
    if (provider && provider !== "gemini" && provider !== "openai") {
      return NextResponse.json(
        { error: "지원하지 않는 영상 초안 provider입니다." },
        { status: 400 }
      );
    }
    if (note.length > MAX_VIDEO_DRAFT_NOTE_LENGTH) {
      return NextResponse.json(
        { error: "장면 메모는 500자 이하로 입력해주세요." },
        { status: 400 }
      );
    }

    const text = await generateVideoDraft(
      buildVideoDraftPrompt(note, lockedRiotContext),
      clip,
      clip.type,
      { provider: provider === "openai" ? "openai" : "gemini" }
    );
    if (!text) {
      return NextResponse.json(
        { error: "영상 초안 응답이 비어 있습니다. 다시 시도해주세요." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      draft: parseVideoReviewDraft(text, note, lockedRiotContext),
    });
  } catch (error) {
    if (error instanceof UnsupportedVideoProviderError) {
      return NextResponse.json(
        { error: "지원하지 않는 영상 초안 provider입니다." },
        { status: 400 }
      );
    }
    if (error instanceof OpenAiApiKeyMissingError) {
      return NextResponse.json(
        {
          error:
            "OpenAI frame vision provider를 사용하려면 서버 환경 변수 OPENAI_API_KEY가 필요합니다.",
        },
        { status: 401 }
      );
    }
    if (error instanceof FfmpegExecutableMissingError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (isOpenAiInsufficientQuotaError(error)) {
      console.warn("OpenAI video draft failed due to insufficient quota.", {
        status: getErrorField(error, "status"),
        code: getErrorField(error, "code"),
        type: getErrorField(error, "type"),
      });
      return NextResponse.json(
        { error: OPENAI_INSUFFICIENT_QUOTA_ERROR },
        { status: 429 }
      );
    }
    if (isGeminiQuotaError(error)) {
      console.warn(
        "Gemini video draft failed due to quota.",
        getGeminiErrorLogContext(error)
      );
      return NextResponse.json(
        { error: GEMINI_QUOTA_ERROR_MESSAGE },
        { status: 429 }
      );
    }
    if (isGeminiUnavailableError(error)) {
      console.warn(
        "Gemini video draft failed due to temporary unavailability.",
        getGeminiErrorLogContext(error)
      );
      return NextResponse.json(
        { error: GEMINI_UNAVAILABLE_ERROR_MESSAGE },
        { status: 503 }
      );
    }
    if (error instanceof VideoInputUnsupportedError) {
      return NextResponse.json(
        {
          error:
            "현재 설정된 Gemini 모델은 영상 입력을 지원하지 않습니다. 영상 지원 모델을 설정하거나 기존 수동 복기를 이용해주세요.",
        },
        { status: 422 }
      );
    }
    if (error instanceof InvalidVideoDraftResponseError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    if (error instanceof Error && error.message.includes("timed out")) {
      return NextResponse.json(
        { error: "영상 처리 시간이 초과되었습니다. 더 짧은 클립으로 다시 시도해주세요." },
        { status: 504 }
      );
    }

    console.error(error);

    return NextResponse.json(
      {
        error:
          "영상 초안 생성에 실패했습니다. 파일 형식과 크기를 확인한 뒤 다시 시도해주세요.",
      },
      { status: 500 }
    );
  }
}
