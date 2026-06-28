import { NextResponse } from "next/server";
import type {
  ReviewEvidenceMetadata,
  SceneEvidencePackage,
  SceneCandidateMetadata,
} from "@/types/evidence";
import type { RiotTimelineEvidence } from "@/types/riot";
import type { DeathReviewInput } from "@/types/review";
import type { VideoReviewDraft } from "@/types/videoDraft";
import { buildSceneEvidencePackage } from "@/lib/evidencePackage";
import { generateRiskTags } from "@/lib/riskTagMapper";
import { buildReviewPrompt } from "@/lib/prompts";
import { mapCoachingCategories } from "@/lib/coachingCategoryMapper";
import { buildCoachingKnowledgeBlock } from "@/lib/coachingKnowledge";
import { determineScenarioType } from "@/lib/scenarioRouter";
import { generateCoachingReview } from "@/lib/ai/generateReview";
import { getSceneScenarioById } from "@/lib/coachingMetrics";
import { mapEvidenceToSceneCandidates } from "@/lib/sceneCandidateMapper";
import {
  GEMINI_QUOTA_ERROR_MESSAGE,
  GEMINI_UNAVAILABLE_ERROR_MESSAGE,
  getGeminiErrorLogContext,
  isGeminiQuotaError,
  isGeminiUnavailableError,
} from "@/lib/ai/geminiProvider";

