import type {
  CoachingMetric,
  CoachingTierBand,
  HabitPattern,
  SceneScenario,
  SceneScenarioId,
} from "@/types/coachingMetrics";

const TIER_EXPLANATIONS = {
  survival: {
    iron_silver: "죽지 않는 기본 행동 규칙을 먼저 고정합니다.",
    gold_platinum: "라인 상태와 정글/서폿 위치를 같이 보고 위험 행동을 줄입니다.",
    emerald_diamond: "웨이브 크래시, 커버, 템포를 묶어서 행동 타이밍을 판단합니다.",
    master_plus: "기대값, 기회비용, 양 팀 정글/서폿 템포까지 포함해 선택지를 비교합니다.",
  },
  objective: {
    iron_silver: "오브젝트 전에 죽지 않고 늦게 싸우지 않는 규칙을 우선합니다.",
    gold_platinum: "오브젝트 30~60초 전 리콜, 라인 정리, 시야 준비를 연결합니다.",
    emerald_diamond: "미드 주도권, 웨이브 상태, 정글 위치로 합류 가능성을 판단합니다.",
    master_plus: "오브젝트 기대값과 반대편 이득, 턴 교환 비용을 비교합니다.",
  },
} satisfies Record<string, Record<CoachingTierBand, string>>;

