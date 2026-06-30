import type {
  AutoSceneConfidence,
  AutoSceneGroupType,
  EliminationPatternResult,
} from "@/types/autoScene";
import type { HabitPatternAnalysis } from "@/types/history";

export type ReviewInsightSource =
  | "manual_history"
  | "automation_preview"
  | "combined";

export type ReviewInsightSummary = {
  source: ReviewInsightSource;
  primaryHabitKo: string;
  whyThisFirstKo: string;
  nextGameGoalKo: string;
  supportingCandidatesKo: string[];
  cautionKo: string;
};

export type ReviewInsightManualPattern = {
  labelKo: string;
  count: number;
  total: number;
};

type BuildReviewInsightSummaryInput = {
  manualPatterns?: ReviewInsightManualPattern[];
  automationResults?: EliminationPatternResult[];
};

const FALLBACK_SUMMARY: ReviewInsightSummary = {
  source: "automation_preview",
  primaryHabitKo: "반복되는 판단 습관을 확인하는 중입니다.",
  whyThisFirstKo:
    "아직 충분한 복기 기록이 없어 샘플 기준으로 우선 후보를 보여줍니다.",
  nextGameGoalKo: "다음 판에서 같은 장면의 교전 조건을 하나만 먼저 확인하기.",
  supportingCandidatesKo: [],
  cautionKo:
    "복기 기록이 쌓이면 더 정확한 반복 후보를 보여줄 수 있습니다.",
};

const CONFIDENCE_RANK: Record<AutoSceneConfidence, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const GROUP_COPY: Record<
  AutoSceneGroupType,
  {
    primaryHabitKo: string;
    chipKo: string;
    shortKo: string;
    manualKeywords: string[];
    manualGoalKo: string;
  }
> = {
  push_gank_like: {
    primaryHabitKo: "강가/정글 위치 확인 없이 압박하는 판단",
    chipKo: "시야 없는 압박",
    shortKo: "푸시 중 정글 개입",
    manualKeywords: ["강가", "시야", "정글", "압박"],
    manualGoalKo:
      "상대 정글 위치가 확인되기 전까지 시야 없는 쪽으로 압박하지 않기.",
  },
  no_flash_fight_like: {
    primaryHabitKo: "점멸 없는 상태에서 교전하는 판단",
    chipKo: "점멸 없는 교전",
    shortKo: "점멸 없는 교전",
    manualKeywords: ["점멸", "생존기"],
    manualGoalKo:
      "점멸이 없을 때는 먼저 교전하지 않고 아군 커버를 확인하기.",
  },
  solo_kill_conversion_like: {
    primaryHabitKo: "솔킬 이후 이득 전환이 흔들리는 판단",
    chipKo: "솔킬 후 전환",
    shortKo: "솔킬 후 이득 전환",
    manualKeywords: ["솔킬", "이득", "플레이트", "골드", "전환"],
    manualGoalKo:
      "킬 이후 웨이브, 리콜, 플레이트 중 하나만 먼저 선택하기.",
  },
  objective_setup_like: {
    primaryHabitKo: "오브젝트 전 준비 타이밍이 늦어지는 판단",
    chipKo: "오브젝트 전 준비",
    shortKo: "오브젝트 전 준비",
    manualKeywords: ["오브젝트", "용", "전령", "바론", "준비"],
    manualGoalKo:
      "오브젝트 60초 전 라인 주도권과 귀환 타이밍 확인하기.",
  },
  support_roam_collapse_like: {
    primaryHabitKo: "상대 서포터 로밍 가능성을 놓치는 판단",
    chipKo: "서포터 로밍",
    shortKo: "서포터 로밍 합류",
    manualKeywords: ["서포터", "로밍", "커버"],
    manualGoalKo: "교전 전 상대 서포터 위치와 아군 커버를 확인하기.",
  },
  unsafe_warding_like: {
    primaryHabitKo: "시야 없는 공간에 먼저 들어가는 판단",
    chipKo: "위험한 시야 작업",
    shortKo: "위험한 시야 작업",
    manualKeywords: ["와드", "시야", "안전"],
    manualGoalKo: "와드하기 전 아군 위치와 빠질 경로를 먼저 확인하기.",
  },
  information_gathering_failure_like: {
    primaryHabitKo: "필요한 정보를 확인하지 않고 움직이는 판단",
    chipKo: "정보 확인 부족",
    shortKo: "정보 확인 부족",
    manualKeywords: ["정보", "확인", "위치"],
    manualGoalKo: "움직이기 전 적 위치 정보 하나를 먼저 확인하기.",
  },
  wave_management_error_like: {
    primaryHabitKo: "웨이브 상태를 정리하지 못한 채 움직이는 판단",
    chipKo: "웨이브 관리",
    shortKo: "웨이브 관리",
    manualKeywords: ["웨이브", "라인", "크래시"],
    manualGoalKo: "이동 전 웨이브가 밀리는지 당겨지는지 먼저 확인하기.",
  },
  resource_management_error_like: {
    primaryHabitKo: "체력/마나/쿨다운이 부족한 상태에서 이어가는 판단",
    chipKo: "자원 관리",
    shortKo: "자원 관리",
    manualKeywords: ["체력", "마나", "쿨다운", "자원"],
    manualGoalKo: "교전 전 체력과 핵심 쿨다운을 먼저 확인하기.",
  },
  tempo_loss_like: {
    primaryHabitKo: "이득 이후 템포 전환이 늦어지는 판단",
    chipKo: "템포 전환",
    shortKo: "템포 전환",
    manualKeywords: ["템포", "귀환", "리콜", "전환"],
    manualGoalKo: "이득 이후 바로 귀환, 웨이브, 시야 중 하나를 선택하기.",
  },
  blind_roaming_like: {
    primaryHabitKo: "정보 없이 로밍을 시작하는 판단",
    chipKo: "정보 없는 로밍",
    shortKo: "정보 없는 로밍",
    manualKeywords: ["로밍", "이동", "합류"],
    manualGoalKo: "로밍 전 강가 시야와 상대 미드 위치를 먼저 확인하기.",
  },
};

