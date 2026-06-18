import {
  CoachingCategory,
  DEFAULT_COACHING_CATEGORIES,
} from "./coachingCategories";
import { DeathReviewInput, RiskTag } from "@/types/review";

function textIncludesAny(value: string | undefined, keywords: string[]): boolean {
  if (!value) return false;

  const normalized = value.toLowerCase();

  return keywords.some((keyword) =>
    normalized.includes(keyword.toLowerCase())
  );
}

function addCategory(
  categories: Set<CoachingCategory>,
  category: CoachingCategory
) {
  categories.add(category);
}

export function mapCoachingCategories(
  input: DeathReviewInput,
  riskTags: RiskTag[]
): CoachingCategory[] {
  const categories = new Set<CoachingCategory>(DEFAULT_COACHING_CATEGORIES);

  const riskTagSet = new Set<RiskTag>(riskTags);

  const currentOutcome = input.currentOutcome;
  const reviewFocus = input.deathCause ?? "";
  const beforeAction = input.beforeDeathAction ?? "";
  const laneState = input.laneState ?? "";
  const visionState = input.visionState ?? "";
  const enemyJungleLocation = input.enemyJungleLocation ?? "";
  const freeDescription = input.freeDescription ?? "";

  const combinedText = [
    reviewFocus,
    beforeAction,
    laneState,
    visionState,
    enemyJungleLocation,
    freeDescription,
  ].join(" ");

  // Outcome-based categories
  if (currentOutcome === "death") {
    addCategory(categories, "JUNGLE_TRACKING");
  }

  if (currentOutcome === "survived_but_lost") {
    addCategory(categories, "TRADING_KILL_ANGLE");
    addCategory(categories, "WAVE_MANAGEMENT");
    addCategory(categories, "RECALL_TEMPO");
  }

  if (
    currentOutcome === "solo_kill" ||
    currentOutcome === "forced_enemy_recall"
  ) {
    addCategory(categories, "TRADING_KILL_ANGLE");
    addCategory(categories, "ADVANTAGE_CONVERSION");
  }

  if (
    currentOutcome === "gained_lane_priority" ||
    currentOutcome === "plate_or_cs_gain"
  ) {
    addCategory(categories, "WAVE_MANAGEMENT");
    addCategory(categories, "ADVANTAGE_CONVERSION");
  }

  // Risk tag-based categories
  if (
    riskTagSet.has("NO_RIVER_VISION") ||
    riskTagSet.has("ONE_SIDE_VISION_ONLY") ||
    riskTagSet.has("UNSAFE_WARDING") ||
    riskTagSet.has("PRE_LANE_VISION_RISK")
  ) {
    addCategory(categories, "VISION_WARDING");
  }

  if (
    riskTagSet.has("ENEMY_JUNGLER_UNKNOWN") ||
    riskTagSet.has("OUTDATED_JUNGLE_INFO") ||
    riskTagSet.has("UNTRACKED_PUSH") ||
    riskTagSet.has("POSSIBLE_GANK_SETUP") ||
    riskTagSet.has("MID_JUNGLE_COLLAPSE") ||
    riskTagSet.has("SIDE_PRESSURE_UNTRACKED") ||
    riskTagSet.has("KNOWN_JUNGLE_THREAT_IGNORED") ||
    riskTagSet.has("ENEMY_JUNGLER_NEARBY") ||
    riskTagSet.has("NO_ALLY_COVER") ||
    riskTagSet.has("FIGHT_TOWARD_ENEMY_JUNGLE") ||
    riskTagSet.has("POST_KILL_ESCAPE_RISK") ||
    riskTagSet.has("ALLY_JUNGLE_COVER_AVAILABLE") ||
    riskTagSet.has("REASONABLE_COVERED_KILL_ATTEMPT") ||
    riskTagSet.has("FOUGHT_TOWARD_ENEMY_COVER") ||
    riskTagSet.has("FOUGHT_WITHOUT_ALLY_COVER") ||
    riskTagSet.has("IGNORED_KNOWN_ENEMY_JUNGLE") ||
    riskTagSet.has("FIGHT_DIRECTION_MISMATCH") ||
    riskTagSet.has("MID_JUNGLE_COVER_MISREAD")
  ) {
    addCategory(categories, "JUNGLE_TRACKING");
  }

  if (
    riskTagSet.has("ENEMY_SUPPORT_MOVE_FIRST") ||
    riskTagSet.has("SUPPORT_ROAM_WINDOW") ||
    riskTagSet.has("ENEMY_SUPPORT_ROAM_WINDOW") ||
    riskTagSet.has("ALLY_SUPPORT_CANNOT_MOVE")
  ) {
    addCategory(categories, "ROAMING_TEMPO");
  }

  if (
    riskTagSet.has("BAD_WAVE_POSITION") ||
    riskTagSet.has("GREEDY_CRASH_ATTEMPT") ||
    riskTagSet.has("CS_GREED") ||
    riskTagSet.has("RECALL_GREED")
  ) {
    addCategory(categories, "WAVE_MANAGEMENT");
  }

  if (
    riskTagSet.has("KILL_ANGLE_TUNNEL") ||
    riskTagSet.has("COOLDOWN_DISRESPECT") ||
    riskTagSet.has("LOW_HP_STAY") ||
    riskTagSet.has("LOW_RESOURCE_STAY")
  ) {
    addCategory(categories, "TRADING_KILL_ANGLE");
  }

  if (riskTagSet.has("RECALL_GREED")) {
    addCategory(categories, "RECALL_TEMPO");
  }

  // Text-based categories
  if (
    textIncludesAny(combinedText, [
      "wave",
      "웨이브",
      "라인",
      "push",
      "crash",
      "freeze",
      "프리즈",
      "slow push",
      "슬로우",
      "plate",
      "플레이트",
      "cs",
      "미니언",
    ])
  ) {
    addCategory(categories, "WAVE_MANAGEMENT");
  }

  if (
    textIncludesAny(combinedText, [
      "trade",
      "딜교",
      "킬각",
      "solo kill",
      "솔킬",
      "스킬",
      "cooldown",
      "쿨타임",
      "all-in",
      "올인",
      "진입",
    ])
  ) {
    addCategory(categories, "TRADING_KILL_ANGLE");
  }

  if (
    textIncludesAny(combinedText, [
      "ward",
      "와드",
      "vision",
      "시야",
      "river",
      "강가",
      "fog",
      "부쉬",
      "칼부",
      "raptor",
    ])
  ) {
    addCategory(categories, "VISION_WARDING");
  }

  if (
    textIncludesAny(combinedText, [
      "jungle",
      "정글",
      "gank",
      "갱",
      "jungler",
      "정글러",
      "동선",
    ])
  ) {
    addCategory(categories, "JUNGLE_TRACKING");
  }

  if (
    textIncludesAny(combinedText, [
      "roam",
      "로밍",
      "move",
      "합류",
      "side",
      "사이드",
      "bot",
      "바텀",
      "top",
      "탑",
      "objective",
      "오브젝트",
      "dragon",
      "용",
      "herald",
      "전령",
    ])
  ) {
    addCategory(categories, "ROAMING_TEMPO");
  }

  if (
    textIncludesAny(combinedText, [
      "recall",
      "귀환",
      "reset",
      "리셋",
      "집",
      "아이템",
      "tempo",
      "템포",
    ])
  ) {
    addCategory(categories, "RECALL_TEMPO");
  }

  if (
    textIncludesAny(combinedText, [
      "advantage",
      "이득",
      "굴리",
      "convert",
      "전환",
      "priority",
      "주도권",
      "plate",
      "플레이트",
    ])
  ) {
    addCategory(categories, "ADVANTAGE_CONVERSION");
  }

  if (
    input.myChampion ||
    input.enemyChampion ||
    textIncludesAny(combinedText, [
      "matchup",
      "구도",
      "상성",
      "근거리",
      "원거리",
      "메이지",
      "암살자",
      "챔피언",
    ])
  ) {
    addCategory(categories, "MATCHUP_KNOWLEDGE");
  }

  return Array.from(categories);
}