export const COACHING_METRICS: CoachingMetric[] = [
  {
    id: "mid_wave_before_action",
    concept: "wave_management",
    displayNameKo: "행동 전 미드 웨이브 상태",
    coachConceptKo: "웨이브를 밀고 움직이는지, 애매한 웨이브에서 먼저 나가는지 확인합니다.",
    tierExplanations: {
      iron_silver: "웨이브가 밀리지 않았으면 강가나 정글 쪽으로 먼저 나가지 않는 규칙을 잡습니다.",
      gold_platinum: "슬로우푸시/프리징/바운스 상태를 보고 이동 전 손실을 계산합니다.",
      emerald_diamond: "크래시 후 턴인지, 바운스백을 버리는 턴인지 구분합니다.",
      master_plus: "웨이브 기대값과 합류 기대값을 비교해 이동의 기회비용을 계산합니다.",
    },
    riotSignals: ["CS delta", "XP delta", "lane minion wave timing estimate"],
    videoSignals: ["wave position before movement", "crash into tower", "bounce-back wave"],
    appHistorySignals: ["MOVING_BEFORE_WAVE_CRASH", "JOINED_OBJECTIVE_WITH_BAD_WAVE"],
    unreliableVideoClaims: ["정확한 CS/XP 손실량", "상대 정글의 실제 동선"],
    reliability: "medium",
    mvpPriority: "high",
    userFacingGoalKo:
      "움직이기 전에 미드 웨이브가 상대 타워에 박혔는지 먼저 확인하고, 애매하면 추가 전진하지 않기.",
    relatedRiskTags: [
      "MOVING_BEFORE_WAVE_CRASH",
      "JOINED_OBJECTIVE_WITH_BAD_WAVE",
      "BAD_WAVE_POSITION",
    ],
    relatedScenarios: [
      "ganked_while_pushing",
      "poor_wave_state_before_roaming",
      "overstay_after_wave_crash",
    ],
  },
  {
    id: "enemy_jungle_tracking_before_forward",
    concept: "jungle_tracking",
    displayNameKo: "전진 전 상대 정글 추적",
    coachConceptKo: "상대 정글 위치를 모를 때 푸시, 와딩, 교전을 시작했는지 봅니다.",
    tierExplanations: {
      iron_silver: "상대 정글이 안 보이면 라인 중앙 밖 전진을 멈추는 규칙을 둡니다.",
      gold_platinum: "마지막 위치와 캠프 시간으로 같은 쪽 위험을 추정합니다.",
      emerald_diamond: "아군 커버와 상대 정글 도착 시간을 비교해 싸움 방향을 정합니다.",
      master_plus: "상대 정글의 턴과 내 웨이브 기대값을 비교해 전진 기대값을 계산합니다.",
    },
    riotSignals: ["player death event", "enemy jungle kill participation", "timeline kill assist"],
    videoSignals: ["minimap visibility", "fog entry", "fight direction relative to river"],
    appHistorySignals: ["ENEMY_JUNGLER_UNKNOWN", "FOUGHT_TOWARD_ENEMY_COVER"],
    unreliableVideoClaims: ["시야 밖 정글 위치 단정", "정글 의도 단정"],
    reliability: "medium",
    mvpPriority: "high",
    userFacingGoalKo:
      "상대 정글이 보이지 않으면 킬각보다 먼저 뒤로 빠질 경로와 아군 커버 위치를 확인하기.",
    relatedRiskTags: [
      "ENEMY_JUNGLER_UNKNOWN",
      "NO_RIVER_VISION",
      "FOUGHT_TOWARD_ENEMY_COVER",
      "IGNORED_KNOWN_ENEMY_JUNGLE",
    ],
    relatedScenarios: [
      "fight_with_unknown_enemy_jungler",
      "ganked_while_pushing",
      "unsafe_warding_into_fog",
    ],
  },
  {
    id: "support_roam_awareness",
    concept: "support_roam",
    displayNameKo: "상대 서폿 로밍 인지",
    coachConceptKo: "상대 서폿이 안 보일 때 미드 중앙 전진과 교전이 줄었는지 확인합니다.",
    tierExplanations: {
      iron_silver: "상대 서폿이 안 보이면 미드 중앙 밖 교전을 피하는 규칙을 둡니다.",
      gold_platinum: "봇 웨이브와 서폿 미아 타이밍을 미드 위험도로 연결합니다.",
      emerald_diamond: "서폿 로밍 템포와 아군 서폿 이동 가능성을 비교합니다.",
      master_plus: "서폿 템포가 만든 미드 압박과 반대편 보상까지 같이 평가합니다.",
    },
    riotSignals: ["support assist on mid kill", "enemy support position inference from events"],
    videoSignals: ["enemy support appears mid", "bot lane minimap absence", "collapse angle"],
    appHistorySignals: ["ENEMY_SUPPORT_ROAM_WINDOW", "ALLY_SUPPORT_CANNOT_MOVE"],
    unreliableVideoClaims: ["서폿이 왜 움직였는지에 대한 의도"],
    reliability: "medium",
    mvpPriority: "high",
    userFacingGoalKo:
      "상대 서폿이 안 보이면 미드 중앙 전진을 줄이고 봇 웨이브와 미니맵을 먼저 확인하기.",
    relatedRiskTags: [
      "ENEMY_SUPPORT_ROAM_WINDOW",
      "ALLY_SUPPORT_CANNOT_MOVE",
      "SIDE_PRESSURE_UNTRACKED",
    ],
    relatedScenarios: ["enemy_support_roam_collapse", "fight_with_unknown_enemy_jungler"],
  },
  {
    id: "recall_before_objective",
    concept: "recall_timing",
    displayNameKo: "오브젝트 전 리콜 타이밍",
    coachConceptKo: "오브젝트 직전 늦은 리콜이나 낮은 자원 체류를 확인합니다.",
    tierExplanations: TIER_EXPLANATIONS.objective,
    riotSignals: ["objective spawn timer", "player item purchase timing", "death before objective"],
    videoSignals: ["low HP or mana before objective", "late recall animation", "lane not pushed"],
    appHistorySignals: ["BAD_RECALL_BEFORE_OBJECTIVE", "STAYED_LOW_RESOURCE_BEFORE_OBJECTIVE"],
    reliability: "high",
    mvpPriority: "high",
    userFacingGoalKo: "오브젝트 60초 전에는 리콜과 라인 정리를 먼저 끝내기.",
    relatedRiskTags: [
      "BAD_RECALL_BEFORE_OBJECTIVE",
      "STAYED_LOW_RESOURCE_BEFORE_OBJECTIVE",
      "LOW_RESOURCE_STAY",
    ],
    relatedScenarios: ["bad_recall_before_objective", "death_before_objective"],
  },
  {
    id: "safe_vision_turn",
    concept: "vision",
    displayNameKo: "안전한 시야 턴",
    coachConceptKo: "시야를 잡기 전에 웨이브, 커버, 탈출 경로가 있었는지 봅니다.",
    tierExplanations: {
      iron_silver: "혼자 안 보이는 강가나 적 정글 입구에 들어가지 않는 규칙을 둡니다.",
      gold_platinum: "웨이브를 먼저 밀고 아군 위치를 확인한 뒤 시야를 잡습니다.",
      emerald_diamond: "시야 턴이 상대 턴인지 아군 턴인지 웨이브와 커버로 판단합니다.",
      master_plus: "시야 투자 기대값과 사망 시 오브젝트/웨이브 손실을 같이 계산합니다.",
    },
    riotSignals: ["ward event", "death after ward event", "objective killed after death"],
    videoSignals: ["fog entry", "ward placement path", "escape route visibility"],
    appHistorySignals: ["UNSAFE_WARDING", "DEEP_VISION_WITHOUT_COVER", "NO_RIVER_VISION"],
    unreliableVideoClaims: ["상대가 실제로 보유한 모든 시야"],
    reliability: "medium",
    mvpPriority: "high",
    userFacingGoalKo:
      "시야가 없고 상대 정글/서폿이 안 보이면 와드보다 먼저 웨이브와 아군 커버를 확인하기.",
    relatedRiskTags: ["UNSAFE_WARDING", "DEEP_VISION_WITHOUT_COVER", "NO_RIVER_VISION"],
    relatedScenarios: ["unsafe_warding_into_fog", "death_before_objective"],
  },
  {
    id: "fight_resource_gate",
    concept: "trading_positioning",
    displayNameKo: "교전 전 생존 자원 체크",
    coachConceptKo: "점멸, 이동기, 체력, 핵심 스킬이 없는 상태로 싸웠는지 봅니다.",
    tierExplanations: TIER_EXPLANATIONS.survival,
    riotSignals: ["death event", "summoner spell cooldown inference if available"],
    videoSignals: ["visible flash cooldown", "low HP bar", "escape spell use"],
    appHistorySignals: ["NO_FLASH_WINDOW", "NO_ESCAPE_TOOL", "LOW_HP_STAY"],
    reliability: "medium",
    mvpPriority: "high",
    userFacingGoalKo:
      "점멸이나 이동기가 없을 때는 킬각보다 먼저 탈출 경로가 있는지 확인하기.",
    relatedRiskTags: ["NO_FLASH_WINDOW", "NO_ESCAPE_TOOL", "LOW_HP_STAY"],
    relatedScenarios: ["fight_without_flash_or_escape", "solo_kill_attempt_failed"],
  },
  {
    id: "objective_setup_turn",
    concept: "objective_setup",
    displayNameKo: "오브젝트 준비 턴",
    coachConceptKo: "미드 주도권, 정글 의도, 대체 이득을 기준으로 오브젝트 판단을 봅니다.",
    tierExplanations: TIER_EXPLANATIONS.objective,
    riotSignals: ["objective kill event", "time to objective", "player death before objective"],
    videoSignals: ["mid priority", "rotation timing", "objective river vision"],
    appHistorySignals: ["OBJECTIVE_FORCED_WITHOUT_MID_PRIO", "OBJECTIVE_TRADEOFF_MISREAD"],
    reliability: "high",
    mvpPriority: "high",
    userFacingGoalKo:
      "오브젝트 전에는 미드 주도권, 정글 의도, 내 자원을 확인하고 불리하면 대체 이득으로 전환하기.",
    relatedRiskTags: [
      "OBJECTIVE_FORCED_WITHOUT_MID_PRIO",
      "OBJECTIVE_TRADEOFF_MISREAD",
      "MISSED_ALTERNATIVE_GAIN",
      "GOOD_OBJECTIVE_PREP_TURN",
    ],
    relatedScenarios: [
      "death_before_objective",
      "bad_recall_before_objective",
      "late_rotation_to_objective",
      "objective_trade_decision",
    ],
  },
  {
    id: "solo_kill_conversion",
    concept: "kill_to_value_conversion",
    displayNameKo: "솔로킬 이후 이득 전환",
    coachConceptKo: "킬 이후 웨이브, 플레이트, 리콜, 오브젝트 중 하나로 전환했는지 봅니다.",
    tierExplanations: {
      iron_silver: "킬을 낸 뒤 바로 죽지 않고 웨이브를 먼저 정리하는 습관을 잡습니다.",
      gold_platinum: "킬 이후 플레이트/리콜/시야 중 하나로 확실히 전환합니다.",
      emerald_diamond: "킬 이후 웨이브 크래시와 다음 턴 템포를 설계합니다.",
      master_plus: "킬 골드보다 이후 웨이브, 리콜, 오브젝트 기대값을 더 크게 봅니다.",
    },
    riotSignals: ["kill event", "turret plate event", "CS and gold delta after kill"],
    videoSignals: ["post-kill wave state", "plate attempt", "recall or roam after kill"],
    appHistorySignals: ["POST_KILL_ESCAPE_RISK", "NO_ESCAPE_PLAN", "MISSED_ALTERNATIVE_GAIN"],
    reliability: "medium",
    mvpPriority: "high",
    userFacingGoalKo:
      "솔로킬 이후에는 웨이브를 먼저 박고, 플레이트/리콜/오브젝트 중 하나로 이득을 전환하기.",
    relatedRiskTags: ["POST_KILL_ESCAPE_RISK", "NO_ESCAPE_PLAN", "MISSED_ALTERNATIVE_GAIN"],
    relatedScenarios: [
      "successful_solo_kill_good_conversion",
      "successful_solo_kill_poor_conversion",
      "solo_kill_attempt_failed",
    ],
  },
];

