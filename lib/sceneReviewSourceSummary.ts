export type SceneReviewSourceState = {
  hasManualInput: boolean;
  hasVideoDraft: boolean;
  isVideoDraftApplied: boolean;
  hasRiotEvidence: boolean;
  isRiotEvidenceConnected: boolean;
};

export type SceneReviewSourceSummary = {
  manualStatusKo: string;
  videoStatusKo: string;
  riotStatusKo: string;
  overallStatusKo: string;
  connectedSourceBadges: string[];
};

export function buildSceneReviewSourceSummary(
  state: SceneReviewSourceState
): SceneReviewSourceSummary {
  const manualStatusKo = state.hasManualInput
    ? "수동 입력 기준"
    : "수동 입력 대기 중";
  const videoStatusKo = state.isVideoDraftApplied
    ? "영상 초안 적용됨"
    : state.hasVideoDraft
      ? "영상 초안 생성됨"
      : "영상 초안 없음";
  const riotStatusKo = state.isRiotEvidenceConnected
    ? "Riot 근거 연결됨"
    : state.hasRiotEvidence
      ? "Riot 근거 불러옴"
      : "Riot 근거 없음";

  const connectedSourceBadges = [
    state.hasManualInput ? "수동 입력" : null,
    state.hasVideoDraft ? "영상 초안" : null,
    state.hasRiotEvidence ? "Riot 근거" : null,
  ].filter((badge): badge is string => Boolean(badge));

  return {
    manualStatusKo,
    videoStatusKo,
    riotStatusKo,
    overallStatusKo: buildOverallStatus(state),
    connectedSourceBadges: Array.from(new Set(connectedSourceBadges)),
  };
}

function buildOverallStatus(state: SceneReviewSourceState) {
  if (
    state.hasManualInput &&
    (state.isVideoDraftApplied || state.isRiotEvidenceConnected)
  ) {
    return "수동 입력에 영상/Riot 보조 근거가 연결된 상태입니다.";
  }
  if (state.isVideoDraftApplied) {
    return "영상 초안이 수동 입력에 적용되어 있습니다.";
  }
  if (state.hasVideoDraft && state.hasRiotEvidence) {
    return "영상 초안과 Riot 근거를 참고해 수동 복기 입력을 정리할 수 있습니다.";
  }
  if (state.hasVideoDraft) {
    return "영상 초안이 준비되었습니다. 수동 입력에 참고할 수 있습니다.";
  }
  if (state.hasRiotEvidence) {
    return "Riot 경기 기록을 불러왔습니다. 수동 입력의 근거로 참고할 수 있습니다.";
  }
  if (state.hasManualInput) {
    return "수동 입력만으로 복기 장면을 생성합니다.";
  }
  return "수동 입력을 시작하면 복기 장면을 생성할 수 있습니다.";
}
