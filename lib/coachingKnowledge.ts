import { CoachingCategory, COACHING_CATEGORY_LABELS } from "./coachingCategories";
import { DeathReviewInput, RiskTag } from "@/types/review";

const LEVEL_3E_TAGS = new Set<RiskTag>([
  "KNOWN_JUNGLE_THREAT_IGNORED",
  "ENEMY_JUNGLER_NEARBY",
  "NO_ALLY_COVER",
  "FIGHT_TOWARD_ENEMY_JUNGLE",
  "POST_KILL_ESCAPE_RISK",
  "NO_ESCAPE_PLAN",
  "ENEMY_SUPPORT_MOVE_FIRST",
  "ALLY_JUNGLE_COVER_AVAILABLE",
  "FIGHT_TOWARD_ALLY_COVER",
  "ESCAPE_ROUTE_TO_ALLY_SIDE",
  "SUPPORT_ROAM_WINDOW",
  "REASONABLE_COVERED_KILL_ATTEMPT",
  "FOUGHT_TOWARD_ENEMY_COVER",
  "FOUGHT_WITHOUT_ALLY_COVER",
  "IGNORED_KNOWN_ENEMY_JUNGLE",
  "ENEMY_SUPPORT_ROAM_WINDOW",
  "ALLY_SUPPORT_CANNOT_MOVE",
  "FIGHT_DIRECTION_MISMATCH",
  "MID_JUNGLE_COVER_MISREAD",
  "JUNGLE_COVER_AVAILABLE",
]);

const ENEMY_COVER_DANGER_TAGS = new Set<RiskTag>([
  "FOUGHT_TOWARD_ENEMY_COVER",
  "FOUGHT_WITHOUT_ALLY_COVER",
  "FIGHT_DIRECTION_MISMATCH",
  "MID_JUNGLE_COVER_MISREAD",
  "IGNORED_KNOWN_ENEMY_JUNGLE",
  "ENEMY_JUNGLER_UNKNOWN",
  "ENEMY_JUNGLER_NEARBY",
  "NO_ALLY_COVER",
  "FIGHT_TOWARD_ENEMY_JUNGLE",
]);

