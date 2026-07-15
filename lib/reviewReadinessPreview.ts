import type { ReviewReadinessCard } from "@/types/reviewReadiness";

export function getReviewReadinessPreviewCards(): ReviewReadinessCard[] {
  return [
    {
      id: "riot_ready",
      titleKo: "최근 경기 리포트 준비",
      eyebrowKo: "경기 종료 후",
      source: "riot",
      statusLabelKo: "리포트 준비됨",
      descriptionKo:
        "Riot 경기 기록만으로 대표 장면과 다음 판 목표를 먼저 확인할 수 있습니다.",
      evidenceLabelKo: "Riot 경기 기록",
      ctaKo: "리포트 확인",
      isActionable: true,
    },
    {
      id: "video_ready",
      titleKo: "영상 근거 연결",
      eyebrowKo: "클립 연결 완료",
      source: "riot_video",
      statusLabelKo: "영상 근거 있음",
      descriptionKo:
        "장면 시간과 영상 근거가 맞으면 해당 클립을 함께 보며 복기할 수 있습니다.",
      evidenceLabelKo: "Riot + 영상 근거",
      ctaKo: "영상 근거 확인",
      isActionable: true,
    },
    {
      id: "match_inference_needed",
      titleKo: "경기 매칭 확인 필요",
      eyebrowKo: "후보 추정 중",
      source: "overwolf_inference",
      statusLabelKo: "확인 필요",
      descriptionKo:
        "가까운 경기 후보가 여러 개면 영상 근거를 바로 붙이지 않고 확인 상태로 둡니다.",
      evidenceLabelKo: "매치 후보 추정",
      ctaKo: "매치 후보 확인",
      isActionable: true,
    },
    {
      id: "riot_fallback",
      titleKo: "Riot 기록 기반 리포트",
      eyebrowKo: "안전한 대체 경로",
      source: "fallback",
      statusLabelKo: "Riot 리포트 제공",
      descriptionKo:
        "영상 근거를 사용할 수 없어도 분석은 중단하지 않고 Riot 경기 기록 기반 리포트로 이어집니다.",
      evidenceLabelKo: "Riot 경기 기록",
      isActionable: false,
    },
  ];
}