export const SCENE_SCENARIOS: SceneScenario[] = [
  {
    id: "ganked_while_pushing",
    displayNameKo: "푸시 중 갱킹 사망",
    definitionKo: "미드 웨이브를 밀거나 상대 쪽으로 선 상태에서 정글 개입으로 죽은 장면입니다.",
    riotEvidence: ["player death", "enemy jungle kill participation", "low CS/XP delta after death"],
    videoEvidence: ["pushed lane", "no river vision", "enemy jungle approach"],
    uncertaintyCases: ["정글 위치가 화면 밖일 수 있음", "실제 와드 유무는 영상만으로 불완전함"],
    relatedRiskTags: ["UNTRACKED_PUSH", "NO_RIVER_VISION", "ENEMY_JUNGLER_UNKNOWN"],
    repeatedHabitPatternId: "untracked_forward_pressure",
    tierFeedbackKo: {
      iron_silver: "시야가 없으면 푸시 후 추가 전진을 멈추는 규칙이 우선입니다.",
      gold_platinum: "푸시 전 상대 정글 마지막 위치와 강가 시야를 같이 확인해야 합니다.",
      emerald_diamond: "웨이브 크래시 전후 턴과 아군 정글 커버를 기준으로 전진 범위를 정해야 합니다.",
      master_plus: "푸시 기대값과 갱 회피 실패 시 손실 기대값을 비교해야 합니다.",
    },
    nextGameGoalKo:
      "시야가 없고 상대 정글/서폿이 안 보이면 푸시 후 추가 전진하지 말고 바로 이탈하기.",
    mvpPriority: "high",
  },
  {
    id: "enemy_support_roam_collapse",
    displayNameKo: "상대 서폿 로밍 붕괴",
    definitionKo: "상대 서폿 미아 또는 로밍 타이밍에 미드 교전/전진이 무너진 장면입니다.",
    riotEvidence: ["enemy support assist", "mid death event", "bot-side event gap"],
    videoEvidence: ["enemy support appears mid", "bot lane minimap absence", "collapse from fog"],
    uncertaintyCases: ["서폿 출발 시점은 영상 밖일 수 있음"],
    relatedRiskTags: ["ENEMY_SUPPORT_ROAM_WINDOW", "ALLY_SUPPORT_CANNOT_MOVE", "SIDE_PRESSURE_UNTRACKED"],
    repeatedHabitPatternId: "support_roam_blind_spot",
    tierFeedbackKo: {
      iron_silver: "상대 서폿이 안 보이면 미드 중앙 밖 싸움을 줄여야 합니다.",
      gold_platinum: "봇 웨이브와 서폿 미아를 미드 위험 신호로 연결해야 합니다.",
      emerald_diamond: "아군 서폿 이동 가능성과 상대 서폿 도착 시간을 비교해야 합니다.",
      master_plus: "서폿 템포가 만든 압박을 반대편 보상과 함께 계산해야 합니다.",
    },
    nextGameGoalKo:
      "상대 서폿이 안 보이면 미드 중앙 전진을 줄이고 봇 웨이브와 미니맵을 먼저 확인하기.",
    mvpPriority: "high",
  },
  {
    id: "fight_with_unknown_enemy_jungler",
    displayNameKo: "상대 정글 미확인 교전",
    definitionKo: "상대 정글 위치가 불명확한 상태에서 교전이나 킬각을 시작한 장면입니다.",
    riotEvidence: ["player death", "enemy jungle assist or nearby event"],
    videoEvidence: ["enemy jungle not visible", "fight toward fog", "no escape path"],
    uncertaintyCases: ["정글이 실제로 근처였는지는 Riot event가 없으면 추정입니다."],
    relatedRiskTags: ["ENEMY_JUNGLER_UNKNOWN", "FOUGHT_WITHOUT_ALLY_COVER", "FOUGHT_TOWARD_ENEMY_COVER"],
    repeatedHabitPatternId: "unknown_jungle_fight",
    tierFeedbackKo: {
      iron_silver: "정글이 안 보이면 킬각보다 생존을 먼저 보는 규칙이 필요합니다.",
      gold_platinum: "마지막 정글 위치와 라인 위치를 같이 확인해야 합니다.",
      emerald_diamond: "아군 커버와 싸움 방향을 같이 계산해야 합니다.",
      master_plus: "정글 개입 확률과 킬 성공 기대값을 비교해야 합니다.",
    },
    nextGameGoalKo:
      "상대 정글 위치가 안 보이면 교전 전에 아군 커버와 탈출 방향을 먼저 확인하기.",
    mvpPriority: "high",
  },
  {
    id: "fight_without_flash_or_escape",
    displayNameKo: "점멸/탈출기 없는 교전",
    definitionKo: "점멸, 이동기, 체력 같은 생존 자원이 부족한 상태로 싸운 장면입니다.",
    riotEvidence: ["death event", "low gain after fight"],
    videoEvidence: ["flash unavailable", "escape spell on cooldown", "low HP before fight"],
    uncertaintyCases: ["일부 스펠 쿨다운은 영상 해상도에 따라 읽기 어렵습니다."],
    relatedRiskTags: ["NO_FLASH_WINDOW", "NO_ESCAPE_TOOL", "LOW_HP_STAY"],
    repeatedHabitPatternId: "resource_blind_fighting",
    tierFeedbackKo: {
      iron_silver: "점멸이 없으면 먼저 싸우지 않는 단순 규칙이 필요합니다.",
      gold_platinum: "상대 핵심 스킬과 내 생존기를 같이 확인해야 합니다.",
      emerald_diamond: "생존기 없는 타이밍에는 웨이브와 커버로만 싸움 조건을 만들어야 합니다.",
      master_plus: "생존기 없는 교전의 기대값과 다음 턴 손실을 계산해야 합니다.",
    },
    nextGameGoalKo: "점멸이나 이동기가 없을 때는 킬각보다 탈출 경로를 먼저 확인하기.",
    mvpPriority: "high",
  },
  {
    id: "unsafe_warding_into_fog",
    displayNameKo: "안개 속 위험 와딩",
    definitionKo: "시야를 잡기 위해 혼자 안 보이는 강가나 적 정글 입구로 들어간 장면입니다.",
    riotEvidence: ["ward event", "death shortly after ward", "objective after death"],
    videoEvidence: ["fog entry", "ward placement path", "no ally cover nearby"],
    uncertaintyCases: ["실제 적 시야와 핑 정보는 확인이 어려울 수 있습니다."],
    relatedRiskTags: ["UNSAFE_WARDING", "DEEP_VISION_WITHOUT_COVER", "NO_RIVER_VISION"],
    repeatedHabitPatternId: "unsafe_vision_habit",
    tierFeedbackKo: {
      iron_silver: "혼자 안 보이는 곳에 들어가지 않는 규칙이 우선입니다.",
      gold_platinum: "웨이브를 밀고 아군 위치를 확인한 뒤 시야를 잡아야 합니다.",
      emerald_diamond: "시야 턴이 아군 턴인지 상대 턴인지 구분해야 합니다.",
      master_plus: "와드 하나의 기대값과 죽었을 때 오브젝트 손실을 비교해야 합니다.",
    },
    nextGameGoalKo: "와드 전에 웨이브, 아군 커버, 탈출 경로 중 두 가지 이상을 확인하기.",
    mvpPriority: "high",
  },
  {
    id: "solo_kill_attempt_failed",
    displayNameKo: "실패한 솔로킬 시도",
    definitionKo: "1:1 킬각을 봤지만 자원, 위치, 커버 문제로 손해나 사망으로 이어진 장면입니다.",
    riotEvidence: ["death event", "failed kill trade", "enemy gold gain"],
    videoEvidence: ["low resource before all-in", "fight direction", "enemy cooldown use"],
    uncertaintyCases: ["정확한 스킬 쿨다운은 영상만으로 제한적입니다."],
    relatedRiskTags: ["KILL_ANGLE_TUNNEL", "NO_FLASH_WINDOW", "COOLDOWN_DISRESPECT"],
    repeatedHabitPatternId: "kill_angle_tunnel",
    tierFeedbackKo: {
      iron_silver: "피와 점멸이 없으면 킬각을 멈추는 규칙이 필요합니다.",
      gold_platinum: "상대 핵심 스킬과 내 생존기를 확인하고 들어가야 합니다.",
      emerald_diamond: "정글/서폿 커버 방향과 웨이브 상태까지 포함해야 합니다.",
      master_plus: "킬 시도 기대값과 실패 시 웨이브/오브젝트 손실을 비교해야 합니다.",
    },
    nextGameGoalKo: "킬각 전에 내 점멸/이동기, 상대 핵심 스킬, 정글 위치를 한 번씩 확인하기.",
    mvpPriority: "medium",
  },
  {
    id: "successful_solo_kill_good_conversion",
    displayNameKo: "솔로킬 이후 좋은 이득 전환",
    definitionKo: "솔로킬 이후 웨이브, 플레이트, 리콜, 오브젝트 중 하나로 안정적으로 전환한 장면입니다.",
    riotEvidence: ["kill event", "turret plate or CS gain", "safe recall timing"],
    videoEvidence: ["wave crash after kill", "plate take", "clean reset"],
    uncertaintyCases: ["상대 정글 위치는 화면 밖일 수 있습니다."],
    relatedRiskTags: ["SAFE_RESET_WINDOW_POSSIBLE", "JUNGLE_COVER_AVAILABLE"],
    tierFeedbackKo: {
      iron_silver: "킬 이후 바로 욕심내지 않고 웨이브를 정리한 점이 좋습니다.",
      gold_platinum: "킬을 플레이트나 리콜 타이밍으로 전환한 점이 좋습니다.",
      emerald_diamond: "킬 이후 다음 웨이브 턴까지 만든 점이 좋습니다.",
      master_plus: "킬 이후 템포 기대값을 실제 이득으로 바꾼 좋은 장면입니다.",
    },
    nextGameGoalKo: "솔로킬 이후에도 웨이브를 먼저 박고 확실한 이득 하나로 전환하기.",
    mvpPriority: "medium",
  },
  {
    id: "successful_solo_kill_poor_conversion",
    displayNameKo: "솔로킬 이후 낮은 이득 전환",
    definitionKo: "솔로킬은 성공했지만 웨이브, 플레이트, 리콜, 오브젝트 전환이 약했던 장면입니다.",
    riotEvidence: ["kill event", "low CS or plate gain after kill", "enemy recovers tempo"],
    videoEvidence: ["uncleared wave after kill", "late recall", "no plate conversion"],
    uncertaintyCases: ["정확한 최선 전환은 다음 웨이브와 정글 위치가 필요합니다."],
    relatedRiskTags: ["POST_KILL_ESCAPE_RISK", "NO_ESCAPE_PLAN", "MISSED_ALTERNATIVE_GAIN"],
    repeatedHabitPatternId: "poor_kill_conversion",
    tierFeedbackKo: {
      iron_silver: "킬 이후 죽지 않고 웨이브부터 정리하는 습관이 필요합니다.",
      gold_platinum: "킬 이후 플레이트, 리콜, 시야 중 하나로 전환해야 합니다.",
      emerald_diamond: "킬 이후 크래시와 다음 턴 리콜 템포까지 만들어야 합니다.",
      master_plus: "킬 골드보다 이후 턴 기대값을 더 크게 봐야 합니다.",
    },
    nextGameGoalKo:
      "솔로킬 이후에는 웨이브를 먼저 박고, 플레이트/리콜/오브젝트 중 하나로 이득을 전환하기.",
    mvpPriority: "high",
  },
  {
    id: "death_before_objective",
    displayNameKo: "오브젝트 전 사망",
    definitionKo: "드래곤, 유충, 전령, 바론 준비 턴에 죽어 오브젝트 손실로 이어질 수 있는 장면입니다.",
    riotEvidence: ["death event", "time to objective", "objective killed in window"],
    videoEvidence: ["river setup", "low resource before objective", "bad mid priority"],
    uncertaintyCases: ["죽음이 실제 오브젝트 손실의 직접 원인인지는 추정일 수 있습니다."],
    relatedRiskTags: ["OBJECTIVE_FORCED_WITHOUT_MID_PRIO", "STAYED_LOW_RESOURCE_BEFORE_OBJECTIVE"],
    repeatedHabitPatternId: "objective_setup_death",
    tierFeedbackKo: TIER_EXPLANATIONS.objective,
    nextGameGoalKo: "오브젝트 60초 전에는 체력, 리콜, 미드 웨이브를 먼저 정리하기.",
    mvpPriority: "high",
  },
  {
    id: "bad_recall_before_objective",
    displayNameKo: "오브젝트 직전 나쁜 리콜",
    definitionKo: "오브젝트가 곧 나오는데 늦게 리콜하거나 리콜 타이밍을 놓친 장면입니다.",
    riotEvidence: ["objective timer", "purchase timing", "late arrival or missing objective"],
    videoEvidence: ["recall close to spawn", "wave left unpushed", "low resource stay"],
    uncertaintyCases: ["정확한 리콜 최적 타이밍은 팀 상태에 따라 달라질 수 있습니다."],
    relatedRiskTags: ["BAD_RECALL_BEFORE_OBJECTIVE", "LOW_RESOURCE_STAY"],
    repeatedHabitPatternId: "bad_objective_recall",
    tierFeedbackKo: TIER_EXPLANATIONS.objective,
    nextGameGoalKo: "오브젝트 60초 전에는 리콜과 라인 정리를 먼저 끝내기.",
    mvpPriority: "high",
  },
  {
    id: "late_rotation_to_objective",
    displayNameKo: "오브젝트 늦은 합류",
    definitionKo: "미드 웨이브나 리콜 문제로 오브젝트 교전에 늦게 도착한 장면입니다.",
    riotEvidence: ["objective kill event", "player not involved", "CS/XP tradeoff"],
    videoEvidence: ["late move from mid", "wave not pushed", "enemy moves first"],
    uncertaintyCases: ["합류가 옳았는지 포기가 옳았는지는 대체 이득 정보가 필요합니다."],
    relatedRiskTags: ["JOINED_OBJECTIVE_WITH_BAD_WAVE", "OBJECTIVE_TRADEOFF_MISREAD"],
    tierFeedbackKo: TIER_EXPLANATIONS.objective,
    nextGameGoalKo: "오브젝트 이동 전 미드 웨이브를 먼저 정리할 수 있는지 확인하기.",
    mvpPriority: "medium",
  },
  {
    id: "objective_trade_decision",
    displayNameKo: "오브젝트 교환 판단",
    definitionKo: "불리한 오브젝트 합류 대신 웨이브, 플레이트, 시야, 리콜을 선택해야 했던 장면입니다.",
    riotEvidence: ["objective lost", "alternative gold or CS gain", "death avoided or caused"],
    videoEvidence: ["bad fight setup", "available plate or wave", "ally jungle opposite side"],
    uncertaintyCases: ["팀 콜과 조합 기대값은 자동 판단이 어렵습니다."],
    relatedRiskTags: ["OBJECTIVE_TRADEOFF_MISREAD", "MISSED_ALTERNATIVE_GAIN"],
    tierFeedbackKo: TIER_EXPLANATIONS.objective,
    nextGameGoalKo: "오브젝트 합류가 어려우면 즉시 웨이브/플레이트/리콜 중 하나로 전환하기.",
    mvpPriority: "medium",
  },
  {
    id: "overstay_after_wave_crash",
    displayNameKo: "웨이브 크래시 후 과체류",
    definitionKo: "웨이브를 박은 뒤 리콜이나 시야 전환 대신 더 머물다 손해를 본 장면입니다.",
    riotEvidence: ["death after CS push", "plate greed", "low current gold spend timing"],
    videoEvidence: ["wave crashed", "stays for plate", "enemy collapse"],
    uncertaintyCases: ["플레이트 선택이 유효했는지는 정글/서폿 위치가 필요합니다."],
    relatedRiskTags: ["PLATE_GREED_WITHOUT_JUNGLE_COVER", "RECALL_GREED"],
    repeatedHabitPatternId: "overstay_after_turn",
    tierFeedbackKo: {
      iron_silver: "웨이브를 박았으면 더 욕심내기보다 귀환하는 습관이 필요합니다.",
      gold_platinum: "플레이트를 칠 수 있는 정글 커버가 있는지 확인해야 합니다.",
      emerald_diamond: "크래시 후 턴을 리콜, 시야, 로밍 중 하나로 정해야 합니다.",
      master_plus: "플레이트 기대값과 리콜 템포 손실을 비교해야 합니다.",
    },
    nextGameGoalKo: "웨이브를 박은 뒤에는 플레이트 욕심 전에 정글 커버와 리콜 타이밍을 확인하기.",
    mvpPriority: "medium",
  },
  {
    id: "missed_reset_timing",
    displayNameKo: "놓친 귀환 타이밍",
    definitionKo: "체력/마나/골드가 부족한데 귀환하지 않아 다음 턴 손실로 이어진 장면입니다.",
    riotEvidence: ["low gold spent timing", "death before spend", "CS/XP loss after stay"],
    videoEvidence: ["low resource", "wave state allows recall", "stays in lane"],
    uncertaintyCases: ["정확한 골드 보유량은 영상만으로 어렵습니다."],
    relatedRiskTags: ["RECALL_GREED", "LOW_HP_STAY", "LOW_RESOURCE_STAY"],
    repeatedHabitPatternId: "missed_reset_habit",
    tierFeedbackKo: TIER_EXPLANATIONS.survival,
    nextGameGoalKo: "체력이나 마나가 낮고 웨이브를 정리했다면 추가 교전보다 귀환을 먼저 선택하기.",
    mvpPriority: "medium",
  },
  {
    id: "poor_wave_state_before_roaming",
    displayNameKo: "로밍 전 나쁜 웨이브 상태",
    definitionKo: "미드 웨이브를 정리하지 못한 채 로밍하거나 합류해 손실이 생긴 장면입니다.",
    riotEvidence: ["CS/XP loss", "enemy mid CS gain", "late return timing"],
    videoEvidence: ["wave not crashed", "enemy mid can follow", "move before wave crash"],
    uncertaintyCases: ["로밍 성공 기대값은 영상 밖 교전 정보가 필요합니다."],
    relatedRiskTags: ["MOVING_BEFORE_WAVE_CRASH", "JOINED_OBJECTIVE_WITH_BAD_WAVE"],
    tierFeedbackKo: {
      iron_silver: "웨이브가 남아 있으면 먼저 정리하고 움직이는 규칙이 필요합니다.",
      gold_platinum: "상대 미드가 따라올 수 있는지 보고 움직여야 합니다.",
      emerald_diamond: "크래시 타이밍과 합류 도착 시간을 같이 계산해야 합니다.",
      master_plus: "로밍 기대값과 미드 웨이브 손실 기대값을 비교해야 합니다.",
    },
    nextGameGoalKo: "로밍 전에 미드 웨이브가 상대 타워에 박히는지 먼저 확인하기.",
    mvpPriority: "medium",
  },
  {
    id: "side_lane_overextension",
    displayNameKo: "사이드 과전진",
    definitionKo: "시야나 합류 정보 없이 사이드 라인에서 깊게 밀다 잡힌 장면입니다.",
    riotEvidence: ["side lane death", "objective or turret loss after death"],
    videoEvidence: ["deep side lane position", "no nearby ally", "enemy missing on minimap"],
    uncertaintyCases: ["정확한 팀 콜과 시야 상태는 제한적입니다."],
    relatedRiskTags: ["SIDE_PRESSURE_UNTRACKED", "NO_RIVER_VISION", "ENEMY_JUNGLER_UNKNOWN"],
    repeatedHabitPatternId: "side_overextension_habit",
    tierFeedbackKo: TIER_EXPLANATIONS.survival,
    nextGameGoalKo: "사이드에서 두 명 이상 안 보이면 다음 웨이브를 더 밀지 말고 뒤로 빠지기.",
    mvpPriority: "low",
  },
  {
    id: "positive_reinforcement_scene",
    displayNameKo: "좋은 판단 강화 장면",
    definitionKo: "죽음이나 손해가 아니라 좋은 회피, 좋은 리콜, 좋은 이득 전환을 강화할 장면입니다.",
    riotEvidence: ["survived pressure", "objective secured", "positive gold or XP delta"],
    videoEvidence: ["backs off from fog", "safe reset", "good wave crash"],
    uncertaintyCases: ["좋은 판단의 의도는 사용자 확인이 도움이 될 수 있습니다."],
    relatedRiskTags: ["GOOD_OBJECTIVE_PREP_TURN", "SAFE_RESET_WINDOW_POSSIBLE"],
    tierFeedbackKo: {
      iron_silver: "죽지 않는 선택을 반복 가능한 규칙으로 저장합니다.",
      gold_platinum: "좋은 라인 정리와 리콜 타이밍을 강화합니다.",
      emerald_diamond: "웨이브와 템포가 맞은 장면을 다음 게임 기준으로 삼습니다.",
      master_plus: "기대값이 높은 선택을 패턴으로 강화합니다.",
    },
    nextGameGoalKo: "좋았던 장면은 같은 조건을 다음 게임에서 다시 재현하기.",
    mvpPriority: "low",
  },
];

