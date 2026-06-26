import { NextResponse } from "next/server";
import type { ReviewEvidenceMetadata, SceneEvidencePackage } from "@/types/evidence";
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

    const text = await generateCoachingReview(prompt);

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
    console.error(error);

    return NextResponse.json(
      { error: "Failed to generate review." },
      { status: 500 }
    );
  }
}