export const COACHING_CATEGORY_HINTS: Record<CoachingCategory, string[]> = {
  CORE_MID_LANE: [
    "Review the player's decision flow, not only the final result.",
    "Separate what went well, what was risky, what is unknown, and what the player should try next.",
    "Avoid saying there is one confirmed answer without replay evidence.",
  ],

  TRADING_KILL_ANGLE: [
    "Trading is an exchange of HP, mana, cooldowns, summoner spells, wave position, and tempo.",
    "A trade is good only if the player gains more value than they lose.",
    "Check whether the play was enabled by enemy cooldowns, HP/resource advantage, matchup pressure, spacing, or enemy overextension.",
    "For survived-but-lost outcomes, judge whether HP loss, wave loss, recall timing, or tempo made the trade bad even without death.",
  ],

  WAVE_MANAGEMENT: [
    "Judge wave state by position, size, direction, and timing.",
    "Wave state affects trading safety, recall timing, roaming windows, plate pressure, CS/XP loss, and jungle risk.",
    "After a kill or forced recall, evaluate whether the player can safely crash the wave, recall, take plate, ward, or freeze.",
    "A pushed wave with no vision, unknown enemy jungle, and no Flash is a high-risk state.",
  ],

  VISION_WARDING: [
    "A ward is valuable only if it changes the player's decision.",
    "Unsafe warding often happens when the player enters fog without enemy mid location, enemy jungle tracking, ally support, or escape tools.",
    "Offensive warding usually requires lane pressure, enemy mid being unable to move first, ally support, or a safe escape path.",
    "For warding deaths, recognize the intention but explain which safety condition was missing.",
  ],

  JUNGLE_TRACKING: [
    "Jungle tracking means changing lane behavior based on where the enemy jungler could be.",
    "If enemy jungle is unknown, avoid long trades near enemy side, deep wards alone, plate greed with low HP, and chasing into fog.",
    "Wave position, vision state, Flash availability, and enemy CC should change how aggressively the player can play.",
    "After gaining an advantage, check whether the enemy jungler can still punish the follow-up action.",
  ],

  ROAMING_TEMPO: [
  "Roaming always has a cost: minions, experience, plate, recall timing, vision timing, lane priority, or tempo.",
  "A roam is good only if the expected reward is worth what the player gives up.",
  "Before roaming, check wave state, enemy mid follow potential, ally setup, enemy/ally HP, summoner spells, and jungle location.",
  "If the roam timing is too short, compare soft hovering, pinging, pushing mid, taking plate, warding, or recalling instead of forcing a full roam.",
  "When the player has lane priority, do not automatically recommend roaming. Compare roam reward against plate pressure, safe vision, objective setup, recall value, and enemy jungle risk.",
  ],

  RECALL_TEMPO: [
    "Recall timing should be judged by wave state, HP/mana, gold value, enemy return timing, and jungle threat.",
    "A good recall usually happens after a safe crash, forced enemy recall, or when staying creates more risk than value.",
    "Low HP, no Flash, no key cooldowns, and unknown enemy jungle often make recall safer than plate greed.",
    "Bad recall timing can turn a won trade or kill into CS, XP, or tempo loss.",
  ],

  ADVANTAGE_CONVERSION: [
  "A lead is not fully real until it is converted into wave, recall, plate, vision, roam, objective setup, or denial.",
  "For solo kill, forced recall, lane priority, or plate/CS gain outcomes, first explain how the advantage was created, then explain how to convert it.",
  "Post-advantage decisions should compare push, recall, plate, ward, roam, help jungle, objective setup, or freeze.",
  "When the player has lane priority, do not default to doing nothing. Compare safe vision, hover/roam, plate pressure, recall, and objective setup based on enemy jungle information and wave timing.",
  "If enemy jungle is unknown, the answer is not always to give up the advantage. Prefer lower-risk conversions such as shallow vision, controlled hover, safe plate timing, or reset after wave crash.",
  "Do not let hidden risks dominate the entire review when the player successfully gained an advantage.",
  ],

  MATCHUP_KNOWLEDGE: [
    "Use champion matchup knowledge as a hint, not as an absolute rule.",
    "Ask who has range advantage, who controls wave early, who wins short trades, who wins long trades, and which key spell decides the trade.",
    "Avoid overclaiming with phrases like 'always wins' or 'can never trade'.",
    "Use champion identity to improve the review, but keep conclusions cautious without replay evidence.",
  ],
};

function hasLevel3EContext(input?: DeathReviewInput, riskTags: RiskTag[] = []) {
  return (
    riskTags.some((tag) => LEVEL_3E_TAGS.has(tag)) ||
    Boolean(input && (
      input.enemyJungleInfoState !== "not_sure" ||
      input.enemyJungleLastSeenSide !== "unknown" ||
      input.allyJungleCoverState !== "unknown" ||
      input.fightDirectionRelativeToCover !== "unknown" ||
      input.postKillEscapePlan !== "unknown" ||
      input.supportRoamState !== "not_relevant" ||
      input.enemyJungleInfoBeforeFight !== undefined ||
      input.allyJungleCoverBeforeFight !== undefined ||
      input.fightDirection !== undefined ||
      input.enemySupportStateBeforeFight !== undefined ||
      input.allySupportStateBeforeFight !== undefined
    ))
  );
}