type ReviewRequestBody = Partial<DeathReviewInput> & {
  manualInput?: Partial<DeathReviewInput> | null;
  videoDraft?: Partial<VideoReviewDraft> | null;
  riotEvidence?: Partial<RiotTimelineEvidence> | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function asOptionalRecord<T>(value: unknown): Partial<T> | undefined {
  return isRecord(value) ? (value as Partial<T>) : undefined;
}

function extractReviewRequest(body: unknown): {
  input: DeathReviewInput;
  videoDraft?: Partial<VideoReviewDraft>;
  riotEvidence?: Partial<RiotTimelineEvidence>;
} {
  const record = isRecord(body) ? (body as ReviewRequestBody) : {};

  if (isRecord(record.manualInput)) {
    return {
      input: record.manualInput as DeathReviewInput,
      videoDraft: asOptionalRecord<VideoReviewDraft>(record.videoDraft),
      riotEvidence: asOptionalRecord<RiotTimelineEvidence>(record.riotEvidence),
    };
  }

  const { manualInput: _manualInput, videoDraft, riotEvidence, ...manualFields } =
    record;

  return {
    input: manualFields as DeathReviewInput,
    videoDraft: asOptionalRecord<VideoReviewDraft>(videoDraft),
    riotEvidence: asOptionalRecord<RiotTimelineEvidence>(riotEvidence),
  };
}

function compactStringList(values: string[]): string[] {
  return values
    .filter((value) => typeof value === "string" && value.trim().length > 0)
    .slice(0, 8)
    .map((value) => (value.length > 300 ? `${value.slice(0, 297)}...` : value));
}

function compactEvidenceMetadata(
  scenePackage: SceneEvidencePackage
): ReviewEvidenceMetadata {
  return {
    sourcePresence: scenePackage.sourcePresence,
    sourceConfidence: scenePackage.sourceConfidence,
    evidenceSummary: compactStringList(scenePackage.evidenceSummary),
    missingInfo: compactStringList(scenePackage.missingInfo),
    conflictsSummary: {
      count: scenePackage.conflicts.length,
      fields: [...new Set(scenePackage.conflicts.map((conflict) => conflict.field))],
    },
    derivedContext: {
      primarySceneType: scenePackage.derivedContext.primarySceneType,
      likelyReviewFocus: compactStringList(
        scenePackage.derivedContext.likelyReviewFocus
      ),
      riskTagsFromEvidence: compactStringList(
        scenePackage.derivedContext.riskTagsFromEvidence
      ),
      objectiveContext: scenePackage.derivedContext.objectiveContext,
    },
  };
}

function buildEvidenceMetadataSafely({
  input,
  videoDraft,
  riotEvidence,
}: {
  input: DeathReviewInput;
  videoDraft?: Partial<VideoReviewDraft>;
  riotEvidence?: Partial<RiotTimelineEvidence>;
}): ReviewEvidenceMetadata {
  try {
    return compactEvidenceMetadata(
      buildSceneEvidencePackage({
        manualInput: input,
        videoDraft,
        riotEvidence,
      })
    );
  } catch (error) {
    console.error(
      "Evidence package generation failed.",
      error instanceof Error ? error.message : error
    );

    return {
      sourcePresence: {
        manual: true,
        video: Boolean(videoDraft),
        riot: Boolean(riotEvidence),
      },
      sourceConfidence: {
        manual: "unknown",
        video: "unknown",
        riot: "unknown",
      },
      evidenceSummary: [],
      missingInfo: [],
      conflictsSummary: {
        count: 0,
        fields: [],
      },
      derivedContext: {
        likelyReviewFocus: [],
        riskTagsFromEvidence: [],
      },
      packageGenerationFailed: true,
    };
  }
}

function buildSceneCandidateMetadata({
  riskTags,
  scenarioType,
  currentOutcome,
  evidenceMetadata,
}: {
  riskTags: string[];
  scenarioType: string;
  currentOutcome: string;
  evidenceMetadata: ReviewEvidenceMetadata;
}): SceneCandidateMetadata {
  const mappingResult = mapEvidenceToSceneCandidates({
    riskTags,
    scenarioType,
    currentOutcome,
    evidenceSummary: evidenceMetadata.evidenceSummary,
    derivedContext: evidenceMetadata.derivedContext,
  });

  return {
    candidates: mappingResult.scenarioCandidates.slice(0, 3).map((candidate) => {
      const scenario = getSceneScenarioById(candidate.scenarioId);

      return {
        scenarioId: candidate.scenarioId,
        displayNameKo: scenario?.displayNameKo ?? candidate.scenarioId,
        confidence: candidate.confidence,
        matchedRiskTags: candidate.matchedRiskTags,
        reasonKo: candidate.reasonKo,
        limitingFactors: candidate.limitingFactors,
      };
    }),
    candidateScenarioIds: mappingResult.candidateScenarioIds,
    candidateMetricIds: mappingResult.candidateMetricIds,
    candidateHabitPatternIds: mappingResult.candidateHabitPatternIds,
    noteKo:
      "이 항목은 최종 판정이 아니라 Risk Tag와 근거를 기반으로 한 복기 후보입니다.",
  };
}

function isReviewMockEnabled() {
  return process.env.AI_REVIEW_MOCK?.trim().toLowerCase() === "true";
}

export async function POST(req: Request) {
  try {
    const { input, videoDraft, riotEvidence } = extractReviewRequest(
      await req.json()
    );
    const evidenceMetadata = buildEvidenceMetadataSafely({
      input,
      videoDraft,
      riotEvidence,
    });

    const riskTags = generateRiskTags(input);
    const scenarioType = determineScenarioType(input, riskTags);
    evidenceMetadata.sceneCandidates = buildSceneCandidateMetadata({
      riskTags,
      scenarioType,
      currentOutcome: input.currentOutcome,
      evidenceMetadata,
    });

    const coachingCategories = mapCoachingCategories(input, riskTags);
    const coachingKnowledgeBlock =
      buildCoachingKnowledgeBlock(coachingCategories, input, riskTags);

    const prompt = buildReviewPrompt(
      input,
      riskTags,
      coachingCategories,
      coachingKnowledgeBlock,
      scenarioType
    );

    const text = isReviewMockEnabled()
      ? JSON.stringify({
          scenario_type: scenarioType,
          main_question:
            "[DEV MOCK] 외부 AI 호출 없이 생성된 개발용 리뷰입니다. 실제 판단은 아닙니다.",
          follow_up_questions: [
            "[DEV MOCK] 실제 리뷰 전환 전 입력값과 근거 연결 상태를 확인하세요.",
          ],
          possible_risk_factors: [],
          next_laning_goal:
            "[DEV MOCK] AI_REVIEW_MOCK=false로 바꾼 뒤 실제 리뷰를 다시 생성하세요.",
          risk_checklist: ["[DEV MOCK] 외부 모델 호출 생략"],
          confidence_note:
            "[DEV MOCK] 개발용 mock 응답입니다. Gemini 호출을 수행하지 않았습니다.",
        })
      : await generateCoachingReview(prompt);

    if (!text) {
      return NextResponse.json(
        { error: "Gemini response was empty." },
        { status: 500 }
      );
    }

    const result = JSON.parse(text);

    return NextResponse.json({
      riskTags,
      scenarioType,
      coachingCategories,
      result,
      evidenceMetadata,
    });
  } catch (error) {
    if (isGeminiQuotaError(error)) {
      console.warn(
        "Gemini review failed due to quota.",
        getGeminiErrorLogContext(error)
      );
      return NextResponse.json(
        { error: GEMINI_QUOTA_ERROR_MESSAGE },
        { status: 429 }
      );
    }
    if (isGeminiUnavailableError(error)) {
      console.warn(
        "Gemini review failed due to temporary unavailability.",
        getGeminiErrorLogContext(error)
      );
      return NextResponse.json(
        { error: GEMINI_UNAVAILABLE_ERROR_MESSAGE },
        { status: 503 }
      );
    }

    console.error(error);

    return NextResponse.json(
      { error: "Failed to generate review." },
      { status: 500 }
    );
  }
}
