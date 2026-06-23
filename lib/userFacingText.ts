const RAW_VALUE_LABELS: Record<string, string> = {
  unknown: "확인되지 않음",
  not_sure: "잘 모르는 상태",
  seen_far: "멀리서 확인됨",
  seen_near: "근처에서 확인됨",
  seen_but_ignored: "위치를 봤지만 위험을 감수함",
  seen_same_side: "같은 쪽에서 확인됨",
  seen_near_mid: "미드 근처에서 확인됨",
  seen_opposite_side: "반대쪽에서 확인됨",
  not_seen_recently: "최근 위치 정보 없음",
  dead_or_recalled: "죽었거나 귀환한 상태",
  toward_enemy_jungle: "상대 정글 쪽",
  toward_ally_jungle: "아군 정글 쪽",
  toward_ally_cover: "아군 커버 쪽",
  toward_top_side: "탑 쪽",
  toward_bot_side: "바텀 쪽",
  away_from_enemy_jungle: "상대 정글 반대쪽",
  center_lane: "미드 중앙",
  center_mid: "미드 중앙",
  opposite_side: "반대편",
  same_side_cover: "같은 쪽 커버",
  near_mid: "미드 근처",
  too_far: "너무 먼 상태",
  same_side_near_mid: "같은 쪽 미드 근처",
  same_side_but_far: "같은 쪽이지만 먼 상태",
  resetting: "귀환 중인 상태",
  clear_escape_route: "명확한 탈출 경로",
  escape_through_ally_side: "아군 쪽 탈출 경로",
  escape_through_enemy_side: "상대 쪽 탈출 경로",
  no_escape_plan: "탈출 계획 없음",
  ally_support_can_move: "아군 서폿이 움직일 수 있는 상태",
  enemy_support_missing: "상대 서폿이 보이지 않는 상태",
  enemy_support_can_move_first: "상대 서폿이 먼저 움직일 수 있는 상태",
  both_supports_unknown: "양쪽 서폿 위치가 불확실한 상태",
  seen_bot: "바텀에서 확인됨",
  missing: "보이지 않는 상태",
  roaming_mid: "미드로 움직이는 상태",
  can_move_first: "먼저 움직일 수 있는 상태",
  locked_bot: "바텀에 묶인 상태",
  no_prio: "미드 주도권 없음",
  have_prio: "미드 주도권 있음",
  contested: "미드 주도권이 경합 중인 상태",
  moved_first: "먼저 움직임",
  followed_late: "늦게 합류함",
  pushed_mid: "미드 웨이브를 먼저 밂",
  recalled: "귀환함",
  stayed_low_resource: "자원이 부족한 채로 남음",
  took_plate_or_cs: "플레이트나 CS를 챙김",
  placed_vision: "시야를 준비함",
  did_not_prepare: "별도 준비를 하지 않음",
  wants_objective: "오브젝트를 준비하려는 상태",
  not_interested: "오브젝트를 보지 않는 상태",
  healthy: "자원이 충분한 상태",
  low_hp: "체력이 부족한 상태",
  low_mana_or_energy: "마나나 기력이 부족한 상태",
  no_flash_or_key_spell: "점멸이나 핵심 스킬이 없는 상태",
  low_resource: "자원이 부족한 상태",
  ninety_to_sixty: "60~90초 전",
  sixty_to_thirty: "30~60초 전",
  under_thirty: "30초 이내",
  already_spawned: "이미 생성된 뒤",
  plate_objective: "플레이트를 노릴 수 있는 시간대",
  void_grubs: "공허 유충",
  dragon: "드래곤",
  rift_herald: "협곡의 전령",
  plate: "플레이트",
  plates: "플레이트를 노릴 수 있는 시간대",
  cs_wave: "CS 웨이브",
  opposite_vision: "반대편 시야",
  roam: "로밍",
  reset: "귀환",
  none: "뚜렷한 대안 없음",
  voidgrubs: "공허 유충",
  "void grubs": "공허 유충",
  grubs: "공허 유충",
  "플레이트_objective": "플레이트를 노릴 수 있는 시간대",
  "보이드 그럽": "공허 유충",
  enemyJungleInfoBeforeFight: "교전 전 상대 정글 위치 정보",
  allyJungleCoverBeforeFight: "교전 전 아군 정글 커버 상태",
  fightDirection: "교전 방향",
  enemySupportStateBeforeFight: "교전 전 상대 서폿 상태",
  allySupportStateBeforeFight: "교전 전 아군 서폿 상태",
  postKillEscapePlan: "교전 이후 이탈 계획",
  enemyJungleInfoState: "상대 정글 위치 정보",
  allyJungleCoverState: "아군 정글 커버 상태",
  currentOutcome: "선택한 결과",
  gameTime: "게임 시간대",
  objectiveType: "오브젝트 종류",
  timeToObjective: "오브젝트까지 남은 시간",
  midPriorityBeforeObjective: "오브젝트 전 미드 주도권",
  objectivePrepAction: "오브젝트 준비 행동",
  allyJungleObjectiveIntent: "아군 정글의 오브젝트 의도",
  resourceBeforeObjective: "오브젝트 전 자원 상태",
  alternativeGainAvailable: "가능한 대체 이득",
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceCompleteValue(text: string, rawValue: string, label: string) {
  if (/^[a-z0-9 ]+$/i.test(rawValue)) {
    return text.replace(
      new RegExp(`\\b${escapeRegExp(rawValue)}\\b`, "gi"),
      label
    );
  }

  return text.replaceAll(rawValue, label);
}

export function sanitizeUserFacingText(value: string | undefined) {
  if (!value) return value;

  const translated = Object.entries(RAW_VALUE_LABELS)
    .sort(([left], [right]) => right.length - left.length)
    .reduce(
      (text, [rawValue, label]) =>
        replaceCompleteValue(text, rawValue, label),
      value
    );

  const withoutSnakeCase = translated.replace(
    /\b[a-z]+(?:_[a-z0-9]+)+\b/gi,
    "확인되지 않은 상태"
  );

  return withoutSnakeCase.replace(
    /\b[a-z]+(?:[A-Z][a-z0-9]*)+\b/g,
    "입력 정보"
  );
}
