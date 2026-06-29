import type {
  AutoSceneConfidence,
  AutoSceneGroupType,
  AutoSceneEvidenceCertainty,
  EliminatedFactor,
  EliminationPatternResult,
  PlayerTierGroup,
  SimilarSceneCommonFactor,
  SimilarSceneGroup,
  TierAdjustedPatternSignal,
  TierEvidenceRequirement,
} from "@/types/autoScene";
import {
  getTierConfidenceRule,
  getTierCriteria,
  getTierNextGameGoalTemplate,
} from "@/lib/riot/tierAwarePatternCriteria";

export const P0_ELIMINATION_GROUP_TYPES = [
  "push_gank_like",
  "no_flash_fight_like",
  "solo_kill_conversion_like",
  "objective_setup_like",
] as const satisfies readonly AutoSceneGroupType[];

const CONFIDENCE_RANK: Record<AutoSceneConfidence, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

const PRIMARY_PATTERN_KO: Record<(typeof P0_ELIMINATION_GROUP_TYPES)[number], string> = {
  push_gank_like: "미드 푸시 중 정글 개입/갱킹에 노출되는 반복 후보",
  no_flash_fight_like: "점멸/생존기 없는 상태에서 교전하는 반복 후보",
  solo_kill_conversion_like: "솔로킬 이후 이득 전환이 흔들리는 반복 후보",
  objective_setup_like: "오브젝트 전 준비 타이밍에 손해가 나는 반복 후보",
};

const FALLBACK_NEXT_GOAL_KO: Record<(typeof P0_ELIMINATION_GROUP_TYPES)[number], string> = {
  push_gank_like:
    "다음 게임에서는 라인을 밀기 전에 상대 정글 위치와 강가 시야를 먼저 확인하세요.",
  no_flash_fight_like:
    "다음 게임에서는 점멸/생존기가 없을 때 먼저 교전하지 않는 것을 1순위 목표로 두세요.",
  solo_kill_conversion_like:
    "다음 게임에서는 솔로킬 이후 웨이브를 정리하고 귀환/플레이트/시야 중 하나만 선택하세요.",
  objective_setup_like:
    "다음 게임에서는 오브젝트 60초 전 미드 라인 상태와 귀환 타이밍을 먼저 확인하세요.",
};

function isP0GroupType(
  groupType: AutoSceneGroupType
): groupType is (typeof P0_ELIMINATION_GROUP_TYPES)[number] {
  return P0_ELIMINATION_GROUP_TYPES.includes(
    groupType as (typeof P0_ELIMINATION_GROUP_TYPES)[number]
  );
}

function normalizeCertainty(
  certainty: AutoSceneEvidenceCertainty
): AutoSceneEvidenceCertainty {
  return certainty === "confirmed_by_riot" ? "inferred_from_timeline" : certainty;
}

function scoreFactorConfidence({
  count,
  ratio,
  sceneCount,
  strongThreshold,
  mediumThreshold,
}: {
  count: number;
  ratio: number;
  sceneCount: number;
  strongThreshold: number;
  mediumThreshold: number;
}): AutoSceneConfidence {
  const strongRequired = Math.min(strongThreshold, sceneCount);
  const mediumRequired = Math.min(mediumThreshold, sceneCount);
  if (count >= strongRequired && ratio >= 0.75) return "high";
  if (count >= mediumRequired && ratio >= 0.5) return "medium";
  return "low";
}

function tierPriorityForFactor(
  factor: SimilarSceneCommonFactor,
  priorityFactors: string[]
) {
  const text = `${factor.labelKo} ${(factor.relatedRiskTags ?? []).join(" ")}`.toLowerCase();
  const priorityMatches = priorityFactors.filter((priority) => {
    const normalized = priority.toLowerCase();
    return (
      text.includes(normalized) ||
      normalized.split("_").some((part) => part.length > 4 && text.includes(part))
    );
  });
  return priorityMatches.length;
}

