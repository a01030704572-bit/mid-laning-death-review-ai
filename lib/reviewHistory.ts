import type {
  ReviewSceneCompletion,
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

function isReviewSceneRecord(value: unknown): value is ReviewSceneRecord {
  if (!value || typeof value !== "object") return false;

  const record = value as Partial<ReviewSceneRecord>;
  return (
    typeof record.id === "string" &&
    typeof record.createdAt === "string" &&
    (record.sourceType === "manual" || record.sourceType === "video") &&
    typeof record.champion === "string" &&
    typeof record.enemyChampion === "string" &&
    typeof record.routedScenario === "string" &&
    Array.isArray(record.riskTags) &&
    record.riskTags.every((tag) => typeof tag === "string") &&
    Boolean(record.rawInputSnapshot && typeof record.rawInputSnapshot === "object")
  );
}

function newestFirst(records: ReviewSceneRecord[]) {
  return [...records].sort(
    (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)
  );
}

function removeLegacyResultSnapshot(record: ReviewSceneRecord) {
  const lightweightRecord = { ...record } as ReviewSceneRecord & {
    resultSnapshot?: unknown;
  };
  delete lightweightRecord.resultSnapshot;
  return lightweightRecord as ReviewSceneRecord;
}

export function createManualReviewSceneRecord(
  completion: ReviewSceneCompletion
): ReviewSceneRecord {
  const { input, result, riskTags, scenarioType } = completion;

  return {
    id: createRecordId(),
    createdAt: new Date().toISOString(),
    sourceType: "manual",
    champion: input.myChampion,
    enemyChampion: input.enemyChampion,
    gameTime: input.gameTime,
    playerTier: input.playerTier,
    currentOutcome: input.currentOutcome,
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
      parsed.filter(isReviewSceneRecord).map(removeLegacyResultSnapshot)
    ).slice(0, MAX_STORED_SCENES);
  } catch {
    return [];
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
