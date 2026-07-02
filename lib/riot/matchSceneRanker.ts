import type {
  AutoSceneCandidate,
  AutoSceneConfidence,
  AutoSceneType,
} from "@/types/autoScene";
import type { SceneScenarioId } from "@/types/coachingMetrics";
import type {
  ConfirmationQuestion,
  HabitSignal,
  MatchReviewReport,
  RankedReviewScene,
  RankMatchScenesInput,
  SceneBundle,
  SceneValence,
  StrengthSignal,
} from "@/types/matchReview";

const ANALYSIS_VERSION = "level-8-b.match-scene-ranker.v1";
const PURE_GENERATED_AT = "1970-01-01T00:00:00.000Z";
const CLUSTER_WINDOW_SEC = 30;
const SAME_EVENT_WINDOW_SEC = 5;

type EvidenceScoringRule = {
  id: string;
  boost: number;
  summaryKo: string;
  condition: (candidate: AutoSceneCandidate) => boolean;
};

type SceneScoringRule = {
  baseScore: number;
  sceneValence: SceneValence;
  primaryScenarioId: SceneScenarioId | null;
  displayNameKo: string;
  evidenceExtractors: EvidenceScoringRule[];
  confirmationQuestions: ConfirmationQuestion[];
  habitTypes: string[];
  strengthTypes: string[];
};

