import type { DeathReviewInput } from "@/types/review";
import type { ReviewFormPatch } from "@/lib/videoDraftToReviewFormPatch";

export type VideoDraftPatchTrustCategory =
  | "safe"
  | "champion_identity"
  | "blocked_no_verification";

export type VideoDraftTrustGateResult = {
  filteredPatch: ReviewFormPatch;
  blockedFields: (keyof ReviewFormPatch)[];
  fieldCategories: Record<keyof ReviewFormPatch, VideoDraftPatchTrustCategory>;
};

export type VideoDraftApplyWarning = {
  tone: "warning";
  message: string;
  blockedFields: string[];
};

export const VIDEO_DRAFT_PATCH_FIELD_CATEGORIES = {
  myChampion: "champion_identity",
  enemyChampion: "champion_identity",
  playerTier: "blocked_no_verification",
  gameTime: "blocked_no_verification",
  currentOutcome: "blocked_no_verification",
  sceneOutcomeAssessment: "blocked_no_verification",
  freeDescription: "safe",
  laneStateDetail: "blocked_no_verification",
  enemyMidState: "blocked_no_verification",
  objectiveType: "blocked_no_verification",
  timeToObjective: "blocked_no_verification",
  midPriorityBeforeObjective: "blocked_no_verification",
  objectivePrepAction: "blocked_no_verification",
  movementSide: "blocked_no_verification",
  enemyJungleInfoBeforeFight: "blocked_no_verification",
  allyJungleCoverBeforeFight: "blocked_no_verification",
  postPushIntent: "blocked_no_verification",
} satisfies Record<keyof ReviewFormPatch, VideoDraftPatchTrustCategory>;

export function filterVideoDraftPatchByTrustGate(
  patch: ReviewFormPatch
): VideoDraftTrustGateResult {
  const filteredPatch: ReviewFormPatch = {};
  const blockedFields: (keyof ReviewFormPatch)[] = [];

  for (const [field, value] of Object.entries(patch) as [
    keyof ReviewFormPatch,
    ReviewFormPatch[keyof ReviewFormPatch],
  ][]) {
    const category = VIDEO_DRAFT_PATCH_FIELD_CATEGORIES[field];
    if (!category || category === "blocked_no_verification") {
      blockedFields.push(field);
      continue;
    }
    if (typeof value === "string" && value.trim()) {
      filteredPatch[field] = value as never;
    }
  }

  return {
    filteredPatch,
    blockedFields,
    fieldCategories: VIDEO_DRAFT_PATCH_FIELD_CATEGORIES,
  };
}

export function hasExistingCoreSceneInput(
  input: Partial<DeathReviewInput>
): boolean {
  return Boolean(
    hasText(input.myChampion) ||
      hasText(input.enemyChampion) ||
      hasMeaningfulValue(input.currentOutcome, "death") ||
      hasMeaningfulValue(input.objectiveType, "unknown", "none") ||
      hasMeaningfulValue(input.gameTime, "pre_lane")
  );
}

export function buildVideoDraftApplyWarning(input: {
  hasExistingCoreSceneInput: boolean;
  blockedFields: (keyof ReviewFormPatch)[];
}): VideoDraftApplyWarning | null {
  if (input.hasExistingCoreSceneInput) {
    return {
      tone: "warning",
      message:
        "기존 수동 입력이 남아 있을 수 있습니다. 새 장면이면 입력값을 초기화한 뒤 적용하세요.",
      blockedFields: input.blockedFields.map(String),
    };
  }

  if (input.blockedFields.length > 0) {
    return {
      tone: "warning",
      message:
        "영상 초안은 구조화 입력값을 확정하지 않습니다. 챔피언, 결과, 오브젝트, 정글 정보는 수동 입력 또는 Riot 근거로 확인하세요.",
      blockedFields: input.blockedFields.map(String),
    };
  }

  return null;
}

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hasMeaningfulValue(value: unknown, ...emptyValues: string[]): boolean {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    !emptyValues.includes(value)
  );
}
