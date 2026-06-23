import type {
  HabitPattern,
  HabitPatternAnalysis,
  HabitPatternLevel,
  ReviewSceneRecord,
} from "@/types/history";
import type { RiskTag } from "@/types/review";

type HabitDefinition = {
  label: string;
  goal: string;
};

const HABIT_DEFINITIONS: Partial<Record<RiskTag, HabitDefinition>> = {
  LOW_HP_STAY: {
    label: "낮은 체력으로 라인에 남는 판단",
    goal: "체력이 낮으면 딜교보다 웨이브 정리와 귀환을 먼저 판단하기.",
  },
  NO_FLASH_WINDOW: {
    label: "점멸이 없을 때 교전하거나 잔류하는 판단",
    goal: "점멸이 없으면 상대 정글 위치와 탈출 경로 확인 전 교전하지 않기.",
  },
  COOLDOWN_DISRESPECT: {
    label: "핵심 스킬 쿨타임을 무시한 교전",
    goal: "교전 전에 내 핵심 스킬과 상대 핵심 스킬 상태를 한 번 확인하기.",
  },
  FOUGHT_TOWARD_ENEMY_COVER: {
    label: "상대 정글·서폿 커버 방향으로 이어진 교전",
    goal: "교전 전에 상대 커버 방향과 킬 이후 탈출 방향을 먼저 확인하기.",
  },
  FIGHT_DIRECTION_MISMATCH: {
    label: "아군 커버와 반대 방향으로 이어진 교전",
    goal: "교전은 아군 정글 커버 쪽으로 짧게 끝내는 방향을 선택하기.",
  },
  FOUGHT_WITHOUT_ALLY_COVER: {
    label: "아군 커버 없이 이어간 교전",
    goal: "아군 정글·서폿이 움직일 수 없으면 긴 교전을 피하기.",
  },
  IGNORED_KNOWN_ENEMY_JUNGLE: {
    label: "확인된 상대 정글 정보를 감수한 교전",
    goal: "상대 정글을 확인했다면 킬각보다 도착 시간과 탈출 가능성을 먼저 계산하기.",
  },
  ALLY_SUPPORT_CANNOT_MOVE: {
    label: "아군 서폿이 움직일 수 없을 때 시작한 교전",
    goal: "아군 서폿이 라인에 묶여 있으면 서폿 합류를 기대하지 않기.",
  },
  NO_RIVER_VISION: {
    label: "강가 시야 없이 밀거나 교전한 판단",
    goal: "강가 시야가 없으면 웨이브를 길게 밀기 전에 정글 위치부터 확인하기.",
  },
  ENEMY_JUNGLER_UNKNOWN: {
    label: "상대 정글 위치가 불명확한 상태의 판단",
    goal: "상대 정글 위치가 파악되지 않으면 긴 교전보다 짧은 압박과 안전한 이탈을 선택하기.",
  },
  RECALL_GREED: {
    label: "귀환을 미루고 라인에 남은 판단",
    goal: "웨이브를 정리한 뒤 체력과 자원이 부족하면 추가 이득보다 귀환하기.",
  },
  CS_GREED: {
    label: "위험을 감수하고 CS를 챙긴 판단",
    goal: "정글 정보와 생존기가 없으면 위험한 CS 한두 개는 포기하기.",
  },
  OBJECTIVE_FORCED_WITHOUT_MID_PRIO: {
    label: "미드 주도권 없이 오브젝트에 먼저 맞춘 판단",
    goal: "오브젝트 합류 전에 미드 웨이브와 주도권부터 확인하기.",
  },
  BAD_RECALL_BEFORE_OBJECTIVE: {
    label: "오브젝트 직전 늦은 귀환",
    goal: "오브젝트 30~60초 전에 자원과 아이템을 점검하고 먼저 귀환하기.",
  },
  STAYED_LOW_RESOURCE_BEFORE_OBJECTIVE: {
    label: "자원이 부족한 채 오브젝트 준비를 이어간 판단",
    goal: "오브젝트 전에 체력·마나가 부족하면 합류보다 먼저 귀환 시간을 확보하기.",
  },
  JOINED_OBJECTIVE_WITH_BAD_WAVE: {
    label: "미드 웨이브가 불리한 채 늦게 합류한 판단",
    goal: "오브젝트 이동 전에 미드 웨이브를 먼저 정리할 수 있는지 확인하기.",
  },
  OBJECTIVE_TRADEOFF_MISREAD: {
    label: "오브젝트 합류와 대체 이득의 교환 판단",
    goal: "합류가 어렵다면 웨이브·플레이트·귀환 중 확실한 대체 이득을 선택하기.",
  },
  MISSED_ALTERNATIVE_GAIN: {
    label: "오브젝트 대신 얻을 수 있던 이득을 놓친 판단",
    goal: "오브젝트를 포기할 때는 즉시 웨이브·플레이트·시야 중 하나로 전환하기.",
  },
};

