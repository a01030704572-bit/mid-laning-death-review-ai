import type {
  AutoSceneCandidate,
  AutoSceneGroupType,
  SimilarSceneCommonFactor,
  SimilarSceneGroup,
} from "@/types/autoScene";

export type GroupSimilarAutoScenesOptions = {
  minScenesPerGroup?: number;
  maxScenesPerGroup?: number;
};

const GROUP_ORDER: AutoSceneGroupType[] = [
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
];

const GROUP_TITLES: Record<AutoSceneGroupType, string> = {
  push_gank_like: "미드 푸시 중 갱킹/정글 개입 반복 후보",
  solo_kill_conversion_like: "솔로킬 이후 이득 전환 반복 후보",
  objective_setup_like: "오브젝트 전 준비 실패 반복 후보",
  no_flash_fight_like: "점멸/생존기 없는 교전 반복 후보",
  support_roam_collapse_like: "정글/서폿 커버 없는 교전 반복 후보",
  unsafe_warding_like: "위험한 시야/강가 진입 반복 후보",
  information_gathering_failure_like: "정보 수집 부족 반복 후보",
  wave_management_error_like: "웨이브 관리 실수 반복 후보",
  resource_management_error_like: "자원/쿨다운 관리 실수 반복 후보",
  tempo_loss_like: "이득 이후 템포 손실 반복 후보",
  blind_roaming_like: "시야/정보 없는 로밍 반복 후보",
};

function uniq<T>(values: T[]) {
  return Array.from(new Set(values));
}

function includesAny(values: string[], targets: string[]) {
  const valueSet = new Set(values);
  return targets.some((target) => valueSet.has(target));
}

function candidateText(candidate: AutoSceneCandidate) {
  return [
    candidate.type,
    ...candidate.riskTagSeeds,
    ...candidate.sceneCandidateSeeds,
    ...candidate.missingInfo,
  ]
    .join(" ")
    .toLowerCase();
}

function mentions(candidate: AutoSceneCandidate, patterns: string[]) {
  const text = candidateText(candidate);
  return patterns.some((pattern) => text.includes(pattern.toLowerCase()));
}

function matchesGroup(
  candidate: AutoSceneCandidate,
  groupType: AutoSceneGroupType
) {
  switch (groupType) {
    case "push_gank_like":
      return (
        candidate.type === "jungle_gank_death_candidate" ||
        candidate.sceneCandidateSeeds.includes("ganked_while_pushing") ||
        (candidate.type === "death_review_candidate" &&
          includesAny(candidate.riskTagSeeds, [
            "UNTRACKED_PUSH",
            "ENEMY_JUNGLER_UNKNOWN",
            "NO_RIVER_VISION",
            "POSSIBLE_GANK_SETUP",
          ]))
      );
    case "solo_kill_conversion_like":
      return (
        candidate.type === "post_kill_conversion_candidate" ||
        (candidate.type === "solo_kill_candidate" &&
          mentions(candidate, [
            "conversion",
            "recall",
            "plate",
            "wave",
            "post-kill",
            "post kill",
            "이득 전환",
            "리콜",
            "플레이트",
            "웨이브",
          ]))
      );
    case "objective_setup_like":
      return (
        candidate.type === "objective_setup_failure_candidate" ||
        mentions(candidate, [
          "objective",
          "dragon",
          "herald",
          "grub",
          "baron",
          "setup",
          "오브젝트",
          "드래곤",
          "유충",
          "전령",
          "바론",
        ])
      );
    case "no_flash_fight_like":
      return (
        candidate.type === "no_flash_fight_candidate" ||
        includesAny(candidate.riskTagSeeds, ["NO_FLASH_WINDOW", "NO_ESCAPE_TOOL"])
      );
    case "support_roam_collapse_like":
      return (
        candidate.type === "support_roam_collapse_candidate" ||
        includesAny(candidate.riskTagSeeds, [
          "ENEMY_SUPPORT_ROAM_WINDOW",
          "ALLY_SUPPORT_CANNOT_MOVE",
          "FOUGHT_WITHOUT_ALLY_COVER",
        ])
      );
    case "unsafe_warding_like":
      return (
        candidate.type === "unsafe_warding_candidate" ||
        mentions(candidate, [
          "warding",
          "vision",
          "river",
          "deep vision",
          "시야",
          "강가",
        ])
      );
    case "information_gathering_failure_like":
      return mentions(candidate, [
        "unknown",
        "vision",
        "tracking",
        "information",
        "정글 위치",
        "정보",
        "시야",
      ]);
    case "wave_management_error_like":
      return (
        candidate.type === "wave_management_error_candidate" ||
        mentions(candidate, [
          "wave",
          "crash",
          "freeze",
          "push",
          "recall timing",
          "웨이브",
          "라인",
          "크래시",
          "프리징",
        ])
      );
    case "resource_management_error_like":
      return (
        candidate.type === "poor_resource_management_candidate" ||
        includesAny(candidate.riskTagSeeds, [
          "LOW_HP_STAY",
          "LOW_RESOURCE_PLAY",
          "COOLDOWN_DISRESPECT",
        ]) ||
        mentions(candidate, [
          "hp",
          "mana",
          "cooldown",
          "체력",
          "마나",
          "기력",
          "쿨다운",
        ])
      );
    case "tempo_loss_like":
      return (
        candidate.type === "tempo_loss_candidate" ||
        candidate.type === "post_kill_conversion_candidate" ||
        mentions(candidate, [
          "tempo",
          "recall",
          "overstay",
          "plate",
          "gold",
          "템포",
          "리콜",
          "귀환",
          "골드",
          "플레이트",
        ])
      );
    case "blind_roaming_like":
      return (
        candidate.type === "blind_roaming_candidate" ||
        mentions(candidate, ["roam", "roaming", "로밍"])
      );
  }
}

