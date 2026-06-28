import {
  HABIT_PATTERNS,
  getMetricsForScenario,
  getSceneScenarioById,
} from "@/lib/coachingMetrics";
import type { SceneScenarioId } from "@/types/coachingMetrics";

export type SceneCandidate = {
  scenarioId: SceneScenarioId;
  confidence: "high" | "medium" | "low";
  matchedRiskTags: string[];
  boostingEvidence: string[];
  limitingFactors: string[];
  reasonKo: string;
};

export type SceneCandidateMappingResult = {
  scenarioCandidates: SceneCandidate[];
  candidateScenarioIds: SceneScenarioId[];
  candidateMetricIds: string[];
  candidateHabitPatternIds: string[];
  matchedRiskTags: string[];
  notes: string[];
};

type CandidateInput = {
  riskTags?: string[];
  scenarioType?: string;
  currentOutcome?: string;
  evidenceSummary?: unknown;
  derivedContext?: unknown;
};

type CandidateDraft = SceneCandidate;

const CONFIDENCE_RANK: Record<SceneCandidate["confidence"], number> = {
  low: 1,
  medium: 2,
  high: 3,
};

function uniq(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function stringifyEvidence(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(stringifyEvidence).join(" ");
  }
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .map(stringifyEvidence)
      .join(" ");
  }
  return "";
}

function makeContextText(input: CandidateInput) {
  return [
    input.scenarioType,
    input.currentOutcome,
    stringifyEvidence(input.evidenceSummary),
    stringifyEvidence(input.derivedContext),
  ]
    .join(" ")
    .toLowerCase();
}

function hasAnyText(contextText: string, patterns: string[]) {
  return patterns.some((pattern) => contextText.includes(pattern.toLowerCase()));
}

function hasKillOrAdvantageContext(input: CandidateInput, contextText: string) {
  const outcome = input.currentOutcome?.toLowerCase() ?? "";
  return (
    [
      "solo_kill",
      "fight_advantage",
      "forced_enemy_recall",
      "gained_lane_priority",
      "plate_or_cs_gain",
      "secured_objective",
      "objective_trade_gain",
    ].includes(outcome) ||
    hasAnyText(contextText, [
      "kill",
      "solo kill",
      "솔로킬",
      "킬",
      "처치",
      "advantage",
      "이득",
      "riot 이벤트: kill",
    ])
  );
}

function hasDeathOrLossContext(input: CandidateInput, contextText: string) {
  const outcome = input.currentOutcome?.toLowerCase() ?? "";
  return (
    [
      "death",
      "loss",
      "ganked_and_died",
      "died_while_warding",
      "objective_fight_loss",
      "survived_but_lost",
      "plate_or_cs_loss",
      "lost_lane_priority",
    ].includes(outcome) ||
    hasAnyText(contextText, [
      "death",
      "died",
      "loss",
      "사망",
      "죽",
      "손해",
      "riot 이벤트: death",
    ])
  );
}

function hasPushOrForwardContext(contextText: string) {
  return hasAnyText(contextText, [
    "push",
    "pushing",
    "forward",
    "overextend",
    "lane prio",
    "crash",
    "푸시",
    "전진",
    "앞",
    "상대 타워",
    "크래시",
    "주도권",
  ]);
}

function hasEnemyJungleInvolvement(contextText: string) {
  return hasAnyText(contextText, [
    "jungle",
    "jungler",
    "정글",
    "갱",
    "gank",
    "enemy jungle",
  ]);
}

function hasSupportInvolvement(contextText: string) {
  return hasAnyText(contextText, [
    "support",
    "서폿",
    "서포터",
    "roam",
    "로밍",
    "collapse",
    "합류",
    "붕괴",
    "appeared",
    "보임",
  ]);
}

function hasFightOrPositionContext(contextText: string) {
  return hasAnyText(contextText, [
    "fight",
    "trade",
    "position",
    "forward",
    "collapse",
    "교전",
    "전진",
    "위치",
    "합류",
    "붕괴",
  ]);
}

function hasWardingOrFogContext(contextText: string) {
  return hasAnyText(contextText, [
    "ward",
    "vision",
    "fog",
    "deep",
    "시야",
    "와드",
    "안개",
    "부쉬",
    "강가",
    "깊",
  ]);
}

