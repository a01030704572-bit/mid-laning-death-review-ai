import { mapOverwolfPackageToSceneVideoEvidence } from "./overwolfCaptureMapper";
import type { RankedReviewScene } from "@/types/matchReview";
import type {
  OverwolfCaptureEventType,
  OverwolfCapturePackage,
  SceneVideoEvidence,
} from "@/types/overwolfCapture";

export type VideoEvidenceStatus =
  | "attached"
  | "not_found"
  | "misaligned"
  | "unknown";

export type RankedSceneWithVideoEvidence<TScene> = TScene & {
  videoEvidence?: SceneVideoEvidence;
  videoEvidenceStatus: VideoEvidenceStatus;
};

type AttachOptions = {
  strictWindowSec?: number;
  looseWindowSec?: number;
};

const DEFAULT_STRICT_WINDOW_SEC = 10;
const DEFAULT_LOOSE_WINDOW_SEC = 30;

export function getSceneGameTimeSec(scene: unknown): number | undefined {
  if (!scene || typeof scene !== "object") return undefined;

  const sceneRecord = scene as Record<string, unknown>;
  const directTime = finiteNumber(sceneRecord.gameTimeSec);
  if (directTime !== undefined) return directTime;

  const reviewSeed = sceneRecord.reviewSeed;
  if (reviewSeed && typeof reviewSeed === "object") {
    return finiteNumber((reviewSeed as Record<string, unknown>).gameTimeSec);
  }

  return undefined;
}

export function inferSceneEventTypeForOverwolf(
  scene: Pick<RankedReviewScene, "autoSceneType"> | { autoSceneType?: string }
): OverwolfCaptureEventType | "unknown" {
  switch (scene.autoSceneType) {
    case "death_review_candidate":
    case "jungle_gank_death_candidate":
    case "objective_setup_failure_candidate":
      return "death";
    case "solo_kill_candidate":
    case "post_kill_conversion_candidate":
      return "kill";
    default:
      return "unknown";
  }
}

export function findBestVideoEvidenceForScene<TScene extends RankedReviewScene>(
  scene: TScene,
  evidenceList: SceneVideoEvidence[],
  options: AttachOptions = {}
): {
  videoEvidence?: SceneVideoEvidence;
  videoEvidenceStatus: VideoEvidenceStatus;
} {
  const strictWindowSec =
    options.strictWindowSec ?? DEFAULT_STRICT_WINDOW_SEC;
  const looseWindowSec = options.looseWindowSec ?? DEFAULT_LOOSE_WINDOW_SEC;
  const sceneTimeSec = getSceneGameTimeSec(scene);

  if (sceneTimeSec === undefined) {
    return { videoEvidenceStatus: "unknown" };
  }

  if (evidenceList.length === 0) {
    return { videoEvidenceStatus: "not_found" };
  }

  const sceneEventType = inferSceneEventTypeForOverwolf(scene);
  const candidates = evidenceList
    .map((evidence, index) => {
      const evidenceTimeSec = getEvidenceGameTimeSec(evidence);
      if (evidenceTimeSec === undefined) return null;
      return {
        evidence,
        index,
        deltaSeconds: Math.abs(sceneTimeSec - evidenceTimeSec),
        typeMatches: eventTypeMatches(sceneEventType, evidence.sourceEvent?.type),
      };
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> =>
      Boolean(candidate)
    )
    .sort((left, right) => {
      if (left.deltaSeconds !== right.deltaSeconds) {
        return left.deltaSeconds - right.deltaSeconds;
      }
      if (left.typeMatches !== right.typeMatches) {
        return left.typeMatches ? -1 : 1;
      }
      return left.index - right.index;
    });

  if (candidates.length === 0) {
    return { videoEvidenceStatus: "unknown" };
  }

  const bestTypeMatch = candidates.find(
    (candidate) =>
      candidate.typeMatches && candidate.deltaSeconds <= looseWindowSec
  );
  const best = bestTypeMatch ?? candidates[0];

  if (best.deltaSeconds > looseWindowSec) {
    return { videoEvidenceStatus: "misaligned" };
  }

  const toleranceSecUsed = best.deltaSeconds <= strictWindowSec ? 10 : 30;
  return {
    videoEvidenceStatus: "attached",
    videoEvidence: {
      ...best.evidence,
      confidence:
        best.evidence.confidence === "unconfirmed"
          ? "unconfirmed"
          : toleranceSecUsed === 10
            ? "confirmed"
            : "likely",
      alignment: {
        status: "aligned",
        deltaSeconds: best.deltaSeconds,
        matchedOverwolfEventId: best.evidence.sourceEvent?.id,
        toleranceSecUsed,
        confidence:
          best.evidence.confidence === "unconfirmed"
            ? "unconfirmed"
            : toleranceSecUsed === 10
              ? "confirmed"
              : "likely",
        reasonKo:
          toleranceSecUsed === 10
            ? "자동 장면 시간과 Overwolf 클립 시간이 10초 이내로 가까운 영상 근거 후보입니다."
            : "자동 장면 시간과 Overwolf 클립 시간이 30초 이내로 가까운 영상 근거 후보입니다. 같은 장면인지는 추가 확인이 필요합니다.",
      },
      noteKo: buildAttachedNoteKo(best.deltaSeconds, sceneEventType),
    },
  };
}

export function attachOverwolfEvidenceToRankedScenes<
  TScene extends RankedReviewScene,
>(
  scenes: TScene[],
  overwolfPackage?: OverwolfCapturePackage | null,
  options: AttachOptions = {}
): RankedSceneWithVideoEvidence<TScene>[] {
  const evidenceList = overwolfPackage
    ? mapOverwolfPackageToSceneVideoEvidence(overwolfPackage)
    : [];

  return scenes.map((scene) => {
    const attachment = findBestVideoEvidenceForScene(
      scene,
      evidenceList,
      options
    );

    return {
      ...scene,
      ...attachment,
    };
  });
}

function getEvidenceGameTimeSec(
  evidence: SceneVideoEvidence
): number | undefined {
  return finiteNumber(evidence.sourceEvent?.estimatedGameTimeSec);
}

function eventTypeMatches(
  sceneType: OverwolfCaptureEventType | "unknown",
  evidenceType: OverwolfCaptureEventType | undefined
) {
  if (sceneType === "unknown" || !evidenceType) return false;
  if (sceneType === evidenceType) return true;
  return sceneType === "kill" && evidenceType === "solo_kill";
}

function buildAttachedNoteKo(
  deltaSeconds: number,
  sceneEventType: OverwolfCaptureEventType | "unknown"
) {
  const base =
    deltaSeconds <= DEFAULT_STRICT_WINDOW_SEC
      ? "자동 복기 장면 근처에서 저장된 Overwolf 클립입니다."
      : "자동 복기 장면과 가까운 시간대의 Overwolf 클립입니다.";

  if (sceneEventType === "unknown") {
    return `${base} 장면 유형은 확정하지 말고 시간상 가까운 영상 근거로만 참고해야 합니다.`;
  }

  return `${base} 이 클립은 코칭 판정을 확정하지 않고 장면 확인용 근거로만 사용해야 합니다.`;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}