export const HABIT_PATTERNS: HabitPattern[] = [
  {
    id: "untracked_forward_pressure",
    displayNameKo: "정글 미확인 전진 습관",
    definitionKo: "상대 정글/시야 정보 없이 미드에서 앞으로 나가는 장면이 반복됩니다.",
    identifyingRiskTags: ["ENEMY_JUNGLER_UNKNOWN", "NO_RIVER_VISION", "UNTRACKED_PUSH"],
    identifyingScenarios: ["ganked_while_pushing", "fight_with_unknown_enemy_jungler"],
    threshold: { windowGames: 5, minOccurrences: 2 },
    userFacingGoalKo: "상대 정글이 안 보이면 푸시 후 한 칸 더 전진하지 않고 바로 이탈하기.",
    mvpPriority: "high",
  },
  {
    id: "support_roam_blind_spot",
    displayNameKo: "서폿 로밍 미인지 습관",
    definitionKo: "상대 서폿 미아가 미드 위험으로 연결되는 장면이 반복됩니다.",
    identifyingRiskTags: ["ENEMY_SUPPORT_ROAM_WINDOW", "ALLY_SUPPORT_CANNOT_MOVE"],
    identifyingScenarios: ["enemy_support_roam_collapse"],
    threshold: { windowGames: 5, minOccurrences: 2 },
    userFacingGoalKo: "상대 서폿이 안 보이면 미드 중앙 전진을 줄이고 봇 웨이브를 먼저 보기.",
    mvpPriority: "high",
  },
  {
    id: "unsafe_vision_habit",
    displayNameKo: "위험한 시야 진입 습관",
    definitionKo: "웨이브와 커버 없이 안개 속으로 와딩하러 들어가는 장면이 반복됩니다.",
    identifyingRiskTags: ["UNSAFE_WARDING", "DEEP_VISION_WITHOUT_COVER", "NO_RIVER_VISION"],
    identifyingScenarios: ["unsafe_warding_into_fog"],
    threshold: { windowGames: 5, minOccurrences: 2 },
    userFacingGoalKo: "와드 전에 웨이브, 아군 커버, 탈출 경로를 먼저 확인하기.",
    mvpPriority: "high",
  },
  {
    id: "resource_blind_fighting",
    displayNameKo: "생존 자원 미확인 교전 습관",
    definitionKo: "점멸, 이동기, 체력이 부족한 상태에서 교전하는 장면이 반복됩니다.",
    identifyingRiskTags: ["NO_FLASH_WINDOW", "NO_ESCAPE_TOOL", "LOW_HP_STAY"],
    identifyingScenarios: ["fight_without_flash_or_escape", "solo_kill_attempt_failed"],
    threshold: { windowGames: 5, minOccurrences: 2 },
    userFacingGoalKo: "교전 전 점멸/이동기/체력 중 하나라도 부족하면 먼저 빠질 경로를 확인하기.",
    mvpPriority: "high",
  },
  {
    id: "poor_kill_conversion",
    displayNameKo: "킬 이후 낮은 이득 전환 습관",
    definitionKo: "킬은 만들지만 웨이브, 플레이트, 리콜, 오브젝트 전환이 약한 장면이 반복됩니다.",
    identifyingRiskTags: ["POST_KILL_ESCAPE_RISK", "NO_ESCAPE_PLAN", "MISSED_ALTERNATIVE_GAIN"],
    identifyingScenarios: ["successful_solo_kill_poor_conversion"],
    threshold: { windowGames: 5, minOccurrences: 2 },
    userFacingGoalKo: "솔로킬 이후 웨이브를 먼저 박고 플레이트/리콜/오브젝트 중 하나로 전환하기.",
    mvpPriority: "high",
  },
  {
    id: "bad_objective_recall",
    displayNameKo: "오브젝트 전 리콜 실패 습관",
    definitionKo: "오브젝트 직전 리콜이나 낮은 자원 체류가 반복됩니다.",
    identifyingRiskTags: ["BAD_RECALL_BEFORE_OBJECTIVE", "STAYED_LOW_RESOURCE_BEFORE_OBJECTIVE"],
    identifyingScenarios: ["bad_recall_before_objective", "death_before_objective"],
    threshold: { windowGames: 5, minOccurrences: 2 },
    userFacingGoalKo: "오브젝트 60초 전에는 리콜과 라인 정리를 먼저 끝내기.",
    mvpPriority: "high",
  },
  {
    id: "objective_setup_death",
    displayNameKo: "오브젝트 준비 턴 사망 습관",
    definitionKo: "오브젝트 준비 구간에서 죽거나 무리하게 합류하는 장면이 반복됩니다.",
    identifyingRiskTags: ["OBJECTIVE_FORCED_WITHOUT_MID_PRIO", "OBJECTIVE_TRADEOFF_MISREAD"],
    identifyingScenarios: ["death_before_objective", "objective_trade_decision"],
    threshold: { windowGames: 5, minOccurrences: 2 },
    userFacingGoalKo: "오브젝트 전 미드 주도권, 정글 의도, 내 자원을 보고 불리하면 대체 이득으로 전환하기.",
    mvpPriority: "medium",
  },
];

