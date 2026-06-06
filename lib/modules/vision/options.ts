export const laneStateDetailOptions: [string, string][] = [
  ["crashed_into_enemy_tower", "라인을 상대 타워에 박았다"],
  ["slow_pushing_to_enemy", "내 빅웨이브가 천천히 상대 쪽으로 가는 중이었다"],
  ["enemy_freezing", "상대가 프리징을 걸고 있었다"],
  ["neutral_middle", "라인이 중앙 근처였다"],
  ["being_pushed_in", "내가 라인을 받아먹는 중이었다"],
  ["big_wave_bouncing_back", "상대 타워에 박힌 뒤 라인이 다시 나에게 오는 중이었다"],
  ["unknown", "잘 모르겠다"],
];

export const allyJunglePositionOptions: [string, string][] = [
  ["same_side", "우리 정글이 내가 움직이려는 쪽에 있었다"],
  ["opposite_side", "우리 정글이 반대쪽에 있었다"],
  ["near_mid", "우리 정글이 미드 근처에 있었다"],
  ["dead_or_resetting", "우리 정글이 죽었거나 귀환 중이었다"],
  ["unknown", "우리 정글 위치를 모르겠다"],
];

export const visionPurposeOptions: [string, string][] = [
  ["river_control", "강가 기본 시야를 잡으려 했다"],
  ["enemy_jungle_entrance", "상대 정글 입구 시야를 잡으려 했다"],
  ["deep_ward", "상대 정글 깊숙한 시야를 잡으려 했다"],
  ["objective_setup", "용/전령 준비 시야를 잡으려 했다"],
  ["protect_roam", "로밍 가기 전에 안전 시야를 잡으려 했다"],

  // Level 3-D: trade / matchup context
  ["trade_setup", "딜교 각을 보려 했다"],
  ["cs_under_pressure", "위험하지만 CS를 먹으려 했다"],
  ["survive_under_tower", "타워 근처에서 버티려 했다"],
  ["all_in_or_kill_angle", "킬각/올인을 보려 했다"],
  ["escape_or_disengage", "빠지려 했다"],

  ["unknown", "정확히 모르겠다"],
];

export const postPushIntentOptions: [string, string][] = [
  ["take_plate", "플레이트를 먹으려 했다"],
  ["roam", "로밍을 가려 했다"],
  ["recall", "귀환하려 했다"],
  ["ward", "시야를 잡으려 했다"],
  ["invade_with_jungle", "우리 정글과 함께 들어가려 했다"],
  ["hover_side_lane", "사이드 라인을 봐주려 했다"],
  ["stay_for_cs", "그냥 CS/경험치를 더 먹으려 했다"],

  // Level 3-D: trade / matchup context
  ["short_trade", "짧은 딜교를 하려 했다"],
  ["all_in", "킬각/올인을 보려 했다"],
  ["last_hit_under_pressure", "위험하지만 CS를 먹으려 했다"],
  ["hold_wave_under_tower", "타워 근처에서 라인을 받아먹으려 했다"],
  ["escape_or_disengage", "빠지려 했다"],

  ["unknown", "정확히 모르겠다"],
];

export const teamSideOptions: [string, string][] = [
  ["blue_team", "블루팀"],
  ["red_team", "레드팀"],
  ["unknown", "잘 모르겠다"],
];

export const movementSideOptions: [string, string][] = [
  ["top_side", "탑쪽 강가/정글 방향으로 움직였다"],
  ["bot_side", "바텀쪽 강가/정글 방향으로 움직였다"],
  ["unknown", "잘 모르겠다"],
];

export const wardLocationDetailOptions: [string, string][] = [
  ["own_side_river_bush", "우리 쪽 강가 부쉬"],
  ["pixel_bush", "픽셀 부쉬"],
  ["enemy_raptor_entrance", "상대 칼부 입구"],
  ["enemy_blue_entrance", "상대 블루 입구"],
  ["enemy_red_entrance", "상대 레드 입구"],
  ["enemy_deep_raptor", "상대 칼부 깊은 와드"],
  ["enemy_deep_blue", "상대 블루 쪽 깊은 와드"],
  ["objective_river", "용/전령 앞 강가"],
  ["unknown", "정확히 모르겠다"],
];

export const enemyMidStateOptions: [string, string][] = [
  ["visible_under_tower", "상대 미드가 타워 아래에 보였다"],
  ["visible_in_lane", "상대 미드가 라인에 보였다"],
  ["missing", "상대 미드가 사라졌다"],
  ["following_me", "상대 미드가 나를 따라오는 것 같았다"],
  ["resetting_or_dead", "상대 미드가 귀환 중이거나 죽어 있었다"],
  ["unknown", "잘 모르겠다"],
];

export const allyJungleSideDetailOptions: [string, string][] = [
  ["top_side_jungle", "우리 정글이 탑쪽 정글에 있었다"],
  ["bot_side_jungle", "우리 정글이 바텀쪽 정글에 있었다"],
  ["near_mid_top_side", "우리 정글이 미드 근처 탑쪽에 있었다"],
  ["near_mid_bot_side", "우리 정글이 미드 근처 바텀쪽에 있었다"],
  ["base_or_dead", "우리 정글이 귀환 중이거나 죽어 있었다"],
  ["unknown", "잘 모르겠다"],
];