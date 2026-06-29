import type {
  AutoSceneGroupType,
  PlayerTierGroup,
  TierAwarePatternCriteria,
  TierConfidenceRule,
  TierEvidenceRequirement,
  TierNextGameGoalStyle,
  TierNextGameGoalTemplate,
} from "@/types/autoScene";

export const PLAYER_TIER_GROUPS = [
  "iron_silver",
  "gold_platinum",
  "emerald_diamond",
  "master_plus",
] as const satisfies readonly PlayerTierGroup[];

const AUTO_SCENE_GROUP_TYPES = [
  "push_gank_like",
  "solo_kill_conversion_like",
  "objective_setup_like",
  "no_flash_fight_like",
  "support_roam_collapse_like",
  "unsafe_warding_like",
  "information_gathering_failure_like",
  "wave_management_error_like",
  "resource_management_error_like",
  "tempo_loss_like",
  "blind_roaming_like",
] as const satisfies readonly AutoSceneGroupType[];

export const TIER_CONFIDENCE_RULES = [
  {
    tierGroup: "iron_silver",
    strongThreshold: 3,
    mediumThreshold: 2,
    weakThresholdMax: 1,
    highConfidenceRequires: [
      "basic_survival",
      "basic_vision",
      "no_flash",
      "obvious_overextension",
    ],
    mediumConfidenceAllows: ["riot_event_repeat", "simple_context_repeat"],
    cautionKo:
      "이 구간에서는 반복된 기본 생존/시야 문제 후보를 우선적으로 다루되, 최종 진단은 추가 확인이 필요합니다.",
  },
  {
    tierGroup: "gold_platinum",
    strongThreshold: 4,
    mediumThreshold: 3,
    weakThresholdMax: 2,
    highConfidenceRequires: [
      "jungle_tracking",
      "lane_state",
      "recall_timing",
      "trade_condition",
    ],
    mediumConfidenceAllows: ["riot_event_repeat", "timeline_inference"],
    cautionKo:
      "골드~플래티넘 구간에서는 라인 상태, 정글 위치, 귀환 타이밍을 우선 보되, 영상 확인 전에는 후보로만 봅니다.",
  },
  {
    tierGroup: "emerald_diamond",
    strongThreshold: 4,
    mediumThreshold: 3,
    weakThresholdMax: 2,
    highConfidenceRequires: [
      "cover_direction",
      "wave_collision",
      "support_timing",
      "tempo_turn",
    ],
    mediumConfidenceAllows: ["timeline_inference", "context_repeat"],
    cautionKo:
      "에메랄드~다이아 구간에서는 커버 방향, 웨이브 충돌, 서포터 이동 가능성을 함께 보며 과도한 확정은 피합니다.",
  },
  {
    tierGroup: "master_plus",
    strongThreshold: 4,
    mediumThreshold: 3,
    weakThresholdMax: 2,
    highConfidenceRequires: [
      "objective_setup",
      "tempo_trade",
      "recall_optimization",
      "opportunity_cost",
    ],
    mediumConfidenceAllows: ["timeline_inference", "high_value_context_repeat"],
    cautionKo:
      "마스터 이상에서는 오브젝트 전 준비, 템포 교환, 기회비용을 우선 보되 근거가 부족하면 후보로 유지합니다.",
  },
] as const satisfies readonly TierConfidenceRule[];

const DEFAULT_CONFIDENCE_RULE: TierConfidenceRule = TIER_CONFIDENCE_RULES[1];

const TIER_FOCUS: Record<
  PlayerTierGroup,
  {
    priorityFactors: string[];
    avoidOverCoaching: string[];
    nextGameGoalStyle: TierNextGameGoalStyle;
    cautionKo: string;
  }