function rankAutomationResults(results: EliminationPatternResult[]) {
  return [...results].sort(
    (left, right) =>
      CONFIDENCE_RANK[right.confidence] - CONFIDENCE_RANK[left.confidence] ||
      right.sceneCount - left.sceneCount
  );
}

export function mapHabitPatternsToReviewInsightManualPatterns(
  habitAnalysis: HabitPatternAnalysis
): ReviewInsightManualPattern[] {
  return habitAnalysis.repeatedPatterns.map((pattern) => ({
    labelKo: pattern.label,
    count: pattern.count,
    total: habitAnalysis.recentSceneCount,
  }));
}

function rankManualPatterns(patterns: ReviewInsightManualPattern[]) {
  return [...patterns].sort(
    (left, right) =>
      right.count - left.count ||
      right.total - left.total ||
      left.labelKo.localeCompare(right.labelKo)
  );
}

function normalizeNextGameGoal(goal: string) {
  return goal
    .replace(/^다음\s*(게임|판)(에서는|에는)?\s*/, "")
    .replace(/^다음\s*(게임|판)\s*/, "")
    .replace(/^\?ㅼ쓬\s+\S+\s*/, "")
    .trim();
}

function groupCopy(groupType: AutoSceneGroupType) {
  return GROUP_COPY[groupType] ?? GROUP_COPY.information_gathering_failure_like;
}

function matchingGroupForManualLabel(labelKo: string) {
  if (
    ["강가", "시야", "정글", "압박"].some((keyword) =>
      labelKo.includes(keyword)
    )
  ) {
    return "push_gank_like";
  }
  if (["점멸", "생존기"].some((keyword) => labelKo.includes(keyword))) {
    return "no_flash_fight_like";
  }
  if (
    ["솔킬", "이득", "플레이트", "골드", "전환"].some((keyword) =>
      labelKo.includes(keyword)
    )
  ) {
    return "solo_kill_conversion_like";
  }
  if (
    ["오브젝트", "용", "전령", "바론", "준비"].some((keyword) =>
      labelKo.includes(keyword)
    )
  ) {
    return "objective_setup_like";
  }

  return Object.entries(GROUP_COPY).find(([, copy]) =>
    copy.manualKeywords.some((keyword) => labelKo.includes(keyword))
  )?.[0] as AutoSceneGroupType | undefined;
}

