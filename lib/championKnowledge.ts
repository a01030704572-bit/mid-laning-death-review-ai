export type ChampionKnowledge = {
  championName: string;
  role: "mid" | "top" | "jungle" | "bot" | "support";
  keyThreatSkills: string[];
  keyDefensiveTools: string[];
  punishWindows: string[];
  reviewQuestions: string[];
  coachingHintKo: string;
};

// Seed/reference champion knowledge only.
// This is not intended to become a manually maintained full champion database.
// For champions outside this list, use AI-inferred hypotheses with strict
// evidence and uncertainty rules instead of expanding this table by default.
const CHAMPION_KNOWLEDGE: ChampionKnowledge[] = [
  {
    championName: "Ahri",
    role: "mid",
    keyThreatSkills: ["E 매혹", "R 혼령 질주 진입/추격", "Q 왕복 피해"],
    keyDefensiveTools: ["R 혼령 질주 회피/거리 조절"],
    punishWindows: ["E가 빠진 직후", "R 스택이 없거나 부족한 구간"],
    reviewQuestions: [
      "진입 전에 Ahri E 사용 여부를 확인했나요?",
      "Ahri R로 거리를 다시 벌릴 수 있는 구간이었나요?",
    ],
    coachingHintKo:
      "Ahri 상대로는 E와 R이 남아 있으면 단순 직선 진입 킬각이 흔들릴 수 있습니다. 핵심 스킬이 빠진 직후가 더 명확한 punish window입니다.",
  },
  {
    championName: "Fizz",
    role: "mid",
    keyThreatSkills: ["R 장거리 킬각", "Q 진입", "W 강화 평타"],
    keyDefensiveTools: ["E 재간둥이 회피/무적"],
    punishWindows: ["E가 빠진 직후", "궁극기가 없는 구간"],
    reviewQuestions: [
      "진입 전에 Fizz E 사용 여부를 확인했나요?",
      "Fizz 궁극기 쿨타임을 고려했나요?",
    ],
    coachingHintKo:
      "Fizz 상대로는 E가 남아 있으면 단일 스킬 기반 킬각을 확정하기 어렵습니다. E가 빠진 직후가 가장 명확한 punish window입니다.",
  },
  {
    championName: "Vex",
    role: "mid",
    keyThreatSkills: ["패시브 공포", "E 둔화 후 공포 연계", "R 장거리 재진입"],
    keyDefensiveTools: ["패시브 공포로 진입 차단"],
    punishWindows: ["패시브 공포가 빠진 직후", "R이 없고 라인을 먼저 밀린 구간"],
    reviewQuestions: [
      "교전 전에 Vex 공포 패시브 상태를 확인했나요?",
      "Vex R 재진입 가능성을 계산했나요?",
    ],
    coachingHintKo:
      "Vex 상대로는 공포 패시브가 남아 있으면 근접 진입이나 추격이 크게 끊길 수 있습니다. 공포가 빠졌는지 확인하는 것이 핵심입니다.",
  },
  {
    championName: "Zed",
    role: "mid",
    keyThreatSkills: ["W 그림자 진입/포킹", "R 표식 폭발", "Q 표창 연계"],
    keyDefensiveTools: ["W 그림자 복귀", "R 위치 전환"],
    punishWindows: ["W가 빠진 직후", "R이 없는 구간", "그림자 위치가 멀어진 직후"],
    reviewQuestions: [
      "Zed W가 빠진 뒤에 교전을 시작했나요?",
      "Zed R 이후 복귀 위치를 예상했나요?",
    ],
    coachingHintKo:
      "Zed 상대로는 W와 R 위치 전환을 확인하지 않으면 킬각과 탈출각을 동시에 오판하기 쉽습니다. 그림자 사용 직후가 가장 명확한 punish window입니다.",
  },
  {
    championName: "Akali",
    role: "mid",
    keyThreatSkills: ["E 표식 진입", "R 처형/추격", "Q 지속 견제"],
    keyDefensiveTools: ["W 장막 은신", "E 후퇴/재진입"],
    punishWindows: ["W 장막이 빠진 직후", "E가 빗나간 직후", "R이 없는 구간"],
    reviewQuestions: [
      "Akali W 장막 사용 여부를 확인하고 끝까지 추격했나요?",
      "Akali E 재진입 각을 계산했나요?",
    ],
    coachingHintKo:
      "Akali 상대로는 W 장막과 E 재진입 때문에 시야와 타겟팅이 끊길 수 있습니다. 장막이나 E가 빠진 직후가 더 안정적인 punish window입니다.",
  },
];

