import type { DeathReviewInput } from "@/types/review";

export type ReviewFormPatch = Partial<
  Pick<
    DeathReviewInput,
    | "myChampion"
    | "enemyChampion"
    | "playerTier"
    | "gameTime"
    | "currentOutcome"
    | "sceneOutcomeAssessment"
    | "freeDescription"
    | "laneStateDetail"
    | "enemyMidState"
    | "objectiveType"
    | "timeToObjective"
    | "midPriorityBeforeObjective"
    | "objectivePrepAction"
    | "movementSide"
    | "enemyJungleInfoBeforeFight"
    | "allyJungleCoverBeforeFight"
    | "postPushIntent"
  >
>;

type DraftLike = {
  myChampion?: unknown;
  champion?: unknown;
  playerChampion?: unknown;
  enemyChampion?: unknown;
  opponentChampion?: unknown;
  playerTier?: unknown;
  gameTime?: unknown;
  currentOutcome?: unknown;
  sceneOutcomeAssessment?: unknown;
  suggestedSceneOutcomeAssessment?: unknown;
  suggestedFreeDescription?: unknown;
  summary?: unknown;
  suggestedFields?: Record<string, unknown>;
};

export function mapVideoDraftToReviewFormPatch(
  videoDraft: unknown
): ReviewFormPatch {
  if (!isRecord(videoDraft)) return {};

  const draft = videoDraft as DraftLike;
  const suggestedFields = isRecord(draft.suggestedFields)
    ? draft.suggestedFields
    : {};
  const patch: ReviewFormPatch = {};

  assignString(patch, "myChampion", firstText(draft.myChampion, draft.champion, draft.playerChampion));
  assignString(patch, "enemyChampion", firstText(draft.enemyChampion, draft.opponentChampion));
  assignString(patch, "playerTier", firstText(draft.playerTier));
  assignString(patch, "gameTime", firstText(draft.gameTime));
  assignString(
    patch,
    "currentOutcome",
    firstText(suggestedFields.currentOutcome, draft.currentOutcome)
  );
  assignString(
    patch,
    "sceneOutcomeAssessment",
    firstText(draft.suggestedSceneOutcomeAssessment, draft.sceneOutcomeAssessment)
  );
  assignString(
    patch,
    "freeDescription",
    firstText(draft.suggestedFreeDescription, draft.summary)
  );
  assignString(patch, "laneStateDetail", firstText(suggestedFields.laneStateDetail));
  assignString(patch, "enemyMidState", firstText(suggestedFields.enemyMidState));
  assignString(patch, "objectiveType", firstText(suggestedFields.objectiveType));
  assignString(patch, "timeToObjective", firstText(suggestedFields.timeToObjective));
  assignString(
    patch,
    "midPriorityBeforeObjective",
    firstText(suggestedFields.lanePriority)
  );
  assignString(
    patch,
    "objectivePrepAction",
    firstText(suggestedFields.objectivePrepAction)
  );
  assignString(patch, "movementSide", firstText(suggestedFields.movementDirection));
  assignString(
    patch,
    "enemyJungleInfoBeforeFight",
    firstText(suggestedFields.enemyJungleInfo)
  );
  assignString(
    patch,
    "allyJungleCoverBeforeFight",
    firstText(suggestedFields.allyJungleCover)
  );
  assignString(patch, "postPushIntent", firstText(suggestedFields.postPushIntent));

  return patch;
}

export function hasUsableVideoDraftPatch(patch: ReviewFormPatch): boolean {
  return Object.values(patch).some(
    (value) => typeof value === "string" && value.trim().length > 0
  );
}

function assignString<K extends keyof ReviewFormPatch>(
  patch: ReviewFormPatch,
  key: K,
  value: string | undefined
) {
  if (!value) return;
  patch[key] = value as NonNullable<ReviewFormPatch[K]>;
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