function addOrMergeCandidate(
  candidates: Map<SceneScenarioId, CandidateDraft>,
  candidate: CandidateDraft
) {
  if (!getSceneScenarioById(candidate.scenarioId)) return;

  const existing = candidates.get(candidate.scenarioId);
  if (!existing) {
    candidates.set(candidate.scenarioId, {
      ...candidate,
      matchedRiskTags: uniq(candidate.matchedRiskTags),
      boostingEvidence: uniq(candidate.boostingEvidence),
      limitingFactors: uniq(candidate.limitingFactors),
    });
    return;
  }

  const confidence =
    CONFIDENCE_RANK[candidate.confidence] > CONFIDENCE_RANK[existing.confidence]
      ? candidate.confidence
      : existing.confidence;

  candidates.set(candidate.scenarioId, {
    scenarioId: candidate.scenarioId,
    confidence,
    matchedRiskTags: uniq([
      ...existing.matchedRiskTags,
      ...candidate.matchedRiskTags,
    ]),
    boostingEvidence: uniq([
      ...existing.boostingEvidence,
      ...candidate.boostingEvidence,
    ]),
    limitingFactors: uniq([
      ...existing.limitingFactors,
      ...candidate.limitingFactors,
    ]),
    reasonKo:
      CONFIDENCE_RANK[candidate.confidence] >= CONFIDENCE_RANK[existing.confidence]
        ? candidate.reasonKo
        : existing.reasonKo,
  });
}

function sortCandidates(candidates: SceneCandidate[]) {
  return [...candidates].sort(
    (left, right) =>
      CONFIDENCE_RANK[right.confidence] - CONFIDENCE_RANK[left.confidence] ||
      left.scenarioId.localeCompare(right.scenarioId)
  );
}