const CHAMPION_ALIASES: Record<string, string> = {
  ahri: "ahri",
  아리: "ahri",
  fizz: "fizz",
  피즈: "fizz",
  vex: "vex",
  벡스: "vex",
  zed: "zed",
  제드: "zed",
  akali: "akali",
  아칼리: "akali",
};

function normalizeChampionKnowledgeKey(value?: string) {
  if (!value) return null;
  const compact = value.trim().toLowerCase().replace(/[\s'’._-]/g, "");
  if (!compact) return null;
  return CHAMPION_ALIASES[compact] ?? compact;
}

export function getChampionKnowledge(
  championName?: string
): ChampionKnowledge | null {
  const key = normalizeChampionKnowledgeKey(championName);
  if (!key) return null;

  return (
    CHAMPION_KNOWLEDGE.find(
      (knowledge) =>
        normalizeChampionKnowledgeKey(knowledge.championName) === key
    ) ?? null
  );
}

export function getSeedChampionKnowledgeNames() {
  return CHAMPION_KNOWLEDGE.map((knowledge) => knowledge.championName);
}

export function buildEnemyChampionKnowledgePromptBlock(
  enemyChampion?: string
) {
  const knowledge = getChampionKnowledge(enemyChampion);
  if (!knowledge) return "";

  return `
Enemy champion knowledge reference:
- Enemy mid champion: ${knowledge.championName}
- Role scope: ${knowledge.role}
- Key threat skills: ${knowledge.keyThreatSkills.join(", ")}
- Key defensive tools: ${knowledge.keyDefensiveTools.join(", ")}
- Punish windows: ${knowledge.punishWindows.join(", ")}
- Review questions: ${knowledge.reviewQuestions.join(" / ")}
- Coaching hint: ${knowledge.coachingHintKo}

Champion knowledge usage rules:
- Use this champion knowledge only as matchup reference, not as absolute truth.
- 복기용 가설: 이 장면은 상대 핵심 스킬 확인 여부가 중요합니다.
- For keySkillHypotheses, use source "known_champion_db" and status "hypothesis" or "no_evidence" unless evidence confirms it.
- Do not invent cooldowns, spell usage, or exact availability that were not observed in the input, video, or Riot evidence.
- If the input does not confirm whether a key skill was used, phrase it as a check question, not a confirmed mistake.
- Good wording example: "Fizz E 사용 여부가 확인되지 않았다면, 이 킬각은 확정하기 어렵습니다."
- Bad wording example: "Fizz E가 있었는데 무리하게 들어갔습니다."
`;
}

export function buildInferredKeySkillPromptBlock(enemyChampion?: string) {
  const championName = enemyChampion?.trim();
  if (!championName) return "";
  if (getChampionKnowledge(championName)) return "";

  return `
Enemy champion inferred key skill hypothesis:
- Enemy mid champion: ${championName}
- No static seed champion knowledge exists for this champion.
- If you have enough general League of Legends knowledge about this champion, infer likely key threat skills, defensive/counterplay tools, and punish windows.
- Treat every inferred skill as an unverified hypothesis unless manual input, video evidence, or Riot evidence confirms the skill state.
- Do not claim a skill was used, available, unavailable, or on cooldown unless the provided evidence confirms it.
- If evidence is missing, phrase the point as 확인해야 할 변수, 복기 질문, or 가능성이 높은 핵심 스킬 후보.
- If you are not confident about this champion's skills, do not invent skill names. Fall back to general scenario-based review questions.
- For keySkillHypotheses, use source "model_inferred" and status "hypothesis" or "no_evidence" unless evidence confirms it.
`;
}
