import type { CurrentOutcome } from "@/types/review";

export type OutcomeGroup = {
  label: string;
  options: { value: CurrentOutcome; label: string }[];
};

export const OUTCOME_GROUPS: OutcomeGroup[] = [
  {
    label: "킬 / 교전",
    options: [
      { value: "death", label: "죽었다" },
      { value: "solo_kill", label: "상대를 솔킬냈다" },
      { value: "failed_kill_attempt", label: "킬각을 봤지만 실패했다" },
      { value: "survived_but_lost", label: "살아남았지만 손해를 봤다" },
      { value: "fight_advantage", label: "교전에서 이득을 봤다" },
    ],
  },
  {
    label: "라인 / CS / 플레이트",
    options: [
      { value: "gained_lane_priority", label: "라인 주도권을 얻었다" },
      { value: "lost_lane_priority", label: "라인 주도권을 잃었다" },
      { value: "plate_or_cs_gain", label: "CS/플레이트 이득을 봤다" },
      { value: "plate_or_cs_loss", label: "CS/플레이트 손해를 봤다" },
      { value: "unclear_recall_timing", label: "귀환 타이밍이 애매했다" },
    ],
  },
  {
    label: "정글 / 갱킹 / 커버",
    options: [
      { value: "ganked_and_died", label: "갱킹을 당해 죽었다" },
      { value: "escaped_gank_but_lost", label: "갱킹은 피했지만 손해를 봤다" },
      { value: "ally_jungle_coordination_mismatch", label: "아군 정글과 호흡이 맞지 않았다" },
      { value: "fought_despite_known_enemy_jungle", label: "상대 정글 위치를 알고도 싸웠다" },
      { value: "cover_misread", label: "커버 차이를 잘못 읽었다" },
    ],
  },
  {
    label: "시야 / 와딩",
    options: [
      { value: "died_while_warding", label: "와딩하다 죽었다" },
      { value: "vision_loss", label: "시야를 못 잡아 손해를 봤다" },
      { value: "overextended_for_vision", label: "위험한 위치까지 들어갔다" },
      { value: "unclear_post_vision_decision", label: "시야는 잡았지만 이후 판단이 애매했다" },
    ],
  },
  {
    label: "오브젝트 / 교환 판단",
    options: [
      { value: "objective_fight_loss", label: "오브젝트 싸움에서 손해를 봤다" },
      { value: "secured_objective", label: "오브젝트를 챙겼다" },
      { value: "objective_trade_gain", label: "오브젝트를 포기하고 다른 이득을 봤다" },
      { value: "missed_objective_and_lane_gain", label: "오브젝트도 못 먹고 라인 이득도 놓쳤다" },
      { value: "unclear_objective_join_tradeoff", label: "합류할지 라인을 먹을지 애매했다" },
    ],
  },
  {
    label: "판단이 애매함",
    options: [
      { value: "unknown", label: "잘 모르겠다 / 판단이 애매하다" },
    ],
  },
];

export function getOutcomeLabel(value: CurrentOutcome): string {
  for (const group of OUTCOME_GROUPS) {
    const option = group.options.find((item) => item.value === value);
    if (option) return option.label;
  }

  if (value === "forced_enemy_recall") return "상대를 귀환시켰다";
  return "잘 모르겠다 / 판단이 애매하다";
}