export function mapEvidenceToSceneCandidates(
  input: CandidateInput
): SceneCandidateMappingResult {
  const riskTags = uniq(input.riskTags ?? []);
  const riskTagSet = new Set(riskTags);
  const candidates = new Map<SceneScenarioId, CandidateDraft>();
  const notes: string[] = [];
  const contextText = makeContextText(input);
  const hasKillOrAdvantage = hasKillOrAdvantageContext(input, contextText);
  const hasDeathOrLoss = hasDeathOrLossContext(input, contextText);

  if (riskTagSet.has("NO_RIVER_VISION") && !riskTagSet.has("ENEMY_JUNGLER_UNKNOWN")) {
    notes.push("NO_RIVER_VISION 단독으로는 갱킹 후보를 만들지 않았습니다.");
  }

  if (
    riskTagSet.has("NO_RIVER_VISION") &&
    riskTagSet.has("ENEMY_JUNGLER_UNKNOWN")
  ) {
    addOrMergeCandidate(candidates, {
      scenarioId: "fight_with_unknown_enemy_jungler",
      confidence: "high",
      matchedRiskTags: ["NO_RIVER_VISION", "ENEMY_JUNGLER_UNKNOWN"],
      boostingEvidence: ["시야 없음과 상대 정글 미확인이 함께 감지됨"],
      limitingFactors: [],
      reasonKo:
        "강가 시야가 없고 상대 정글 위치도 불명확해 정글 미확인 교전 후보로 봅니다.",
    });

    const gankBoosters: string[] = [];
    if (hasPushOrForwardContext(contextText)) {
      gankBoosters.push("라인 푸시 또는 전진 정황");
    }
    if (hasDeathOrLoss) {
      gankBoosters.push("사망 또는 손실 정황");
    }
    if (hasEnemyJungleInvolvement(contextText)) {
      gankBoosters.push("상대 정글 개입 정황");
    }

    addOrMergeCandidate(candidates, {
      scenarioId: "ganked_while_pushing",
      confidence: gankBoosters.length > 0 ? "high" : "medium",
      matchedRiskTags: ["NO_RIVER_VISION", "ENEMY_JUNGLER_UNKNOWN"],
      boostingEvidence: gankBoosters,
      limitingFactors:
        gankBoosters.length > 0
          ? []
          : ["라인 푸시, 전진 위치, 사망, 정글 개입 근거가 아직 부족함"],
      reasonKo:
        gankBoosters.length > 0
          ? "시야와 정글 정보가 없는 상태에 푸시/전진 또는 사망 근거가 붙어 갱킹 후보 신뢰도가 올라갑니다."
          : "시야와 정글 정보가 없지만 푸시 중 갱킹으로 확정할 추가 근거는 아직 부족합니다.",
    });
  }

  if (
    riskTagSet.has("FOUGHT_WITHOUT_ALLY_COVER") &&
    riskTagSet.has("ENEMY_SUPPORT_ROAM_WINDOW")
  ) {
    const supportBoosted = hasSupportInvolvement(contextText);
    addOrMergeCandidate(candidates, {
      scenarioId: "enemy_support_roam_collapse",
      confidence: supportBoosted ? "high" : "medium",
      matchedRiskTags: ["FOUGHT_WITHOUT_ALLY_COVER", "ENEMY_SUPPORT_ROAM_WINDOW"],
      boostingEvidence: supportBoosted
        ? ["상대 서폿 관여 또는 화면 등장 정황"]
        : [],
      limitingFactors: supportBoosted
        ? []
        : ["상대 서폿 미아 기반 추정이며 직접 관여 근거는 부족함"],
      reasonKo:
        "아군 커버 없이 싸운 상태에서 상대 서폿 로밍 창이 감지되어 서폿 붕괴 후보로 봅니다.",
    });
  } else if (
    riskTagSet.has("ENEMY_SUPPORT_ROAM_WINDOW") &&
    !hasDeathOrLoss &&
    !hasFightOrPositionContext(contextText)
  ) {
    notes.push(
      "ENEMY_SUPPORT_ROAM_WINDOW 단독이고 교전/위치/손실 근거가 없어 collapse 후보를 만들지 않았습니다."
    );
  }

  if (riskTagSet.has("NO_FLASH_WINDOW") || riskTagSet.has("NO_ESCAPE_TOOL")) {
    const matched = ["NO_FLASH_WINDOW", "NO_ESCAPE_TOOL"].filter((tag) =>
      riskTagSet.has(tag)
    );
    const boostingEvidence = riskTagSet.has("LOW_HP_STAY")
      ? ["LOW_HP_STAY가 생존 자원 부족을 보조함"]
      : [];
    addOrMergeCandidate(candidates, {
      scenarioId: "fight_without_flash_or_escape",
      confidence: "high",
      matchedRiskTags: matched,
      boostingEvidence,
      limitingFactors: [],
      reasonKo:
        "점멸 또는 탈출기 부재는 교전 전 생존 자원 부족 후보로 직접 연결됩니다.",
    });
  }

  if (riskTagSet.has("UNSAFE_WARDING")) {
    const boosted = hasWardingOrFogContext(contextText);
    addOrMergeCandidate(candidates, {
      scenarioId: "unsafe_warding_into_fog",
      confidence: boosted ? "high" : "medium",
      matchedRiskTags: ["UNSAFE_WARDING"],
      boostingEvidence: boosted ? ["와드, 깊은 시야, 안개 진입 정황"] : [],
      limitingFactors: boosted ? [] : ["수동/risk tag 기반 추정이며 영상 근거는 부족함"],
      reasonKo:
        "위험한 와딩 태그가 있어 안개 속 시야 진입 후보로 봅니다.",
    });
  }

  const poorConversionRiskTags = [
    "POST_KILL_ESCAPE_RISK",
    "NO_ESCAPE_PLAN",
    "MISSED_ALTERNATIVE_GAIN",
  ].filter((tag) => riskTagSet.has(tag));
  const hasPostKillRisk =
    riskTagSet.has("POST_KILL_ESCAPE_RISK") || riskTagSet.has("NO_ESCAPE_PLAN");

  if (poorConversionRiskTags.length > 0 && hasKillOrAdvantage) {
    addOrMergeCandidate(candidates, {
      scenarioId: "successful_solo_kill_poor_conversion",
      confidence: hasPostKillRisk ? "medium" : "medium",
      matchedRiskTags: poorConversionRiskTags,
      boostingEvidence: ["킬 또는 실제 이득 선행 정황"],
      limitingFactors: hasPostKillRisk
        ? ["candidate confidence type은 medium-high를 지원하지 않아 medium으로 보관함"]
        : [],
      reasonKo:
        "킬 또는 실제 이득 이후 전환/탈출 리스크가 있어 낮은 이득 전환 후보로 봅니다.",
    });
  } else if (riskTagSet.has("MISSED_ALTERNATIVE_GAIN")) {
    notes.push(
      "MISSED_ALTERNATIVE_GAIN 단독으로는 솔로킬 이후 낮은 전환 후보를 만들지 않았습니다."
    );
  }

  if (riskTagSet.has("BAD_RECALL_BEFORE_OBJECTIVE")) {
    addOrMergeCandidate(candidates, {
      scenarioId: "bad_recall_before_objective",
      confidence: "high",
      matchedRiskTags: ["BAD_RECALL_BEFORE_OBJECTIVE"],
      boostingEvidence: ["오브젝트 전 리콜 실패 태그"],
      limitingFactors: [],
      reasonKo:
        "오브젝트 직전 리콜 문제는 bad_recall_before_objective 후보로 직접 연결됩니다.",
    });
  }

  if (riskTagSet.has("STAYED_LOW_RESOURCE_BEFORE_OBJECTIVE")) {
    if (hasDeathOrLoss) {
      addOrMergeCandidate(candidates, {
        scenarioId: "death_before_objective",
        confidence: "medium",
        matchedRiskTags: ["STAYED_LOW_RESOURCE_BEFORE_OBJECTIVE"],
        boostingEvidence: ["낮은 자원 체류와 사망/손실 타이밍 정황"],
        limitingFactors: [],
        reasonKo:
          "오브젝트 전 낮은 자원 체류에 사망/손실 정황이 있어 death_before_objective 후보로 봅니다.",
      });
    } else {
      notes.push(
        "STAYED_LOW_RESOURCE_BEFORE_OBJECTIVE는 사망/손실 타이밍 근거가 없어 death_before_objective로 매핑하지 않았습니다."
      );
    }
  }

  if (
    riskTagSet.has("OBJECTIVE_TRADEOFF_MISREAD") ||
    riskTagSet.has("MISSED_ALTERNATIVE_GAIN")
  ) {
    const matched = ["OBJECTIVE_TRADEOFF_MISREAD", "MISSED_ALTERNATIVE_GAIN"].filter(
      (tag) => riskTagSet.has(tag)
    );
    addOrMergeCandidate(candidates, {
      scenarioId: "objective_trade_decision",
      confidence: "high",
      matchedRiskTags: matched,
      boostingEvidence: ["오브젝트 합류와 대체 이득 교환 판단 태그"],
      limitingFactors: [],
      reasonKo:
        "오브젝트 합류와 대체 이득 판단 문제가 있어 objective_trade_decision 후보로 봅니다.",
    });
  }

  if (riskTagSet.has("MOVING_BEFORE_WAVE_CRASH")) {
    addOrMergeCandidate(candidates, {
      scenarioId: "poor_wave_state_before_roaming",
      confidence: "high",
      matchedRiskTags: ["MOVING_BEFORE_WAVE_CRASH"],
      boostingEvidence: ["웨이브 크래시 전 이동 태그"],
      limitingFactors: [],
      reasonKo:
        "웨이브가 박히기 전 움직인 신호가 있어 로밍 전 나쁜 웨이브 상태 후보로 봅니다.",
    });
  }

  if (
    riskTagSet.has("PLATE_GREED_WITHOUT_JUNGLE_COVER") ||
    riskTagSet.has("RECALL_GREED")
  ) {
    const matched = ["PLATE_GREED_WITHOUT_JUNGLE_COVER", "RECALL_GREED"].filter(
      (tag) => riskTagSet.has(tag)
    );
    addOrMergeCandidate(candidates, {
      scenarioId: "overstay_after_wave_crash",
      confidence: "medium",
      matchedRiskTags: matched,
      boostingEvidence: [],
      limitingFactors: ["웨이브 크래시 이후 체류였는지 추가 확인 필요"],
      reasonKo:
        "플레이트 욕심 또는 귀환 지연 신호가 있어 웨이브 크래시 후 과체류 후보로 봅니다.",
    });
  }

  const scenarioCandidates = sortCandidates(Array.from(candidates.values()));
  const candidateScenarioIds = scenarioCandidates.map(
    (candidate) => candidate.scenarioId
  );
  const candidateMetricIds = uniq(
    candidateScenarioIds.flatMap((scenarioId) =>
      getMetricsForScenario(scenarioId).map((metric) => metric.id)
    )
  );
  const candidateHabitPatternIds = uniq(
    HABIT_PATTERNS.filter(
      (pattern) =>
        pattern.identifyingRiskTags.some((tag) => riskTagSet.has(tag)) ||
        pattern.identifyingScenarios.some((scenarioId) =>
          candidateScenarioIds.includes(scenarioId)
        )
    ).map((pattern) => pattern.id)
  );
  const matchedRiskTags = uniq(
    scenarioCandidates.flatMap((candidate) => candidate.matchedRiskTags)
  );

  return {
    scenarioCandidates,
    candidateScenarioIds,
    candidateMetricIds,
    candidateHabitPatternIds,
    matchedRiskTags,
    notes,
  };
}