function adjustedSignal({
  factor,
  sceneCount,
  confidence,
  tierPriority,
  evidenceRequirement,
}: {
  factor: SimilarSceneCommonFactor;
  sceneCount: number;
  confidence: AutoSceneConfidence;
  tierPriority: number;
  evidenceRequirement: TierEvidenceRequirement;
}): TierAdjustedPatternSignal {
  return {
    factorLabelKo: factor.labelKo,
    tierPriority,
    adjustedConfidence: confidence,
    evidenceRequirement,
    reasonKo: `${sceneCount}개 장면 중 ${factor.count}개에서 반복된 근거 후보입니다. Riot timeline 기반 추론이며 영상/사용자 확인이 필요할 수 있습니다.`,
  };
}

function rankSignals(
  signals: TierAdjustedPatternSignal[],
  factorsByLabel: Map<string, SimilarSceneCommonFactor>
) {
  return [...signals].sort((left, right) => {
    const leftFactor = factorsByLabel.get(left.factorLabelKo);
    const rightFactor = factorsByLabel.get(right.factorLabelKo);
    return (
      CONFIDENCE_RANK[right.adjustedConfidence] -
        CONFIDENCE_RANK[left.adjustedConfidence] ||
      (rightFactor?.count ?? 0) - (leftFactor?.count ?? 0) ||
      (rightFactor?.ratio ?? 0) - (leftFactor?.ratio ?? 0) ||
      right.tierPriority - left.tierPriority ||
      left.factorLabelKo.localeCompare(right.factorLabelKo)
    );
  });
}

function buildEliminatedFactorFromVariable({
  variableFactor,
  sceneCount,
}: {
  variableFactor: string;
  sceneCount: number;
}): EliminatedFactor {
  let reasonKo = "장면마다 조건이 달라 단일 원인으로 확정하기 어렵습니다.";
  if (variableFactor.includes("챔피언")) {
    reasonKo = "특정 챔피언만의 문제로 단정하기 어렵습니다.";
  }
  if (variableFactor.includes("상대")) {
    reasonKo = "상대 챔피언이 달라 반복 원인을 상성 하나로 단정하기 어렵습니다.";
  }
  if (variableFactor.includes("경기")) {
    reasonKo = "여러 경기에서 반복된 후보라 한 경기의 우연으로만 보기 어렵습니다.";
  }
  if (variableFactor.includes("시간대")) {
    reasonKo = "발생 시간대가 달라 특정 분대 문제로만 보기 어렵습니다.";
  }

  return {
    labelKo: variableFactor,
    reasonKo,
    sceneCount,
    totalScenes: sceneCount,
  };
}

function buildCautionKo({
  criteriaCautionKo,
  evidenceRequirement,
}: {
  criteriaCautionKo: string;
  evidenceRequirement: TierEvidenceRequirement;
}) {
  const requirementKo =
    evidenceRequirement === "video_required"
      ? "이 패턴 후보는 영상/리플레이 확인이 필요합니다."
      : evidenceRequirement === "user_confirmation_required"
        ? "이 패턴 후보는 사용자 의도 확인이 필요합니다."
        : evidenceRequirement === "video_recommended"
          ? "Riot timeline 기준 후보이며 영상 확인을 권장합니다."
          : "Riot timeline 기준으로 우선 검토할 수 있습니다.";
  return `${criteriaCautionKo} ${requirementKo}`;
}

function nextGameGoalKo({
  tierGroup,
  groupType,
}: {
  tierGroup: PlayerTierGroup;
  groupType: (typeof P0_ELIMINATION_GROUP_TYPES)[number];
}) {
  return (
    getTierNextGameGoalTemplate(tierGroup, groupType)?.templateKo ??
    FALLBACK_NEXT_GOAL_KO[groupType]
  );
}

