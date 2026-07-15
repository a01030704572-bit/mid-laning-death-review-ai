import { buildCoachingFeedbackDraftFromScenes } from "@/lib/coachingFeedbackDraftMapper";
import { normalizeCoachingFeedback } from "@/lib/coachingFeedbackQualityGate";
import type { CoachingFeedback } from "@/types/coachingFeedback";

export type BuildCoachingFeedbackPipelineInput = Parameters<
  typeof buildCoachingFeedbackDraftFromScenes
>[0];

export type BuildCoachingFeedbackPipelineResult = {
  feedback: CoachingFeedback;
  warnings: string[];
  changed: boolean;
};

export function buildCoachingFeedbackPipeline(
  input: BuildCoachingFeedbackPipelineInput
): BuildCoachingFeedbackPipelineResult {
  const draft = buildCoachingFeedbackDraftFromScenes(input);
  const normalized = normalizeCoachingFeedback(draft);

  return {
    feedback: normalized.feedback,
    warnings: normalized.warnings,
    changed: normalized.changed,
  };
}