function manualGoalForLabel(labelKo: string) {
  const groupType = matchingGroupForManualLabel(labelKo);
  return groupType
    ? groupCopy(groupType).manualGoalKo
    : "다음 판에서 같은 장면의 교전 조건을 하나만 먼저 확인하기.";
}

function uniqueLimited(values: string[], limit: number) {
  return Array.from(new Set(values.filter(Boolean))).slice(0, limit);
}

function supportingCandidates({
  automationResults,
  primaryGroupType,
  manualPatterns,
}: {
  automationResults: EliminationPatternResult[];
  primaryGroupType?: AutoSceneGroupType;
  manualPatterns: ReviewInsightManualPattern[];
}) {
  const automationChips = automationResults
    .filter((result) => result.groupType !== primaryGroupType)
    .map((result) => groupCopy(result.groupType).chipKo);
  const manualChips = manualPatterns.map((pattern) => pattern.labelKo);
  return uniqueLimited([...automationChips, ...manualChips], 3);
}

export function buildReviewInsightSummary({
  manualPatterns = [],
  automationResults = [],
}: BuildReviewInsightSummaryInput): ReviewInsightSummary {
  const rankedManualPatterns = rankManualPatterns(manualPatterns);
  const rankedAutomationResults = rankAutomationResults(automationResults);
  const topManualPattern = rankedManualPatterns[0];
  const topAutomationResult = rankedAutomationResults[0];

  if (!topManualPattern && !topAutomationResult) {
    return FALLBACK_SUMMARY;
  }

  if (topManualPattern && topAutomationResult) {
    const matchedManualGroupType = matchingGroupForManualLabel(
      topManualPattern.labelKo
    );
    if (matchedManualGroupType === topAutomationResult.groupType) {
      const copy = groupCopy(topAutomationResult.groupType);
      return {
        source: "combined",
        primaryHabitKo: copy.primaryHabitKo,
        whyThisFirstKo: `최근 수동 복기에서는 ${topManualPattern.labelKo} 문제가 반복됐고, 자동화 샘플에서도 ${copy.shortKo} 후보가 함께 잡혔습니다.`,
        nextGameGoalKo: normalizeNextGameGoal(topAutomationResult.nextGameGoalKo),
        supportingCandidatesKo: supportingCandidates({
          automationResults: rankedAutomationResults,
          primaryGroupType: topAutomationResult.groupType,
          manualPatterns: rankedManualPatterns.slice(1),
        }),
        cautionKo:
          "수동 기록과 자동화 샘플을 함께 본 1차 후보이며, 실제 시야/웨이브는 영상 확인이 필요합니다.",
      };
    }
  }

  if (topAutomationResult) {
    const copy = groupCopy(topAutomationResult.groupType);
    return {
      source: "automation_preview",
      primaryHabitKo: copy.primaryHabitKo,
      whyThisFirstKo: `자동화 샘플에서 ${copy.shortKo} 후보가 가장 강하게 잡혔습니다.`,
      nextGameGoalKo: normalizeNextGameGoal(topAutomationResult.nextGameGoalKo),
      supportingCandidatesKo: supportingCandidates({
        automationResults: rankedAutomationResults,
        primaryGroupType: topAutomationResult.groupType,
        manualPatterns: rankedManualPatterns,
      }),
      cautionKo:
        "자동화 분석은 아직 샘플 Preview이며, 실제 경기 분석은 Riot/영상 연결 이후 적용됩니다.",
    };
  }

  const manualGoalKo = manualGoalForLabel(topManualPattern.labelKo);
  return {
    source: "manual_history",
    primaryHabitKo: topManualPattern.labelKo,
    whyThisFirstKo: `최근 수동 복기 기록에서 ${topManualPattern.labelKo} 패턴이 가장 자주 반복됐습니다.`,
    nextGameGoalKo: manualGoalKo,
    supportingCandidatesKo: uniqueLimited(
      rankedManualPatterns.slice(1).map((pattern) => pattern.labelKo),
      3
    ),
    cautionKo:
      "최근 입력 기록 기준 후보이며, 더 많은 복기 기록이 쌓이면 정확도가 달라질 수 있습니다.",
  };
}
