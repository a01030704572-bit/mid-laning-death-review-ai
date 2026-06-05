export type CoachingCategory =
  | "CORE_MID_LANE"
  | "TRADING_KILL_ANGLE"
  | "WAVE_MANAGEMENT"
  | "VISION_WARDING"
  | "JUNGLE_TRACKING"
  | "ROAMING_TEMPO"
  | "RECALL_TEMPO"
  | "ADVANTAGE_CONVERSION"
  | "MATCHUP_KNOWLEDGE";

export const COACHING_CATEGORY_LABELS: Record<CoachingCategory, string> = {
  CORE_MID_LANE: "Core Mid Lane Principles",
  TRADING_KILL_ANGLE: "Trading and Kill Angles",
  WAVE_MANAGEMENT: "Wave Management",
  VISION_WARDING: "Vision and Warding",
  JUNGLE_TRACKING: "Jungle Tracking and Gank Risk",
  ROAMING_TEMPO: "Roaming and Tempo",
  RECALL_TEMPO: "Recall and Tempo",
  ADVANTAGE_CONVERSION: "Advantage Conversion",
  MATCHUP_KNOWLEDGE: "Champion Identity and Matchup Knowledge",
};

export const DEFAULT_COACHING_CATEGORIES: CoachingCategory[] = [
  "CORE_MID_LANE",
];