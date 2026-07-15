import type {
  ImprovementCandidate,
  ImprovementCategory,
  NextGameGoal,
  RecurringPatternCandidate,
  SceneCoachingReview,
} from "@/types/coachingFeedback";

type NextGameGoalSelectorInput = {
  recurringPatterns?: RecurringPatternCandidate[];
  improvementCandidates?: ImprovementCandidate[];
  sceneReviews?: SceneCoachingReview[];
};

type GoalTemplate = {
  goalKo: string;
  triggerKo: string;
  successConditionKo: string;
};

const CATEGORY_GOAL_TEMPLATES: Record<ImprovementCategory, GoalTemplate> = {
  post_kill_conversion: {
    goalKo:
      "다음 판에는 킬을 만든 뒤 5초 안에 웨이브/귀환/시야 중 하나를 선택하세요.",
    triggerKo: "킬을 딴 뒤",
    successConditionKo:
      "5초 안에 웨이브, 귀환, 시야 중 하나를 선택하고 바로 실행합니다.",
  },
  jungle_tracking: {
    goalKo:
      "다음 판에는 상대 정글 위치가 보이지 않을 때 시야 없는 방향으로 길게 압박하지 마세요.",
    triggerKo: "상대 정글 위치가 안 보일 때",
    successConditionKo:
      "압박 전에 강가 시야, 정글 위치, 아군 커버 중 하나를 확인합니다.",
  },
  objective_setup: {
    goalKo:
      "다음 판에는 오브젝트 60초 전 미드 웨이브를 먼저 정리하고 움직이세요.",
    triggerKo: "오브젝트 60초 전",
    successConditionKo: "미드 웨이브를 먼저 박고 리콜/시야/합류 중 하나를 선택합니다.",
  },
  fight_direction: {
    goalKo:
      "다음 판에는 교전을 이어가기 전에 우리 정글/서폿 커버 쪽인지 먼저 확인하세요.",
    triggerKo: "교전을 계속 이어가기 전",
    successConditionKo: "내가 움직이는 방향이 아군 커버 쪽인지 한 번 확인합니다.",
  },
  recall_timing: {
    goalKo:
      "다음 판에는 큰 이득을 만든 뒤 다음 웨이브 전에 귀환 가능 여부를 먼저 판단하세요.",
    triggerKo: "큰 이득을 만든 직후",
    successConditionKo: "다음 웨이브 전에 귀환, 플레이트, 시야 중 하나를 선택합니다.",
  },
  vision_timing: {
    goalKo:
      "다음 판에는 강가로 움직이기 전 와드/상대 위치 정보가 있는지 먼저 확인하세요.",
    triggerKo: "강가나 안 보이는 곳으로 움직이기 전",
    successConditionKo: "와드, 상대 위치 정보, 아군 커버 중 하나가 있을 때만 들어갑니다.",
  },
  wave_management: {
    goalKo:
      "다음 판에는 움직이기 전 미드 웨이브를 먼저 박거나 손실이 적은 상태인지 확인하세요.",
    triggerKo: "라인을 밀고 움직이기 전",
    successConditionKo: "미드 웨이브를 먼저 박거나 놓치는 CS가 적은 상태에서 움직입니다.",
  },
  roam_timing: {
    goalKo:
      "다음 판에는 로밍 전에 미드 웨이브가 상대 타워 쪽으로 들어가는지 확인하세요.",
    triggerKo: "로밍을 시작하기 전",
    successConditionKo: "미드 웨이브가 상대 타워 쪽으로 들어가는 것을 확인하고 움직입니다.",
  },
  death_avoidance: {
    goalKo:
      "다음 판에는 큰 손해가 날 수 있는 교전 전에 상대 정글/스펠 정보를 한 번 더 확인하세요.",
    triggerKo: "큰 손해가 날 수 있는 교전 전",
    successConditionKo: "상대 정글 위치 또는 핵심 스펠 상태를 하나 이상 확인합니다.",
  },
  unknown: {
    goalKo: "다음 판에는 가장 위험했던 장면 하나를 골라 판단 근거를 먼저 확인하세요.",
    triggerKo: "게임이 끝난 직후",
    successConditionKo: "장면 하나를 고르고 보이는 사실과 추정을 나누어 기록합니다.",
  },
};