function hasText(candidate: AutoSceneCandidate, patterns: string[]) {
  const text = [
    candidate.titleKo,
    candidate.reasonKo,
    candidate.reviewSeed.noteKo,
    candidate.reviewSeed.currentOutcome,
    candidate.reviewSeed.primaryCause,
    candidate.reviewSeed.scenarioType,
    ...candidate.riskTagSeeds,
    ...candidate.sceneCandidateSeeds,
    ...candidate.missingInfo,
    ...candidate.evidence.map((evidence) => evidence.summaryKo),
    ...candidate.evidence.flatMap((evidence) => evidence.eventTypes),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return patterns.some((pattern) => text.includes(pattern.toLowerCase()));
}

function evidenceCountAtLeast(count: number) {
  return (candidate: AutoSceneCandidate) => candidate.evidence.length >= count;
}

function hasConfirmedRiotEvidence(candidate: AutoSceneCandidate) {
  return candidate.evidence.some(
    (evidence) => evidence.certainty === "confirmed_by_riot"
  );
}

function hasPositiveGainText(candidate: AutoSceneCandidate) {
  return hasText(candidate, [
    "gold +",
    "골드 +",
    "xp +",
    "positive",
    "fight_advantage",
    "solo_kill",
  ]);
}

function question(
  id: string,
  questionKo: string,
  reasonKo?: string
): ConfirmationQuestion {
  return { id, questionKo, reasonKo };
}

const COMMON_CONFIRMATION_QUESTIONS = [
  question(
    "video_context",
    "영상에서 실제 웨이브 상태, 시야, 교전 방향이 Riot 후보와 맞나요?",
    "Riot timeline은 이벤트는 강하지만 의도와 화면 정보를 직접 확정하지 못합니다."
  ),
];

const SCENE_SCORING_RULES = {
  death_review_candidate: {
    baseScore: 74,
    sceneValence: "bad_decision",
    primaryScenarioId: null,
    displayNameKo: "사망 복기 후보",
    evidenceExtractors: [
      {
        id: "confirmed_death",
        boost: 12,
        summaryKo: "Riot timeline에서 사망 이벤트가 확인됩니다.",
        condition: hasConfirmedRiotEvidence,
      },
      {
        id: "multiple_evidence",
        boost: 4,
        summaryKo: "연결된 Riot 근거가 2개 이상입니다.",
        condition: evidenceCountAtLeast(2),
      },
    ],
    confirmationQuestions: [
      ...COMMON_CONFIRMATION_QUESTIONS,
      question("death_setup", "죽기 직전 라인 위치와 상대 정글 정보는 확인됐나요?"),
    ],
    habitTypes: ["death_review", "LOW_RESOURCE_STAY"],
    strengthTypes: [],
  },
  jungle_gank_death_candidate: {
    baseScore: 86,
    sceneValence: "bad_decision",
    primaryScenarioId: "fight_with_unknown_enemy_jungler",
    displayNameKo: "정글 개입 사망 후보",
    evidenceExtractors: [
      {
        id: "enemy_jungle_involved",
        boost: 16,
        summaryKo: "사망 이벤트에 상대 정글 관여 신호가 있습니다.",
        condition: (candidate) =>
          hasText(candidate, ["enemy_jungle", "정글", "jungle"]),
      },
      {
        id: "vision_risk_seed",
        boost: 8,
        summaryKo: "시야/정글 위치 관련 risk seed가 포함되어 있습니다.",
        condition: (candidate) =>
          hasText(candidate, ["NO_RIVER_VISION", "ENEMY_JUNGLER_UNKNOWN"]),
      },
    ],
    confirmationQuestions: [
      ...COMMON_CONFIRMATION_QUESTIONS,
      question("jungle_tracking", "압박 전에 상대 정글 위치를 확인할 근거가 있었나요?"),
      question("lane_position", "사망 직전 라인이 상대 쪽으로 길게 밀려 있었나요?"),
    ],
    habitTypes: ["PUSHED_WITHOUT_JUNGLE_TRACKING", "vision_before_pressure"],
    strengthTypes: [],
  },
  solo_kill_candidate: {
    baseScore: 68,
    sceneValence: "good_decision",
    primaryScenarioId: "successful_solo_kill_good_conversion",
    displayNameKo: "솔로킬 / 교전 이득 후보",
    evidenceExtractors: [
      {
        id: "confirmed_solo_kill",
        boost: 14,
        summaryKo: "Riot timeline에서 플레이어 킬 이벤트가 확인됩니다.",
        condition: hasConfirmedRiotEvidence,
      },
      {
        id: "positive_gain_signal",
        boost: 10,
        summaryKo: "후속 골드/XP 또는 교전 이득 신호가 있습니다.",
        condition: hasPositiveGainText,
      },
    ],
    confirmationQuestions: [
      ...COMMON_CONFIRMATION_QUESTIONS,
      question("conversion_choice", "킬 이후 웨이브, 리콜, 플레이트 중 무엇으로 전환했나요?"),
    ],
    habitTypes: [],
    strengthTypes: ["STRONG_SOLO_KILL_EXECUTION", "GOOD_FIGHT_JOIN_TIMING"],
  },
  post_kill_conversion_candidate: {
    baseScore: 76,
    sceneValence: "missed_opportunity",
    primaryScenarioId: "successful_solo_kill_poor_conversion",
    displayNameKo: "킬 이후 이득 전환 후보",
    evidenceExtractors: [
      {
        id: "conversion_risk_seed",
        boost: 12,
        summaryKo: "킬 이후 탈출/전환 risk seed가 포함되어 있습니다.",
        condition: (candidate) =>
          hasText(candidate, ["POST_KILL_ESCAPE_RISK", "NO_ESCAPE_PLAN"]),
      },
      {
        id: "inferred_post_kill_delta",
        boost: 8,
        summaryKo: "킬 이후 timeline delta 기반 추정 근거가 있습니다.",
        condition: (candidate) => hasText(candidate, ["TIMELINE_FRAME_DELTA"]),
      },
    ],
    confirmationQuestions: [
      ...COMMON_CONFIRMATION_QUESTIONS,
      question("post_kill_wave", "킬 이후 웨이브를 먼저 정리할 수 있었나요?"),
      question("recall_or_plate", "리콜과 플레이트 중 어떤 선택이 더 안전했나요?"),
    ],
    habitTypes: ["POOR_POST_KILL_CONVERSION", "post_kill_escape_plan"],
    strengthTypes: [],
  },
  objective_setup_failure_candidate: {
    baseScore: 78,
    sceneValence: "missed_opportunity",
    primaryScenarioId: "death_before_objective",
    displayNameKo: "오브젝트 전 준비 손실 후보",
    evidenceExtractors: [
      {
        id: "objective_event",
        boost: 12,
        summaryKo: "오브젝트 처치 이벤트가 같은 후보 근거에 포함되어 있습니다.",
        condition: (candidate) => hasText(candidate, ["ELITE_MONSTER_KILL"]),
      },
      {
        id: "objective_risk_seed",
        boost: 8,
        summaryKo: "오브젝트 tradeoff 관련 risk seed가 포함되어 있습니다.",
        condition: (candidate) =>
          hasText(candidate, ["OBJECTIVE_TRADEOFF_MISREAD"]),
      },
    ],
    confirmationQuestions: [
      ...COMMON_CONFIRMATION_QUESTIONS,
      question("objective_timer", "죽기 전 오브젝트까지 남은 시간이 판단에 영향을 줬나요?"),
      question("setup_order", "라인, 리콜, 시야 순서가 맞았나요?"),
    ],
    habitTypes: ["LATE_OBJECTIVE_PREP", "recall_timing"],
    strengthTypes: [],
  },
  unsafe_warding_candidate: {
    baseScore: 70,
    sceneValence: "bad_decision",
    primaryScenarioId: "unsafe_warding_into_fog",
    displayNameKo: "위험한 시야 장악 후보",
    evidenceExtractors: [
      {
        id: "ward_or_fog",
        boost: 10,
        summaryKo: "ward/fog 관련 근거가 포함되어 있습니다.",
        condition: (candidate) => hasText(candidate, ["WARD", "ward", "fog", "시야"]),
      },
    ],
    confirmationQuestions: [
      ...COMMON_CONFIRMATION_QUESTIONS,
      question("warding_cover", "와드를 박을 때 아군 커버나 상대 위치 정보가 있었나요?"),
    ],
    habitTypes: ["vision", "unsafe_warding"],
    strengthTypes: [],
  },
  no_flash_fight_candidate: {
    baseScore: 72,
    sceneValence: "bad_decision",
    primaryScenarioId: "fight_without_flash_or_escape",
    displayNameKo: "점멸/탈출기 없는 교전 후보",
    evidenceExtractors: [
      {
        id: "no_escape_seed",
        boost: 10,
        summaryKo: "점멸 또는 탈출기 부재 관련 seed가 포함되어 있습니다.",
        condition: (candidate) =>
          hasText(candidate, ["NO_FLASH_WINDOW", "NO_ESCAPE_TOOL", "flash"]),
      },
    ],
    confirmationQuestions: [
      ...COMMON_CONFIRMATION_QUESTIONS,
      question("cooldown_check", "교전 시작 전에 내 점멸/이동기 쿨타임을 확인했나요?"),
    ],
    habitTypes: ["FOUGHT_WITHOUT_FLASH", "fight_entry"],
    strengthTypes: [],
  },
  support_roam_collapse_candidate: {
    baseScore: 74,
    sceneValence: "bad_decision",
    primaryScenarioId: "enemy_support_roam_collapse",
    displayNameKo: "서포터 로밍 붕괴 후보",
    evidenceExtractors: [
      {
        id: "support_roam_seed",
        boost: 12,
        summaryKo: "서포터 로밍 또는 아군 커버 부재 신호가 있습니다.",
        condition: (candidate) =>
          hasText(candidate, ["support", "SUPPORT", "서포터", "ally cover"]),
      },
    ],
    confirmationQuestions: [
      ...COMMON_CONFIRMATION_QUESTIONS,
      question("support_position", "상대 서포터가 실제로 화면에 보였거나 관여했나요?"),
    ],
    habitTypes: ["support_roam_awareness", "ally_cover_check"],
    strengthTypes: [],
  },
  tempo_loss_candidate: {
    baseScore: 62,
    sceneValence: "missed_opportunity",
    primaryScenarioId: "missed_reset_timing",
    displayNameKo: "템포 손실 후보",
    evidenceExtractors: [
      {
        id: "tempo_text",
        boost: 8,
        summaryKo: "tempo 또는 recall 관련 근거가 포함되어 있습니다.",
        condition: (candidate) => hasText(candidate, ["tempo", "recall", "리콜"]),
      },
    ],
    confirmationQuestions: [
      ...COMMON_CONFIRMATION_QUESTIONS,
      question("tempo_choice", "이 타이밍에 리콜, 시야, 라인 중 무엇이 가장 확실했나요?"),
    ],
    habitTypes: ["tempo_management", "recall_timing"],
    strengthTypes: [],
  },
  wave_management_error_candidate: {
    baseScore: 64,
    sceneValence: "missed_opportunity",
    primaryScenarioId: "poor_wave_state_before_roaming",
    displayNameKo: "웨이브 관리 오류 후보",
    evidenceExtractors: [
      {
        id: "wave_text",
        boost: 8,
        summaryKo: "wave/CS 관련 근거가 포함되어 있습니다.",
        condition: (candidate) => hasText(candidate, ["wave", "CS", "웨이브"]),
      },
    ],
    confirmationQuestions: [
      ...COMMON_CONFIRMATION_QUESTIONS,
      question("wave_state", "이동 또는 교전 전에 미드 웨이브가 먼저 정리됐나요?"),
    ],
    habitTypes: ["BLIND_ROAM_WITH_BAD_WAVE"],
    strengthTypes: [],
  },
  blind_roaming_candidate: {
    baseScore: 66,
    sceneValence: "pattern_flag",
    primaryScenarioId: "poor_wave_state_before_roaming",
    displayNameKo: "근거 부족 로밍 후보",
    evidenceExtractors: [
      {
        id: "roam_text",
        boost: 8,
        summaryKo: "roam 또는 이동 관련 근거가 포함되어 있습니다.",
        condition: (candidate) => hasText(candidate, ["roam", "로밍", "move"]),
      },
    ],
    confirmationQuestions: [
      ...COMMON_CONFIRMATION_QUESTIONS,
      question("roam_reason", "로밍 전에 상대 미드와 정글 위치를 확인했나요?"),
    ],
    habitTypes: ["BLIND_ROAM_WITH_BAD_WAVE", "information_check"],
    strengthTypes: [],
  },
  poor_resource_management_candidate: {
    baseScore: 60,
    sceneValence: "pattern_flag",
    primaryScenarioId: "overstay_after_wave_crash",
    displayNameKo: "자원 관리 후보",
    evidenceExtractors: [
      {
        id: "resource_text",
        boost: 8,
        summaryKo: "HP/마나/쿨타임 관련 근거가 포함되어 있습니다.",
        condition: (candidate) =>
          hasText(candidate, ["resource", "low", "HP", "mana", "cooldown"]),
      },
    ],
    confirmationQuestions: [
      ...COMMON_CONFIRMATION_QUESTIONS,
      question("resource_state", "교전 또는 잔류 전에 체력, 마나, 핵심 쿨타임이 충분했나요?"),
    ],
    habitTypes: ["LOW_RESOURCE_STAY", "overstay_check"],
    strengthTypes: [],
  },
} satisfies Record<AutoSceneType, SceneScoringRule>;

function confidenceBoost(confidence: AutoSceneConfidence) {
  switch (confidence) {
    case "high":
      return 8;
    case "medium":
      return 4;
    case "low":
      return 0;
  }
}

function compactList(values: string[], max = 4) {
  return values
    .filter((value) => typeof value === "string" && value.trim().length > 0)
    .slice(0, max);
}

function getWindowSec(candidate: AutoSceneCandidate) {
  const window = candidate.reviewSeed.timeWindowSec;
  if (!window) return undefined;
  return Math.max(0, window.endSec - window.startSec);
}

function buildRiotEvidenceSummary(candidate: AutoSceneCandidate) {
  return compactList(
    [
      candidate.reasonKo,
      ...candidate.evidence.map((evidence) => evidence.summaryKo),
    ],
    5
  );
}

function buildHabitSignals(
  candidate: AutoSceneCandidate,
  rule: SceneScoringRule
): HabitSignal[] {
  return rule.habitTypes.map((habitType) => ({
    habitType,
    labelKo: habitTypeLabelKo(habitType),
    confidence: candidate.confidence,
    sourceSceneId: candidate.id,
  }));
}

function habitTypeLabelKo(habitType: string) {
  const labels: Record<string, string> = {
    death_review: "사망 장면 복기",
    PUSHED_WITHOUT_JUNGLE_TRACKING: "정글 위치 없이 압박",
    FOUGHT_WITHOUT_FLASH: "점멸 없이 교전",
    POOR_POST_KILL_CONVERSION: "킬 이후 이득 전환 부족",
    LATE_OBJECTIVE_PREP: "오브젝트 준비 타이밍 손실",
    BLIND_ROAM_WITH_BAD_WAVE: "웨이브 정리 전 이동",
    OVERCHASE_TOWARD_ENEMY_COVER: "상대 커버 방향 추격",
    LOW_RESOURCE_STAY: "자원 부족 상태 체류",
    jungle_tracking: "정글 위치 확인",
    vision_before_pressure: "압박 전 시야 확인",
    kill_to_value_conversion: "킬 이후 이득 전환",
    post_kill_escape_plan: "킬 이후 탈출 계획",
    objective_setup: "오브젝트 전 준비",
    recall_timing: "리콜 타이밍",
    vision: "시야 판단",
    unsafe_warding: "위험한 시야 장악",
    cooldown_awareness: "쿨타임 확인",
    fight_entry: "교전 진입 판단",
    support_roam_awareness: "서포터 로밍 인지",
    ally_cover_check: "아군 커버 확인",
    tempo_management: "템포 관리",
    wave_management: "웨이브 관리",
    roam_timing: "로밍 타이밍",
    information_check: "정보 확인",
    resource_management: "자원 관리",
    overstay_check: "과체류 확인",
  };
  return labels[habitType] ?? habitType;
}

function rankCandidate(candidate: AutoSceneCandidate): RankedReviewScene {
  const rule = SCENE_SCORING_RULES[candidate.type];
  const evidenceBoosts = [
    ...rule.evidenceExtractors
      .filter((extractor) => extractor.condition(candidate))
      .map((extractor) => ({
        id: extractor.id,
        boost: extractor.boost,
        summaryKo: extractor.summaryKo,
      })),
    {
      id: `confidence_${candidate.confidence}`,
      boost: confidenceBoost(candidate.confidence),
      summaryKo: `Extractor confidence: ${candidate.confidence}`,
    },
  ].filter((boost) => boost.boost > 0);
  const totalScore =
    rule.baseScore +
    evidenceBoosts.reduce((sum, boost) => sum + boost.boost, 0);
  const riotEvidenceSummary = buildRiotEvidenceSummary(candidate);

  return {
    sceneId: candidate.id,
    matchId: candidate.matchId,
    gameTimeSec: candidate.gameTimeSec,
    windowSec: getWindowSec(candidate),
    autoSceneType: candidate.type,
    primaryScenarioId: rule.primaryScenarioId,
    sceneValence: rule.sceneValence,
    reviewWorthinessScore: totalScore,
    scoreBreakdown: {
      baseScore: rule.baseScore,
      evidenceBoosts,
      totalScore,
    },
    riotEvidenceSummary,
    displayNameKo: rule.displayNameKo,
    evidenceSummaryKo:
      riotEvidenceSummary[0] ?? candidate.titleKo ?? rule.displayNameKo,
    confirmationQuestions: rule.confirmationQuestions,
    habitSignals: buildHabitSignals(candidate, rule),
  };
}

function uniqueHabitSignals(scenes: RankedReviewScene[]): HabitSignal[] {
  const seen = new Set<string>();
  const signals: HabitSignal[] = [];

  for (const scene of scenes) {
    for (const signal of scene.habitSignals) {
      const key = signal.habitType;
      if (seen.has(key)) continue;
      seen.add(key);
      signals.push(signal);
    }
  }

  return signals;
}

function isImprovementValence(scene: RankedReviewScene) {
  return (
    scene.sceneValence === "bad_decision" ||
    scene.sceneValence === "missed_opportunity" ||
    scene.sceneValence === "pattern_flag"
  );
}

function isNearDuplicate(
  scene: RankedReviewScene,
  selectedScenes: RankedReviewScene[]
) {
  return selectedScenes.some(
    (selectedScene) =>
      selectedScene.matchId === scene.matchId &&
      Math.abs(selectedScene.gameTimeSec - scene.gameTimeSec) <= 30
  );
}

function selectDiverseScenes(
  scenes: RankedReviewScene[],
  max: number,
  predicate: (scene: RankedReviewScene) => boolean
) {
  const candidates = scenes.filter(predicate);
  const selected: RankedReviewScene[] = [];
  const usedTypes = new Set<string>();

  for (const scene of candidates) {
    if (selected.length >= max) break;
    if (isNearDuplicate(scene, selected)) continue;
    if (usedTypes.has(scene.autoSceneType)) continue;
    selected.push(scene);
    usedTypes.add(scene.autoSceneType);
  }

  for (const scene of candidates) {
    if (selected.length >= max) break;
    if (selected.some((selectedScene) => selectedScene.sceneId === scene.sceneId)) {
      continue;
    }
    if (isNearDuplicate(scene, selected)) continue;
    selected.push(scene);
  }

  for (const scene of candidates) {
    if (selected.length >= max) break;
    if (selected.some((selectedScene) => selectedScene.sceneId === scene.sceneId)) {
      continue;
    }
    if (isNearDuplicate(scene, selected)) continue;
    selected.push(scene);
  }

  return selected;
}

function selectImprovementScenes(rankedScenes: RankedReviewScene[], max = 5) {
  return selectDiverseScenes(rankedScenes, max, isImprovementValence);
}

function selectStrengthScenes(rankedScenes: RankedReviewScene[], max = 3) {
  return selectDiverseScenes(
    rankedScenes,
    max,
    (scene) => scene.sceneValence === "good_decision"
  );
}

function pushUniqueScene(
  scenes: RankedReviewScene[],
  scene: RankedReviewScene | undefined,
  max: number
) {
  if (!scene || scenes.length >= max) return;
  if (scenes.some((existingScene) => existingScene.sceneId === scene.sceneId)) {
    return;
  }
  scenes.push(scene);
}

function selectCuratedTopScenes(
  rankedScenes: RankedReviewScene[],
  improvementScenes: RankedReviewScene[],
  strengthScenes: RankedReviewScene[],
  maxTopScenes: number
) {
  const selected: RankedReviewScene[] = [];

  pushUniqueScene(selected, strengthScenes[0], maxTopScenes);
  pushUniqueScene(selected, improvementScenes[0], maxTopScenes);

  for (const scene of rankedScenes) {
    pushUniqueScene(selected, scene, maxTopScenes);
  }

  return selected;
}

function isPostKillFollowUpScene(scene: RankedReviewScene) {
  return (
    scene.autoSceneType === "post_kill_conversion_candidate" ||
    scene.autoSceneType === "objective_setup_failure_candidate" ||
    scene.autoSceneType === "tempo_loss_candidate" ||
    scene.autoSceneType === "wave_management_error_candidate" ||
    scene.autoSceneType === "blind_roaming_candidate" ||
    scene.autoSceneType === "poor_resource_management_candidate" ||
    scene.primaryScenarioId === "successful_solo_kill_poor_conversion" ||
    scene.primaryScenarioId === "overstay_after_wave_crash" ||
    scene.primaryScenarioId === "missed_reset_timing" ||
    scene.primaryScenarioId === "poor_wave_state_before_roaming"
  );
}

function shouldSeparateSceneLesson(
  group: RankedReviewScene[],
  nextScene: RankedReviewScene
) {
  const hasSoloKill = group.some(
    (scene) => scene.autoSceneType === "solo_kill_candidate"
  );
  const nextIsSoloKill = nextScene.autoSceneType === "solo_kill_candidate";
  const hasFollowUp = group.some(isPostKillFollowUpScene);
  const nextIsFollowUp = isPostKillFollowUpScene(nextScene);

  if (!((hasSoloKill && nextIsFollowUp) || (hasFollowUp && nextIsSoloKill))) {
    return false;
  }

  return group.every((scene) => scene.gameTimeSec !== nextScene.gameTimeSec);
}

function buildSceneBundle(group: RankedReviewScene[]): SceneBundle {
  const sortedByScore = [...group].sort(
    (left, right) =>
      right.reviewWorthinessScore - left.reviewWorthinessScore ||
      left.gameTimeSec - right.gameTimeSec ||
      left.sceneId.localeCompare(right.sceneId)
  );
  const representative = sortedByScore[0];
  const nearby = sortedByScore.slice(1);
  const times = group.map((scene) => scene.gameTimeSec);
  const startTimeSec = Math.min(...times);
  const endTimeSec = Math.max(...times);
  const clusterType =
    group.length === 1
      ? "single"
      : group.every(
          (scene) =>
            Math.abs(scene.gameTimeSec - representative.gameTimeSec) <=
            SAME_EVENT_WINDOW_SEC
        )
        ? "same_event_multi_type"
        : "sequential_events";

  return {
    representative,
    nearby,
    clusterType,
    startTimeSec,
    endTimeSec,
  };
}

export function clusterScenes(scenes: RankedReviewScene[]): SceneBundle[] {
  if (scenes.length === 0) return [];

  const sortedScenes = [...scenes].sort(
    (left, right) =>
      left.gameTimeSec - right.gameTimeSec ||
      right.reviewWorthinessScore - left.reviewWorthinessScore ||
      left.sceneId.localeCompare(right.sceneId)
  );
  const groups: RankedReviewScene[][] = [];

  for (const scene of sortedScenes) {
    const currentGroup = groups[groups.length - 1];
    const firstScene = currentGroup?.[0];

    if (
      !currentGroup ||
      !firstScene ||
      scene.gameTimeSec - firstScene.gameTimeSec > CLUSTER_WINDOW_SEC ||
      shouldSeparateSceneLesson(currentGroup, scene)
    ) {
      groups.push([scene]);
      continue;
    }

    currentGroup.push(scene);
  }

  return groups
    .map(buildSceneBundle)
    .sort(
      (left, right) =>
        right.representative.reviewWorthinessScore -
          left.representative.reviewWorthinessScore ||
        left.representative.gameTimeSec - right.representative.gameTimeSec ||
        left.representative.sceneId.localeCompare(right.representative.sceneId)
    );
}

function buildStrengthSignals(scenes: RankedReviewScene[]): StrengthSignal[] {
  const signals: StrengthSignal[] = [];
  const seen = new Set<string>();

  for (const scene of scenes) {
    const rule = SCENE_SCORING_RULES[scene.autoSceneType];
    for (const strengthType of rule.strengthTypes) {
      const key = `${strengthType}:${scene.sceneId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      signals.push({
        strengthType,
        matchId: scene.matchId,
        gameTimeSec: scene.gameTimeSec,
        evidenceKo: scene.evidenceSummaryKo,
      });
    }
  }

  return signals;
}

export function rankMatchScenes(input: RankMatchScenesInput): MatchReviewReport {
  const maxTopScenes = Math.max(0, input.maxTopScenes ?? 5);
  const rankedScenes = input.autoSceneCandidates
    .map(rankCandidate)
    .sort(
      (left, right) =>
        right.reviewWorthinessScore - left.reviewWorthinessScore ||
        left.gameTimeSec - right.gameTimeSec ||
        left.sceneId.localeCompare(right.sceneId)
    );
  const improvementScenes = selectImprovementScenes(rankedScenes);
  const strengthScenes = selectStrengthScenes(rankedScenes);
  const sceneBundles = clusterScenes(rankedScenes);
  const topScenes = sceneBundles
    .map((bundle) => bundle.representative)
    .slice(0, maxTopScenes);
  const habitSignals = uniqueHabitSignals(rankedScenes);
  const weaknessSignals = uniqueHabitSignals(improvementScenes);
  const strengthSignals = buildStrengthSignals(strengthScenes);

  return {
    matchId: input.matchId,
    puuid: input.puuid,
    playerChampion: input.riotIdentityContext.target?.championName,
    enemyMidChampion: input.riotIdentityContext.enemyMid?.championName,
    gameDurationSec: input.gameDurationSec,
    rankedScenes,
    improvementScenes,
    strengthScenes,
    topScenes,
    sceneBundles,
    habitSignals,
    weaknessSignals,
    strengthSignals,
    analysisStatus: rankedScenes.length > 0 ? "complete" : "partial",
    analysisVersion: ANALYSIS_VERSION,
    generatedAt: PURE_GENERATED_AT,
  };
}

export { SCENE_SCORING_RULES };