> = {
  iron_silver: {
    priorityFactors: [
      "basic_survival",
      "no_flash",
      "basic_vision",
      "obvious_overextension",
      "simple_recall",
    ],
    avoidOverCoaching: [
      "advanced wave crash optimization",
      "exact jungle path reverse tracking",
      "objective trade EV",
    ],
    nextGameGoalStyle: "basic_survival",
    cautionKo:
      "이 기준은 반복 후보를 단순 생존 행동으로 좁히기 위한 휴리스틱이며, 확정 진단이 아닙니다.",
  },
  gold_platinum: {
    priorityFactors: [
      "jungle_tracking",
      "lane_state",
      "recall_timing",
      "trade_condition",
      "conversion",
    ],
    avoidOverCoaching: [
      "pro-level tempo optimization",
      "overly detailed support timing",
      "matchup micro",
    ],
    nextGameGoalStyle: "conditional_decision",
    cautionKo:
      "이 기준은 조건 확인 습관을 잡기 위한 후보 기준이며, 영상 없이 단정하지 않습니다.",
  },
  emerald_diamond: {
    priorityFactors: [
      "wave_collision",
      "ally_jungle_cover",
      "support_roam_timing",
      "fight_direction",
      "tempo_turn",
    ],
    avoidOverCoaching: ["overly basic warding advice only", "vague survival advice"],
    nextGameGoalStyle: "tempo_and_cover",
    cautionKo:
      "이 기준은 템포와 커버 판단 후보를 좁히기 위한 것이며, 실제 장면 확인이 필요합니다.",
  },
  master_plus: {
    priorityFactors: [
      "objective_setup_30_90_seconds",
      "tempo_trade",
      "recall_optimization",
      "expected_value",
      "opportunity_cost",
    ],
    avoidOverCoaching: ["basic ward more advice", "generic play safe advice"],
    nextGameGoalStyle: "optimization",
    cautionKo:
      "이 기준은 최적화 후보를 정리하기 위한 것이며, 작은 근거 차이로 결론을 확정하지 않습니다.",
  },
};

const EVIDENCE_REQUIREMENTS: Record<AutoSceneGroupType, TierEvidenceRequirement> = {
  push_gank_like: "video_recommended",
  no_flash_fight_like: "video_recommended",
  solo_kill_conversion_like: "video_recommended",
  objective_setup_like: "video_recommended",
  support_roam_collapse_like: "video_required",
  unsafe_warding_like: "video_required",
  information_gathering_failure_like: "user_confirmation_required",
  wave_management_error_like: "video_required",
  resource_management_error_like: "video_recommended",
  tempo_loss_like: "video_recommended",
  blind_roaming_like: "video_required",
};

const RIOT_ONLY_SIGNALS: Record<AutoSceneGroupType, string[]> = {
  push_gank_like: ["death time", "kill/assist involvement", "participant identity"],
  solo_kill_conversion_like: [
    "kill time",
    "post-kill death within 90 seconds",
    "low gold/cs gain if frame data exists",
  ],
  objective_setup_like: ["death time", "objective event timing", "killer team id"],
  no_flash_fight_like: ["death time", "item purchase timing if present"],
  support_roam_collapse_like: ["kill/assist involvement", "participant/champion/team identity"],
  unsafe_warding_like: ["ward event timing only if available", "death time"],
  information_gathering_failure_like: ["participant/champion/team identity", "event timing"],
  wave_management_error_like: ["low gold/cs gain if frame data exists", "event timing"],
  resource_management_error_like: ["item purchase timing if present", "death time"],
  tempo_loss_like: ["post-kill death within 90 seconds", "low gold/cs gain if frame data exists"],
  blind_roaming_like: ["death time", "kill/assist involvement"],
};

const VIDEO_REQUIRED_SIGNALS: Record<AutoSceneGroupType, string[]> = {
  push_gank_like: ["actual wave crash state", "actual vision state", "depth of positioning"],
  solo_kill_conversion_like: [
    "actual wave crash state",
    "whether recall was practically available",
    "player intent",
  ],
  objective_setup_like: [
    "actual vision state",
    "support/jungle movement context",
    "player intent",
  ],
  no_flash_fight_like: ["fight direction", "depth of positioning", "camera/minimap awareness"],
  support_roam_collapse_like: [
    "support/jungle movement context",
    "fight direction",
    "camera/minimap awareness",
  ],
  unsafe_warding_like: ["actual vision state", "depth of positioning", "camera/minimap awareness"],
  information_gathering_failure_like: [
    "actual vision state",
    "camera/minimap awareness",
    "player intent",
  ],
  wave_management_error_like: [
    "actual wave crash state",
    "whether recall was practically available",
    "player intent",
  ],
  resource_management_error_like: ["cooldown use context", "player intent", "fight direction"],
  tempo_loss_like: [
    "whether recall was practically available",
    "actual wave crash state",
    "player intent",
  ],
  blind_roaming_like: ["actual vision state", "camera/minimap awareness", "support/jungle movement context"],
};