function hasEvidenceSceneIds(value: { evidenceSceneIds: string[] }) {
  return Array.isArray(value.evidenceSceneIds) && value.evidenceSceneIds.length > 0;
}

function byPatternPriority(
  left: RecurringPatternCandidate,
  right: RecurringPatternCandidate
) {
  return (
    right.occurrenceCount - left.occurrenceCount ||
    right.evidenceSceneIds.length - left.evidenceSceneIds.length ||
    left.id.localeCompare(right.id)
  );
}

function severityRank(severity: ImprovementCandidate["severity"]) {
  if (severity === "high") return 3;
  if (severity === "medium") return 2;
  return 1;
}

function byImprovementPriority(
  left: ImprovementCandidate,
  right: ImprovementCandidate
) {
  return (
    severityRank(right.severity) - severityRank(left.severity) ||
    right.repeatScore - left.repeatScore ||
    left.id.localeCompare(right.id)
  );
}

function goalFromCategory(
  category: ImprovementCategory,
  basedOn: NextGameGoal["basedOn"]
): NextGameGoal {
  const template = CATEGORY_GOAL_TEMPLATES[category] ?? CATEGORY_GOAL_TEMPLATES.unknown;

  return {
    ...template,
    basedOn,
  };
}

function categoryFromSceneReview(
  sceneReview: SceneCoachingReview
): ImprovementCategory {
  switch (sceneReview.sceneType) {
    case "post_kill_conversion":
      return "post_kill_conversion";
    case "jungle_collapse":
      return "jungle_tracking";
    case "objective_setup":
      return "objective_setup";
    case "wave_loss":
      return "wave_management";
    case "recall_timing":
      return "recall_timing";
    case "vision_timing":
      return "vision_timing";
    case "roam_timing":
    case "support_roam":
      return "roam_timing";
    case "death":
      return "death_avoidance";
    default:
      return "unknown";
  }
}

function selectRecurringPattern(
  recurringPatterns: RecurringPatternCandidate[]
) {
  return [...recurringPatterns]
    .filter(hasEvidenceSceneIds)
    .sort(byPatternPriority)[0];
}

function selectImprovementCandidate(
  improvementCandidates: ImprovementCandidate[]
) {
  return [...improvementCandidates]
    .filter(hasEvidenceSceneIds)
    .sort(byImprovementPriority)[0];
}

function selectSceneReview(sceneReviews: SceneCoachingReview[]) {
  return sceneReviews.find(
    (sceneReview) =>
      sceneReview.sceneId &&
      (sceneReview.nextActionKo?.trim() || sceneReview.correctionKo?.trim())
  );
}

export function selectNextGameGoal(
  input: NextGameGoalSelectorInput
): NextGameGoal {
  const recurringPattern = selectRecurringPattern(input.recurringPatterns ?? []);
  if (recurringPattern) {
    return goalFromCategory(recurringPattern.category, {
      sceneIds: recurringPattern.evidenceSceneIds,
      recurringPatternId: recurringPattern.id,
    });
  }

  const improvementCandidate = selectImprovementCandidate(
    input.improvementCandidates ?? []
  );
  if (improvementCandidate) {
    return goalFromCategory(improvementCandidate.category, {
      sceneIds: improvementCandidate.evidenceSceneIds,
      improvementCandidateId: improvementCandidate.id,
    });
  }

  const sceneReview = selectSceneReview(input.sceneReviews ?? []);
  if (sceneReview) {
    return goalFromCategory(categoryFromSceneReview(sceneReview), {
      sceneIds: [sceneReview.sceneId],
    });
  }

  return goalFromCategory("unknown", {
    sceneIds: [],
  });
}

export { CATEGORY_GOAL_TEMPLATES };