export function getCoachingMetricById(id: string) {
  return COACHING_METRICS.find((metric) => metric.id === id);
}

export function getSceneScenarioById(id: SceneScenarioId | string) {
  return SCENE_SCENARIOS.find((scenario) => scenario.id === id);
}

export function getHabitPatternById(id: string) {
  return HABIT_PATTERNS.find((pattern) => pattern.id === id);
}

export function getHighPriorityMetrics() {
  return COACHING_METRICS.filter((metric) => metric.mvpPriority === "high");
}

export function getHighPriorityScenarios() {
  return SCENE_SCENARIOS.filter((scenario) => scenario.mvpPriority === "high");
}

export function getScenariosForRiskTag(riskTag: string) {
  return SCENE_SCENARIOS.filter((scenario) =>
    scenario.relatedRiskTags.includes(riskTag)
  );
}

export function getMetricsForScenario(scenarioId: SceneScenarioId) {
  return COACHING_METRICS.filter((metric) =>
    metric.relatedScenarios.includes(scenarioId)
  );
}

export function getTierFeedbackForScenario(
  scenarioId: SceneScenarioId,
  tierBand: CoachingTierBand
) {
  return getSceneScenarioById(scenarioId)?.tierFeedbackKo[tierBand];
}

export function getTierExplanationForMetric(
  metricId: string,
  tierBand: CoachingTierBand
) {
  return getCoachingMetricById(metricId)?.tierExplanations[tierBand];
}