function buildLevel3EKnowledgeBlock(
  input?: DeathReviewInput,
  riskTags: RiskTag[] = []
): string {
  if (!hasLevel3EContext(input, riskTags)) return "";

  const tagSet = new Set<RiskTag>(riskTags);
  const enemyInfo = input?.enemyJungleInfoState ?? "not_sure";
  const tier = input?.playerTier ?? "unknown";

  const lines = [
    "Category: LEVEL_3E_JUNGLE_SUPPORT_COVER (Jungle / Support Cover & Fight Direction)",
    "- Distinguish unknown jungle from known-but-accepted risk.",
    "- If enemyJungleInfoState is seen_far, seen_near, or seen_but_ignored, do not say the enemy jungle location was unknown.",
    "- If enemyJungleInfoState is seen_but_ignored, frame it as information interpretation, risk acceptance, or disrespect of known cover.",
    "- If REASONABLE_COVERED_KILL_ATTEMPT is present, do not blindly criticize the play; evaluate ally cover, fight direction, fight duration, and escape route.",
    "- If the player fought toward enemy jungle without ally cover, emphasize post-kill escape risk and whether the kill became a low-value 1-for-1.",
    "- For before-fight fields, ask whether the duel was truly 1v1 or could realistically become 2v2 or 3v2 through jungle/support cover.",
    "- FOUGHT_TOWARD_ENEMY_COVER, FOUGHT_WITHOUT_ALLY_COVER, FIGHT_DIRECTION_MISMATCH, and MID_JUNGLE_COVER_MISREAD should be framed as review hypotheses, not certain causes.",
    "- When newer before-fight tags overlap older Level 3-E tags, explain the newer tag once and avoid duplicate risk-factor explanations.",
    "- enemyChampion is the enemy mid laner, not the enemy jungler. Do not write enemy jungler (enemyChampion) or put the enemy mid champion name after enemy jungler.",
    "- If enemyJungleInfoBeforeFight is seen_same_side or seen_near_mid, do not frame the main issue as no river vision; frame it as known enemy jungle information being ignored or risk-accepted.",
    "- For Master+ with support first move, enemy-side fight direction, post-kill escape risk, or no ally cover, discuss expected value, 1-for-1 tradeoff, wave/recall tempo loss, next 30-60 seconds, and opportunity cost when relevant.",
    `- Current tier: ${tier}. Current enemyJungleInfoState: ${enemyInfo}.`,
  ];

  if (tagSet.has("ENEMY_SUPPORT_MOVE_FIRST")) {
    lines.push("- ENEMY_SUPPORT_MOVE_FIRST: scale depth by tier; low tier gets simple unseen-support danger, high tier gets support first move and mid-jungle-support timing.");
  }

  const hasEnemyCoverDanger = Array.from(ENEMY_COVER_DANGER_TAGS).some((tag) =>
    tagSet.has(tag)
  );

  if (tagSet.has("JUNGLE_COVER_AVAILABLE") && !hasEnemyCoverDanger) {
    lines.push(
      "- JUNGLE_COVER_AVAILABLE: do not frame jungle/support cover as the main mistake when no enemy-cover danger tag is present.",
      "- Preferred Korean explanation: 교전 방향은 아군 정글 커버 쪽이었기 때문에 방향 선택 자체는 크게 나쁘지 않았을 수 있습니다. 다만 딜교 손해의 핵심은 상대 핵심 스킬 쿨타임 확인, 내 진입 타이밍, 웨이브 상태, 챔피언 상성 조건 쪽에 있었을 가능성이 높습니다.",
      "- Redirect the review toward enemy key cooldown confirmation, engage timing, wave state, champion matchup condition, and escape plan."
    );
  }

  return lines.join("\n");
}

export function buildCoachingKnowledgeBlock(
  categories: CoachingCategory[],
  input?: DeathReviewInput,
  riskTags: RiskTag[] = []
): string {
  const uniqueCategories = Array.from(new Set(categories));

  const categoryBlock = uniqueCategories
    .map((category) => {
      const label = COACHING_CATEGORY_LABELS[category];
      const hints = COACHING_CATEGORY_HINTS[category];

      return [
        `Category: ${category} (${label})`,
        ...hints.map((hint) => `- ${hint}`),
      ].join("\n");
    })
    .join("\n\n");

  const level3EBlock = buildLevel3EKnowledgeBlock(input, riskTags);

  return [categoryBlock, level3EBlock].filter(Boolean).join("\n\n");
}