export function analyzeSimilarSceneGroup(
  group: SimilarSceneGroup,
  tierGroup: PlayerTierGroup
): EliminationPatternResult | undefined {
  if (!isP0GroupType(group.groupType)) return undefined;

  const criteria = getTierCriteria(tierGroup, group.groupType);
  if (!criteria) return undefined;

  const confidenceRule = getTierConfidenceRule(tierGroup);
  const sceneCount = group.scenes.length;
  const factorsByLabel = new Map(
    group.commonFactors.map((factor) => [factor.labelKo, factor])
  );
  const scoredSignals = group.commonFactors.map((factor) => {
    const confidence = scoreFactorConfidence({
      count: factor.count,
      ratio: factor.ratio,
      sceneCount,
      strongThreshold: confidenceRule.strongThreshold,
      mediumThreshold: confidenceRule.mediumThreshold,
    });
    return adjustedSignal({
      factor,
      sceneCount,
      confidence,
      tierPriority: tierPriorityForFactor(factor, criteria.priorityFactors),
      evidenceRequirement: criteria.evidenceRequirement,
    });
  });

  const rankedSignals = rankSignals(scoredSignals, factorsByLabel);
  const repeatedFactors = rankedSignals.filter(
    (signal) => signal.adjustedConfidence !== "low"
  );
  const primarySignal =
    repeatedFactors[0] ?? rankedSignals.find((signal) => signal.adjustedConfidence === "low");
  const resultConfidence = primarySignal?.adjustedConfidence ?? "low";
  const commonFactors = group.commonFactors
    .filter((factor) =>
      repeatedFactors.some((signal) => signal.factorLabelKo === factor.labelKo)
    )
    .map((factor) => ({
      labelKo: factor.labelKo,
      sceneCount: factor.count,
      totalScenes: sceneCount,
      evidenceCertainty: normalizeCertainty(factor.evidenceCertainty),
    }));
  const weakCommonFactors = group.commonFactors
    .filter(
      (factor) =>
        !repeatedFactors.some((signal) => signal.factorLabelKo === factor.labelKo)
    )
    .map((factor) => ({
      labelKo: factor.labelKo,
      reasonKo: "반복 빈도가 낮아 핵심 패턴으로 보기에는 추가 확인이 필요합니다.",
      sceneCount: factor.count,
      totalScenes: sceneCount,
    }));
  const variableEliminatedFactors = group.variableFactors.map((variableFactor) =>
    buildEliminatedFactorFromVariable({ variableFactor, sceneCount })
  );
  const cautionKo = buildCautionKo({
    criteriaCautionKo: criteria.cautionKo,
    evidenceRequirement: criteria.evidenceRequirement,
  });

  return {
    id: `elimination:${tierGroup}:${group.groupType}:${group.id}`,
    groupId: group.id,
    groupType: group.groupType,
    tierGroup,
    sceneCount,
    primaryPatternKo: PRIMARY_PATTERN_KO[group.groupType],
    confidence: resultConfidence,
    repeatedFactors,
    commonFactors,
    eliminatedFactors: [...weakCommonFactors, ...variableEliminatedFactors],
    nextGameGoalKo: nextGameGoalKo({ tierGroup, groupType: group.groupType }),
    evidenceRequirement: criteria.evidenceRequirement,
    cautionKo,
    reviewNoteKo: `${PRIMARY_PATTERN_KO[group.groupType]}입니다. Riot timeline 기준 반복 가능성을 본 것이며 최종 판단은 영상/사용자 확인이 필요합니다.`,
    trackingMetricKo: primarySignal
      ? `${primarySignal.factorLabelKo} 반복 빈도`
      : "반복 후보 빈도",
    source: "similar_scene_grouping",
  };
}

export function analyzeSimilarSceneGroups(
  groups: SimilarSceneGroup[],
  tierGroup: PlayerTierGroup
): EliminationPatternResult[] {
  return groups
    .map((group) => analyzeSimilarSceneGroup(group, tierGroup))
    .filter(
      (result): result is EliminationPatternResult => result !== undefined
    );
}