function levelForCount(count: number): HabitPatternLevel {
  if (count >= 4) return "core";
  if (count === 3) return "repeated";
  if (count === 2) return "warning";
  return "possible_one_off";
}

function focusMessage(pattern: HabitPattern) {
  if (pattern.level === "possible_one_off") {
    return `아직 반복 습관으로 보긴 이르지만, ${pattern.label}은 다음 복기에서 확인할 포인트입니다.`;
  }
  if (pattern.level === "warning") {
    return `${pattern.label}이 경고 패턴으로 나타났습니다. 다음 복기 장면에서 다시 확인해보세요.`;
  }
  if (pattern.level === "repeated") {
    return `${pattern.label}이 가능성이 높은 반복 패턴으로 나타났습니다.`;
  }
  return `${pattern.label}이 현재 가장 먼저 교정할 핵심 패턴으로 나타났습니다.`;
}

export function analyzeHabitPatterns(
  records: ReviewSceneRecord[]
): HabitPatternAnalysis {
  const recentRecords = [...records]
    .sort(
      (left, right) =>
        Date.parse(right.createdAt) - Date.parse(left.createdAt)
    )
    .slice(0, 5);
  const recentSceneCount = recentRecords.length;
  const counts = new Map<RiskTag, number>();

  for (const record of recentRecords) {
    for (const tag of new Set(record.riskTags)) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  const allCounts = Array.from(counts, ([tag, count]) => ({
    tag,
    count,
    ratio: recentSceneCount === 0 ? 0 : count / recentSceneCount,
  })).sort((left, right) => right.count - left.count || left.tag.localeCompare(right.tag));

  const knownPatterns: HabitPattern[] = allCounts
    .filter(({ tag }) => Boolean(HABIT_DEFINITIONS[tag]))
    .map((item) => ({
      ...item,
      label: HABIT_DEFINITIONS[item.tag]!.label,
      level: levelForCount(item.count),
    }));
  const repeatedPatterns = knownPatterns.filter(({ count }) => count >= 2);
  const primaryPattern = knownPatterns[0] ?? null;

  return {
    recentSceneCount,
    topRiskTags: allCounts.slice(0, 5),
    repeatedPatterns,
    primaryHabitFocus: primaryPattern
      ? { ...primaryPattern, message: focusMessage(primaryPattern) }
      : null,
    nextReviewGoal: primaryPattern
      ? HABIT_DEFINITIONS[primaryPattern.tag]!.goal
      : null,
    sampleSizeWarning:
      recentSceneCount === 0
        ? "복기 기록이 쌓이면 최근 5개 복기 장면 기준으로 반복 실수를 분석합니다."
        : recentSceneCount < 5
          ? `현재 ${recentSceneCount}개 복기 장면 기준 — 5개가 쌓이면 더 안정적으로 분석됩니다.`
          : null,
  };
}
