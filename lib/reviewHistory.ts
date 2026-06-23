import type {
  ReviewSceneCompletion,
  ReviewSceneMetadataInput,
  ReviewSceneRecord,
} from "@/types/history";

export const REVIEW_SCENE_STORAGE_KEY = "mid-laning-review-history-v1";
const MAX_STORED_SCENES = 20;

function cloneSnapshot<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createRecordId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeReviewSceneRecord(value: unknown): ReviewSceneRecord | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Omit<Partial<ReviewSceneRecord>, "sourceType"> & {
    sourceType?: "manual" | "video" | "video_review";
    resultSnapshot?: unknown;
  };
  const isValid =
    typeof record.id === "string" &&
    typeof record.createdAt === "string" &&
    (record.sourceType === "manual" ||
      record.sourceType === "video" ||
      record.sourceType === "video_review") &&
    typeof record.champion === "string" &&
    typeof record.enemyChampion === "string" &&
    typeof record.routedScenario === "string" &&
    Array.isArray(record.riskTags) &&
    record.riskTags.every((tag) => typeof tag === "string") &&
    Boolean(record.rawInputSnapshot && typeof record.rawInputSnapshot === "object");

  if (!isValid) return null;

  const normalized = { ...record };
  normalized.sourceType =
    record.sourceType === "video" ? "video_review" : record.sourceType;
  delete normalized.resultSnapshot;
  return normalized as ReviewSceneRecord;
}

function newestFirst(records: ReviewSceneRecord[]) {
  return [...records].sort(
    (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)
  );
}

function deriveReviewSessionId(sourceLabel: string) {
  const normalized = sourceLabel.trim().toLocaleLowerCase().replace(/\s+/g, "-");
  return normalized
    ? `video-review:${encodeURIComponent(normalized)}`
    : undefined;
}

function normalizeMetadata(
  metadata?: ReviewSceneMetadataInput
): Pick<
  ReviewSceneRecord,
  | "sourceType"
  | "sourceLabel"
  | "sceneTime"
  | "sceneIndex"
  | "reviewSessionId"
> {
  if (!metadata || metadata.sourceType === "manual") {
    return { sourceType: "manual" };
  }

  const sourceLabel = metadata.sourceLabel.trim();
  const sceneTime = metadata.sceneTime.trim();
  const parsedSceneIndex = Number.parseInt(metadata.sceneIndex, 10);

  return {
    sourceType: "video_review",
    sourceLabel: sourceLabel || undefined,
    sceneTime: sceneTime || undefined,
    sceneIndex:
      Number.isInteger(parsedSceneIndex) && parsedSceneIndex > 0
        ? parsedSceneIndex
        : undefined,
    reviewSessionId: sourceLabel
      ? deriveReviewSessionId(sourceLabel)
      : undefined,
  };
}

export function createReviewSceneRecord(
  completion: ReviewSceneCompletion
): ReviewSceneRecord {
  const { input, result, riskTags, scenarioType, sourceMetadata } = completion;

  return {
    id: createRecordId(),
    createdAt: new Date().toISOString(),
    ...normalizeMetadata(sourceMetadata),
    champion: input.myChampion,
    enemyChampion: input.enemyChampion,
    gameTime: input.gameTime,
    playerTier: input.playerTier,
    currentOutcome: input.currentOutcome,
    sceneOutcomeAssessment: input.sceneOutcomeAssessment,
    routedScenario: scenarioType,
    riskTags: [...riskTags],
    primaryMistakeSummary: result.possible_risk_factors?.[0]?.explanation,
    nextGameGoal: result.next_laning_goal,
    rawInputSnapshot: cloneSnapshot(input),
  };
}

export function loadReviewSceneHistory(): ReviewSceneRecord[] {
  try {
    if (typeof window === "undefined") return [];
    const stored = window.localStorage.getItem(REVIEW_SCENE_STORAGE_KEY);
    if (!stored) return [];

    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return newestFirst(
      parsed
        .map(normalizeReviewSceneRecord)
        .filter((record): record is ReviewSceneRecord => record !== null)
    ).slice(0, MAX_STORED_SCENES);
  } catch {
    return [];
  }
}

export function clearReviewSceneHistory(): boolean {
  try {
    if (typeof window === "undefined") return false;
    window.localStorage.removeItem(REVIEW_SCENE_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function saveReviewSceneRecord(
  record: ReviewSceneRecord
): ReviewSceneRecord[] | null {
  try {
    if (typeof window === "undefined") return null;
    const updated = newestFirst([record, ...loadReviewSceneHistory()]).slice(
      0,
      MAX_STORED_SCENES
    );
    window.localStorage.setItem(
      REVIEW_SCENE_STORAGE_KEY,
      JSON.stringify(updated)
    );
    return updated;
  } catch {
    return null;
  }
}