function phaseOf(scene: AutoSceneCandidate) {
  if (scene.gameTimeSec < 600) return "early";
  if (scene.gameTimeSec < 1500) return "mid";
  return "late";
}

function factor(
  labelKo: string,
  scenes: AutoSceneCandidate[],
  predicate: (scene: AutoSceneCandidate) => boolean,
  evidenceCertainty: SimilarSceneCommonFactor["evidenceCertainty"],
  relatedRiskTags?: string[]
): SimilarSceneCommonFactor | null {
  const count = scenes.filter(predicate).length;
  if (count === 0) return null;
  return {
    labelKo,
    count,
    ratio: count / scenes.length,
    evidenceCertainty,
    relatedRiskTags,
  };
}

function buildCommonFactors(
  groupType: AutoSceneGroupType,
  scenes: AutoSceneCandidate[]
) {
  const factors = [
    factor(
      "상대 정글 개입/정글 위치 확인 필요",
      scenes,
      (scene) =>
        scene.type === "jungle_gank_death_candidate" ||
        includesAny(scene.riskTagSeeds, [
          "ENEMY_JUNGLER_UNKNOWN",
          "POSSIBLE_GANK_SETUP",
        ]) ||
        scene.sceneCandidateSeeds.includes("ganked_while_pushing"),
      "inferred_from_timeline",
      ["ENEMY_JUNGLER_UNKNOWN", "POSSIBLE_GANK_SETUP"]
    ),
    factor(
      "강가/시야 정보 확인 필요",
      scenes,
      (scene) =>
        includesAny(scene.riskTagSeeds, ["NO_RIVER_VISION", "UNSAFE_WARDING"]) ||
        mentions(scene, ["vision", "river", "warding", "시야", "강가"]),
      "needs_video_or_user_confirmation",
      ["NO_RIVER_VISION", "UNSAFE_WARDING"]
    ),
    factor(
      "솔로킬 이후 이득 전환 확인 필요",
      scenes,
      (scene) =>
        scene.type === "post_kill_conversion_candidate" ||
        scene.sceneCandidateSeeds.includes(
          "successful_solo_kill_poor_conversion"
        ) ||
        mentions(scene, ["conversion", "post kill", "이득 전환"]),
      "inferred_from_timeline",
      ["POST_KILL_ESCAPE_RISK", "NO_ESCAPE_PLAN"]
    ),
    factor(
      "오브젝트 전 사망/준비 문제 가능성",
      scenes,
      (scene) =>
        scene.type === "objective_setup_failure_candidate" ||
        mentions(scene, ["objective", "dragon", "baron", "오브젝트"]),
      "inferred_from_timeline",
      ["OBJECTIVE_TRADEOFF_MISREAD"]
    ),
    factor(
      "점멸/생존기 없는 상태",
      scenes,
      (scene) =>
        scene.type === "no_flash_fight_candidate" ||
        includesAny(scene.riskTagSeeds, ["NO_FLASH_WINDOW", "NO_ESCAPE_TOOL"]),
      "inferred_from_timeline",
      ["NO_FLASH_WINDOW", "NO_ESCAPE_TOOL"]
    ),
    factor(
      "서폿/정글 커버 확인 필요",
      scenes,
      (scene) =>
        scene.type === "support_roam_collapse_candidate" ||
        includesAny(scene.riskTagSeeds, [
          "ENEMY_SUPPORT_ROAM_WINDOW",
          "ALLY_SUPPORT_CANNOT_MOVE",
          "FOUGHT_WITHOUT_ALLY_COVER",
        ]),
      "needs_video_or_user_confirmation",
      [
        "ENEMY_SUPPORT_ROAM_WINDOW",
        "ALLY_SUPPORT_CANNOT_MOVE",
        "FOUGHT_WITHOUT_ALLY_COVER",
      ]
    ),
    factor(
      "웨이브 상태 확인 필요",
      scenes,
      (scene) => mentions(scene, ["wave", "crash", "push", "웨이브", "라인"]),
      "needs_video_or_user_confirmation"
    ),
    factor(
      "귀환/템포 전환 확인 필요",
      scenes,
      (scene) => mentions(scene, ["tempo", "recall", "gold", "템포", "리콜", "골드"]),
      "inferred_from_timeline"
    ),
    factor(
      "체력/자원 상태 확인 필요",
      scenes,
      (scene) =>
        includesAny(scene.riskTagSeeds, ["LOW_HP_STAY", "LOW_RESOURCE_PLAY"]) ||
        mentions(scene, ["hp", "mana", "cooldown", "체력", "마나", "쿨다운"]),
      "needs_video_or_user_confirmation",
      ["LOW_HP_STAY", "LOW_RESOURCE_PLAY", "COOLDOWN_DISRESPECT"]
    ),
    factor(
      "로밍 전 정보 확인 필요",
      scenes,
      (scene) => mentions(scene, ["roam", "roaming", "로밍"]),
      "needs_video_or_user_confirmation"
    ),
  ].filter((item): item is SimilarSceneCommonFactor => item !== null);

  const groupSpecific = factors.filter((item) => {
    if (groupType === "push_gank_like") return item.labelKo.includes("정글");
    if (groupType === "solo_kill_conversion_like") return item.labelKo.includes("솔로킬");
    if (groupType === "objective_setup_like") return item.labelKo.includes("오브젝트");
    if (groupType === "no_flash_fight_like") return item.labelKo.includes("점멸");
    if (groupType === "support_roam_collapse_like") return item.labelKo.includes("커버");
    if (groupType === "unsafe_warding_like") return item.labelKo.includes("시야");
    if (groupType === "wave_management_error_like") return item.labelKo.includes("웨이브");
    if (groupType === "resource_management_error_like") return item.labelKo.includes("체력");
    if (groupType === "tempo_loss_like") return item.labelKo.includes("템포");
    if (groupType === "blind_roaming_like") return item.labelKo.includes("로밍");
    return item.labelKo.includes("정보") || item.labelKo.includes("시야");
  });

  return uniq([...groupSpecific, ...factors]).sort(
    (left, right) =>
      right.count - left.count || left.labelKo.localeCompare(right.labelKo)
  );
}

