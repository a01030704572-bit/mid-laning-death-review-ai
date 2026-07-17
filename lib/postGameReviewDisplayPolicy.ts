import type { RankedReviewScene } from "@/types/matchReview";

export type PostGameReviewDisplayPolicyInput = {
  debugMode?: boolean;
  hasMatchReview?: boolean;
  hasCoachingFeedbackPreview?: boolean;
  topScenes?: RankedReviewScene[];
  strengthScenes?: RankedReviewScene[];
  improvementScenes?: RankedReviewScene[];
};

export type PostGameReviewDisplayPolicy = {
  showReadinessPreview: boolean;
  showMainCoachingCard: boolean;
  showCompactSummary: boolean;
  primaryScenes: RankedReviewScene[];
  keepScenes: RankedReviewScene[];
  additionalScenes: RankedReviewScene[];
  collapseAdditionalByDefault: boolean;
  showManualFallbackCompact: boolean;
};

export function getPostGameReviewDisplayPolicy({
  debugMode = false,
  hasMatchReview = false,
  hasCoachingFeedbackPreview = false,
  topScenes = [],
  strengthScenes = [],
  improvementScenes = [],
}: PostGameReviewDisplayPolicyInput): PostGameReviewDisplayPolicy {
  if (debugMode) {
    return {
      showReadinessPreview: true,
      showMainCoachingCard: hasCoachingFeedbackPreview,
      showCompactSummary: true,
      primaryScenes: topScenes.slice(0, 5),
      keepScenes: strengthScenes.slice(0, 3),
      additionalScenes: improvementScenes.slice(0, 5),
      collapseAdditionalByDefault: false,
      showManualFallbackCompact: false,
    };
  }

  const primaryScenes = topScenes.slice(0, 2);
  const primarySceneIds = new Set(primaryScenes.map((scene) => scene.sceneId));
  const keepScenes = strengthScenes
    .filter((scene) => !primarySceneIds.has(scene.sceneId))
    .slice(0, 1);
  const visibleSceneIds = new Set([
    ...primaryScenes.map((scene) => scene.sceneId),
    ...keepScenes.map((scene) => scene.sceneId),
  ]);

  return {
    showReadinessPreview: !hasMatchReview,
    showMainCoachingCard: hasCoachingFeedbackPreview,
    showCompactSummary: hasMatchReview && !hasCoachingFeedbackPreview,
    primaryScenes,
    keepScenes,
    additionalScenes: uniqueScenesById([
      ...topScenes.slice(2),
      ...improvementScenes,
      ...strengthScenes,
    ]).filter((scene) => !visibleSceneIds.has(scene.sceneId)),
    collapseAdditionalByDefault: true,
    showManualFallbackCompact: true,
  };
}

function uniqueScenesById(scenes: RankedReviewScene[]) {
  const seen = new Set<string>();
  const uniqueScenes: RankedReviewScene[] = [];

  for (const scene of scenes) {
    if (seen.has(scene.sceneId)) continue;
    seen.add(scene.sceneId);
    uniqueScenes.push(scene);
  }

  return uniqueScenes;
}
