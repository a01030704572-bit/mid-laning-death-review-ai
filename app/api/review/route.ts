import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { DeathReviewInput } from "@/types/review";
import { generateRiskTags } from "@/lib/riskTagMapper";
import { buildReviewPrompt } from "@/lib/prompts";
import { mapCoachingCategories } from "@/lib/coachingCategoryMapper";
import { buildCoachingKnowledgeBlock } from "@/lib/coachingKnowledge";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const input = (await req.json()) as DeathReviewInput;

    const riskTags = generateRiskTags(input);

    const coachingCategories = mapCoachingCategories(input, riskTags);
    const coachingKnowledgeBlock =
      buildCoachingKnowledgeBlock(coachingCategories);

    const prompt = buildReviewPrompt(
      input,
      riskTags,
      coachingCategories,
      coachingKnowledgeBlock
    );

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text;

    if (!text) {
      return NextResponse.json(
        { error: "Gemini response was empty." },
        { status: 500 }
      );
    }

    const result = JSON.parse(text);

    return NextResponse.json({
      riskTags,
      coachingCategories,
      result,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to generate review." },
      { status: 500 }
    );
  }
}