const GROUP_QUESTIONS: Record<AutoSceneGroupType, string[]> = {
  push_gank_like: [
    "이때 상대 정글 위치를 알고 있었다고 생각했나요?",
    "라인을 밀고 움직인 의도는 무엇이었나요?",
  ],
  solo_kill_conversion_like: [
    "킬 이후 바로 얻으려던 가치는 무엇이었나요?",
    "그 장면에서 귀환할 수 있었다고 보나요?",
  ],
  objective_setup_like: [
    "그 오브젝트를 실제로 준비하거나 싸울 계획이었나요?",
    "죽기 전 웨이브를 먼저 처리할 수 있었나요?",
  ],
  no_flash_fight_like: [
    "점멸이나 생존기가 없는 상태를 인지하고 있었나요?",
    "그 교전은 먼저 건 것인지 받아친 것인지요?",
  ],
  support_roam_collapse_like: [
    "아군 서폿이나 정글이 움직일 수 있다고 봤나요?",
    "상대 서폿 위치를 어느 정도 알고 있었나요?",
  ],
  unsafe_warding_like: [
    "와드하러 들어가기 전 커버를 확인했나요?",
    "그 시야가 지금 꼭 필요하다고 판단했나요?",
  ],
  information_gathering_failure_like: [
    "그때 가장 불확실했던 정보는 무엇이었나요?",
    "미니맵이나 상대 위치를 언제 마지막으로 확인했나요?",
  ],
  wave_management_error_like: [
    "그 웨이브를 밀고 움직이려던 의도였나요?",
    "라인이 박히기 전인지 후인지 기억하나요?",
  ],
  resource_management_error_like: [
    "체력/마나/쿨다운 상태를 인지하고 있었나요?",
    "그 자원 상태에서도 싸워야 한다고 본 이유는 무엇인가요?",
  ],
  tempo_loss_like: [
    "그 장면 이후 바로 귀환하거나 템포를 쓸 계획이었나요?",
    "남아서 얻으려던 골드나 플레이트가 있었나요?",
  ],
  blind_roaming_like: [
    "로밍 전에 상대 위치와 강가 시야를 확인했나요?",
    "그 로밍이 성공할 조건은 무엇이라고 봤나요?",
  ],
};

function makeCriteria(
  tierGroup: PlayerTierGroup,
  groupType: AutoSceneGroupType
): TierAwarePatternCriteria {
  const tierFocus = TIER_FOCUS[tierGroup];
  return {
    tierGroup,
    groupType,
    priorityFactors: [...tierFocus.priorityFactors, groupType],
    avoidOverCoaching: tierFocus.avoidOverCoaching,
    nextGameGoalStyle: tierFocus.nextGameGoalStyle,
    riotOnlySignals: RIOT_ONLY_SIGNALS[groupType],
    videoRequiredSignals: VIDEO_REQUIRED_SIGNALS[groupType],
    userConfirmationQuestions: GROUP_QUESTIONS[groupType],
    evidenceRequirement: EVIDENCE_REQUIREMENTS[groupType],
    cautionKo: `${tierFocus.cautionKo} 이 항목은 반복 패턴 후보 기준이며 확정 진단이 아닙니다.`,
  };
}

export const TIER_AWARE_PATTERN_CRITERIA = PLAYER_TIER_GROUPS.flatMap(
  (tierGroup) =>
    AUTO_SCENE_GROUP_TYPES.map((groupType) => makeCriteria(tierGroup, groupType))
) satisfies TierAwarePatternCriteria[];

