import type { CaptureSessionStatus } from "@/types/captureSession";
import type {
  ReviewReadinessCard,
  ReviewReadinessSource,
  ReviewReadinessStatus,
} from "@/types/reviewReadiness";

export type ReviewReadinessResolverInput = {
  hasRiotReport?: boolean;
  hasVideoEvidence?: boolean;
  captureSessionStatus?: CaptureSessionStatus;
  matchInferenceStatus?: "confirmed" | "likely" | "unknown";
  hasCapturePackage?: boolean;
  hasCaptureValidationIssues?: boolean;
};

export type ReviewReadinessResolverResult = {
  status: ReviewReadinessStatus;
  source: ReviewReadinessSource;
  titleKo: string;
  descriptionKo: string;
  evidenceLabelKo: string;
  reasonsKo: string[];
  warningsKo: string[];
};

export function resolveReviewReadiness(
  input: ReviewReadinessResolverInput
): ReviewReadinessResolverResult {
  if (input.hasRiotReport && input.hasVideoEvidence) {
    return {
      status: "video_ready",
      source: "riot_video",
      titleKo: "영상 근거 있음",
      descriptionKo:
        "Riot 경기 리포트와 근처 영상 근거가 함께 준비된 상태입니다.",
      evidenceLabelKo: "근거 상태 · Riot + 영상 근거",
      reasonsKo: [
        "Riot 기반 리포트가 준비되었습니다.",
        "장면 근처의 영상 근거도 연결되어 있습니다.",
      ],
      warningsKo: [],
    };
  }

  if (input.hasRiotReport) {
    return {
      status: "riot_ready",
      source: "riot",
      titleKo: "리포트 준비됨",
      descriptionKo:
        "Riot 경기 기록을 기반으로 먼저 볼 장면과 다음 판 목표를 확인할 수 있습니다.",
      evidenceLabelKo: "근거 상태 · Riot 경기 기록",
      reasonsKo: ["Riot 기반 리포트가 준비되었습니다."],
      warningsKo: input.hasVideoEvidence
        ? []
        : ["영상 근거는 아직 연결되지 않았습니다."],
    };
  }

  if (input.matchInferenceStatus === "unknown") {
    return {
      status: "match_inference_needed",
      source: "overwolf_inference",
      titleKo: "확인 필요",
      descriptionKo:
        "수집된 영상 근거가 어느 Riot 경기와 연결되는지 아직 확정할 수 없습니다.",
      evidenceLabelKo: "근거 상태 · 매치 후보 추정",
      reasonsKo: ["매치 후보를 확정하기 위한 추가 확인이 필요합니다."],
      warningsKo: [
        "경기 후보가 불확실해 영상 근거를 바로 연결하지 않았습니다.",
      ],
    };
  }

  if (input.captureSessionStatus === "rejected") {
    return {
      status: "riot_fallback",
      source: "fallback",
      titleKo: "Riot 리포트 제공",
      descriptionKo:
        "수집 패키지를 사용할 수 없어 Riot 경기 기록 기반 리포트로 대체합니다.",
      evidenceLabelKo: "근거 상태 · Riot-only fallback",
      reasonsKo: ["영상 수집 패키지가 검증을 통과하지 못했습니다."],
      warningsKo: [
        "수집 패키지를 사용할 수 없어 Riot 기록 기반 리포트로 대체합니다.",
      ],
    };
  }

  if (input.hasCapturePackage) {
    return {
      status: "match_inference_needed",
      source: "overwolf_inference",
      titleKo: "확인 필요",
      descriptionKo:
        "수집 데이터는 있지만 아직 Riot 리포트가 준비되지 않았습니다.",
      evidenceLabelKo: "근거 상태 · 매치 후보 추정",
      reasonsKo: [
        input.matchInferenceStatus === "confirmed"
          ? "매치 후보는 강하게 추정되지만 리포트 생성은 아직 완료되지 않았습니다."
          : input.matchInferenceStatus === "likely"
            ? "시간대가 가까운 매치 후보가 있지만 리포트 생성은 아직 완료되지 않았습니다."
            : "수집 데이터가 있지만 연결할 Riot 리포트가 아직 없습니다.",
      ],
      warningsKo: input.hasCaptureValidationIssues
        ? ["수집 데이터에 검증 이슈가 있어 바로 리포트로 연결하지 않았습니다."]
        : [],
    };
  }

  return {
    status: "riot_fallback",
    source: "fallback",
    titleKo: "Riot 리포트 제공",
    descriptionKo:
      "영상 근거가 없어도 Riot 경기 기록 기반 리포트를 먼저 제공할 수 있습니다.",
    evidenceLabelKo: "근거 상태 · Riot 경기 기록",
    reasonsKo: ["아직 연결된 영상 수집 데이터가 없습니다."],
    warningsKo: [],
  };
}

export function resolveReviewReadinessCard(
  input: ReviewReadinessResolverInput
): ReviewReadinessCard {
  const resolved = resolveReviewReadiness(input);

  return {
    id: resolved.status,
    titleKo: resolved.titleKo,
    eyebrowKo: sourceToEyebrowKo(resolved.source),
    source: resolved.source,
    statusLabelKo: resolved.titleKo,
    descriptionKo: resolved.descriptionKo,
    evidenceLabelKo: resolved.evidenceLabelKo,
    ctaKo: resolved.status === "match_inference_needed" ? "매치 후보 확인" : undefined,
    isActionable: resolved.status !== "riot_fallback",
  };
}

function sourceToEyebrowKo(source: ReviewReadinessSource) {
  switch (source) {
    case "riot_video":
      return "Riot + 영상";
    case "riot":
      return "Riot 기록";
    case "overwolf_inference":
      return "매치 연결";
    case "fallback":
      return "대체 경로";
  }
}
