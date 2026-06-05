import { CoachingCategory, COACHING_CATEGORY_LABELS } from "./coachingCategories";

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

export function buildCoachingKnowledgeBlock(
  categories: CoachingCategory[]
): string {
  const uniqueCategories = Array.from(new Set(categories));

  return uniqueCategories
    .map((category) => {
      const label = COACHING_CATEGORY_LABELS[category];
      const hints = COACHING_CATEGORY_HINTS[category];

      return [
        `Category: ${category} (${label})`,
        ...hints.map((hint) => `- ${hint}`),
      ].join("\n");
    })
    .join("\n\n");
}