export const TIER_NEXT_GAME_GOAL_TEMPLATES = [
  {
    tierGroup: "iron_silver",
    groupType: "push_gank_like",
    style: "basic_survival",
    templateKo:
      "다음 게임에서는 라인을 밀기 전에 강가 시야 또는 상대 정글 위치를 먼저 확인하세요.",
  },
  {
    tierGroup: "gold_platinum",
    groupType: "push_gank_like",
    style: "conditional_decision",
    templateKo:
      "다음 게임에서는 상대 정글 위치가 확인되기 전까지 시야 없는 쪽으로 압박하지 마세요.",
  },
  {
    tierGroup: "emerald_diamond",
    groupType: "push_gank_like",
    style: "tempo_and_cover",
    templateKo:
      "다음 게임에서는 아군 정글/서폿 커버 방향을 확인한 뒤 압박 방향을 정하세요.",
  },
  {
    tierGroup: "master_plus",
    groupType: "push_gank_like",
    style: "optimization",
    templateKo:
      "다음 게임에서는 오브젝트 전 60~90초 라인 크래시와 리콜 템포를 먼저 설계하세요.",
  },
  {
    tierGroup: "iron_silver",
    groupType: "no_flash_fight_like",
    style: "basic_survival",
    templateKo: "다음 게임에서는 점멸이 없을 때 먼저 긴 교전을 열지 마세요.",
  },
  {
    tierGroup: "gold_platinum",
    groupType: "no_flash_fight_like",
    style: "conditional_decision",
    templateKo: "다음 게임에서는 점멸이 없으면 아군 커버나 상대 핵심 스킬을 먼저 확인하세요.",
  },
  {
    tierGroup: "emerald_diamond",
    groupType: "no_flash_fight_like",
    style: "tempo_and_cover",
    templateKo: "다음 게임에서는 생존기 없는 타이밍에 싸움 방향과 커버 방향을 맞추세요.",
  },
  {
    tierGroup: "master_plus",
    groupType: "no_flash_fight_like",
    style: "optimization",
    templateKo: "다음 게임에서는 점멸 없는 타이밍의 교전 기대값과 손실 범위를 먼저 계산하세요.",
  },
  {
    tierGroup: "iron_silver",
    groupType: "solo_kill_conversion_like",
    style: "basic_survival",
    templateKo: "다음 게임에서는 킬 이후 체력이 낮으면 먼저 안전한 귀환을 선택하세요.",
  },
  {
    tierGroup: "gold_platinum",
    groupType: "solo_kill_conversion_like",
    style: "conditional_decision",
    templateKo: "다음 게임에서는 킬 이후 웨이브, 리콜, 플레이트 중 하나만 먼저 정하세요.",
  },
  {
    tierGroup: "emerald_diamond",
    groupType: "solo_kill_conversion_like",
    style: "tempo_and_cover",
    templateKo: "다음 게임에서는 킬 이후 웨이브 충돌과 정글 커버를 기준으로 전환을 정하세요.",
  },
  {
    tierGroup: "master_plus",
    groupType: "solo_kill_conversion_like",
    style: "optimization",
    templateKo: "다음 게임에서는 킬 이후 리콜 최적화와 반대 급부 손실을 같이 계산하세요.",
  },
  {
    tierGroup: "iron_silver",
    groupType: "objective_setup_like",
    style: "basic_survival",
    templateKo: "다음 게임에서는 오브젝트 전에 체력과 시야가 없으면 먼저 죽지 않는 선택을 하세요.",
  },
  {
    tierGroup: "gold_platinum",
    groupType: "objective_setup_like",
    style: "conditional_decision",
    templateKo: "다음 게임에서는 오브젝트 60초 전 라인 주도권과 귀환 타이밍을 확인하세요.",
  },
  {
    tierGroup: "emerald_diamond",
    groupType: "objective_setup_like",
    style: "tempo_and_cover",
    templateKo: "다음 게임에서는 오브젝트 전 웨이브 충돌과 정글/서폿 커버를 맞추세요.",
  },
  {
    tierGroup: "master_plus",
    groupType: "objective_setup_like",
    style: "optimization",
    templateKo: "다음 게임에서는 오브젝트 전 90초부터 리콜, 라인, 시야 순서를 설계하세요.",
  },
] as const satisfies readonly TierNextGameGoalTemplate[];

export function getTierCriteria(
  tierGroup: PlayerTierGroup,
  groupType: AutoSceneGroupType
) {
  return TIER_AWARE_PATTERN_CRITERIA.find(
    (criteria) =>
      criteria.tierGroup === tierGroup && criteria.groupType === groupType
  );
}

export function getTierConfidenceRule(
  tierGroup: PlayerTierGroup
): TierConfidenceRule {
  return (
    TIER_CONFIDENCE_RULES.find((rule) => rule.tierGroup === tierGroup) ??
    DEFAULT_CONFIDENCE_RULE
  );
}

export function getTierNextGameGoalTemplate(
  tierGroup: PlayerTierGroup,
  groupType: AutoSceneGroupType
) {
  return TIER_NEXT_GAME_GOAL_TEMPLATES.find(
    (template) =>
      template.tierGroup === tierGroup && template.groupType === groupType
  );
}