function buildVariableFactors(scenes: AutoSceneCandidate[]) {
  const variableFactors: string[] = [];
  const championNames = uniq(
    scenes.map((scene) => scene.reviewSeed.championName).filter(Boolean)
  );
  const opponentChampionNames = uniq(
    scenes
      .map((scene) => scene.reviewSeed.opponentChampionName)
      .filter(Boolean)
  );
  const matchIds = uniq(scenes.map((scene) => scene.matchId));
  const phases = uniq(scenes.map(phaseOf));

  if (championNames.length > 1) {
    variableFactors.push("플레이 챔피언이 장면마다 다릅니다.");
  }
  if (opponentChampionNames.length > 1) {
    variableFactors.push("상대 챔피언이 장면마다 다릅니다.");
  }
  if (matchIds.length > 1) {
    variableFactors.push("여러 경기에서 반복된 후보입니다.");
  }
  if (phases.length > 1) {
    variableFactors.push("발생 시간대가 장면마다 다릅니다.");
  }

  return variableFactors;
}

function buildGroup(groupType: AutoSceneGroupType, scenes: AutoSceneCandidate[]) {
  const firstScene = scenes[0];
  return {
    id: `group:${groupType}:${firstScene.matchId}:${firstScene.gameTimeSec}`,
    groupType,
    titleKo: GROUP_TITLES[groupType],
    scenes,
    commonFactors: buildCommonFactors(groupType, scenes),
    variableFactors: buildVariableFactors(scenes),
  };
}

export function groupSimilarAutoScenes(
  candidates: AutoSceneCandidate[],
  options: GroupSimilarAutoScenesOptions = {}
): SimilarSceneGroup[] {
  const minScenesPerGroup = options.minScenesPerGroup ?? 2;
  const maxScenesPerGroup = options.maxScenesPerGroup ?? 5;
  const sortedCandidates = [...candidates].sort(
    (left, right) =>
      left.gameTimeSec - right.gameTimeSec || left.id.localeCompare(right.id)
  );

  return GROUP_ORDER.flatMap((groupType) => {
    const seenSceneIds = new Set<string>();
    const scenes = sortedCandidates.filter((candidate) => {
      if (!matchesGroup(candidate, groupType)) return false;
      if (seenSceneIds.has(candidate.id)) return false;
      seenSceneIds.add(candidate.id);
      return true;
    });

    const limitedScenes = scenes.slice(0, maxScenesPerGroup);
    if (limitedScenes.length < minScenesPerGroup) return [];
    return [buildGroup(groupType, limitedScenes)];
  });
}
