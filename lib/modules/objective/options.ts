export const objectiveTypeOptions: [string, string][] = [
  ["void_grubs", "공허 유충"],
  ["dragon", "드래곤"],
  ["rift_herald", "협곡의 전령"],
  ["none", "특정 오브젝트가 아니었다"],
  ["unknown", "잘 모르겠다"],
];

export const timeToObjectiveOptions: [string, string][] = [
  ["ninety_to_sixty", "약 60~90초 전"],
  ["sixty_to_thirty", "약 30~60초 전"],
  ["under_thirty", "30초 이내"],
  ["already_spawned", "이미 생성된 뒤"],
  ["unknown", "잘 모르겠다"],
];

export const midPriorityBeforeObjectiveOptions: [string, string][] = [
  ["have_prio", "미드 주도권이 있었다"],
  ["no_prio", "미드 주도권이 없었다"],
  ["contested", "서로 밀고 있어 애매했다"],
  ["unknown", "잘 모르겠다"],
];

export const objectivePrepActionOptions: [string, string][] = [
  ["pushed_mid", "미드 웨이브를 먼저 밀었다"],
  ["recalled", "귀환했다"],
  ["stayed_low_resource", "자원이 부족한 채로 남았다"],
  ["moved_first", "먼저 오브젝트 쪽으로 움직였다"],
  ["followed_late", "라인을 정리하지 못하고 늦게 따라갔다"],
  ["took_plate_or_cs", "플레이트나 CS를 챙겼다"],
  ["placed_vision", "주변 시야를 준비했다"],
  ["did_not_prepare", "별도 준비를 하지 않았다"],
  ["unknown", "잘 모르겠다"],
];

export const allyJungleObjectiveIntentOptions: [string, string][] = [
  ["wants_objective", "우리 정글이 오브젝트를 원했다"],
  ["not_interested", "우리 정글이 오브젝트를 보지 않았다"],
  ["opposite_side", "우리 정글이 반대편에 있었다"],
  ["dead_or_recalled", "우리 정글이 죽었거나 귀환 중이었다"],
  ["unknown", "잘 모르겠다"],
];

export const resourceBeforeObjectiveOptions: [string, string][] = [
  ["healthy", "체력과 마나/기력이 충분했다"],
  ["low_hp", "체력이 부족했다"],
  ["low_mana_or_energy", "마나/기력이 부족했다"],
  ["no_flash_or_key_spell", "점멸이나 핵심 스킬이 없었다"],
  ["low_resource", "여러 자원이 부족했다"],
  ["unknown", "잘 모르겠다"],
];

export const alternativeGainAvailableOptions: [string, string][] = [
  ["plate", "미드 플레이트"],
  ["cs_wave", "미드 CS/웨이브"],
  ["opposite_vision", "반대편 시야"],
  ["roam", "다른 라인 로밍"],
  ["reset", "안전한 귀환"],
  ["none", "뚜렷한 대체 이득이 없었다"],
  ["unknown", "잘 모르겠다"],
];
