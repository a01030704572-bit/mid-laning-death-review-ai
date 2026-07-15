import type {
  CoachingEvidenceItem,
  CoachingFeedback,
  CoachingSceneType,
  CoachingStrength,
  EvidenceConfidence,
  ImprovementCandidate,
  ImprovementCategory,
  SceneCoachingReview,
} from "@/types/coachingFeedback";

type CoachingFeedbackDraftInput = {
  matchId?: string;
  puuid?: string;
  rankedScenes?: unknown[];
  topScenes?: unknown[];
  strengthScenes?: unknown[];
  improvementScenes?: unknown[];
  generatedAtIsoTimestamp?: string;
};

type SceneRecord = Record<string, unknown>;

function isRecord(value: unknown): value is SceneRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function compactText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function getString(scene: SceneRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = compactText(scene[key]);
    if (value) return value;
  }
  return undefined;
}

function getNumber(scene: SceneRecord, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = scene[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return undefined;
}

function getStringArray(scene: SceneRecord, keys: string[]): string[] {
  for (const key of keys) {
    const value = scene[key];
    if (Array.isArray(value)) {
      return value
        .map((item) => compactText(item))
        .filter((item): item is string => Boolean(item));
    }
  }
  return [];
}

function toRecords(values: unknown[] | undefined): SceneRecord[] {
  return (values ?? []).filter(isRecord);
}

function makeUniqueScenes(...sceneLists: Array<unknown[] | undefined>) {
  const seen = new Set<string>();
  const scenes: SceneRecord[] = [];

  for (const scene of sceneLists.flatMap(toRecords)) {
    const sceneId = getSceneId(scene, scenes.length);
    if (seen.has(sceneId)) continue;
    seen.add(sceneId);
    scenes.push(scene);
  }

  return scenes;
}

function stringifyForMapping(value: unknown, depth = 0): string {
  if (depth > 3 || value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value.map((item) => stringifyForMapping(item, depth + 1)).join(" ");
  }
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .map((item) => stringifyForMapping(item, depth + 1))
      .join(" ");
  }
  return "";
}

function hasAnyText(text: string, patterns: string[]) {
  const loweredText = text.toLowerCase();
  return patterns.some((pattern) => loweredText.includes(pattern.toLowerCase()));
}

function getSceneText(scene: SceneRecord) {
  return stringifyForMapping(scene);
}

function getSceneId(scene: SceneRecord, index: number) {
  return (
    getString(scene, ["sceneId", "id"]) ??
    `scene-${index + 1}`
  );
}

function getSceneTitle(scene: SceneRecord, index: number) {
  return (
    getString(scene, ["displayNameKo", "titleKo", "labelKo", "autoSceneType"]) ??
    `복기 장면 후보 ${index + 1}`
  );
}

export function mapSceneTypeToCoachingSceneType(
  sceneLike: unknown
): CoachingSceneType {
  const text = stringifyForMapping(sceneLike);

  if (hasAnyText(text, ["post_kill", "conversion", "poor_conversion"])) {
    return "post_kill_conversion";
  }
  if (hasAnyText(text, ["solo_kill", "solo kill"])) return "solo_kill";
  if (hasAnyText(text, ["objective", "dragon", "baron", "herald"])) {
    return "objective_setup";
  }
  if (hasAnyText(text, ["jungle_gank", "jungle", "gank"])) {
    return "jungle_collapse";
  }
  if (hasAnyText(text, ["support_roam", "support", "collapse"])) {
    return "support_roam";
  }
  if (hasAnyText(text, ["roam", "blind_roaming"])) return "roam_timing";
  if (hasAnyText(text, ["wave", "cs"])) return "wave_loss";
  if (hasAnyText(text, ["recall", "tempo"])) return "recall_timing";
  if (hasAnyText(text, ["vision", "ward", "fog"])) return "vision_timing";
  if (hasAnyText(text, ["death", "died"])) return "death";

  return "unknown";
}

export function mapSceneToImprovementCategory(
  sceneLike: unknown
): ImprovementCategory {
  const sceneType = mapSceneTypeToCoachingSceneType(sceneLike);
  const text = stringifyForMapping(sceneLike);

  if (sceneType === "post_kill_conversion") return "post_kill_conversion";
  if (sceneType === "jungle_collapse") return "jungle_tracking";
  if (sceneType === "objective_setup") return "objective_setup";
  if (sceneType === "wave_loss") return "wave_management";
  if (sceneType === "recall_timing") return "recall_timing";
  if (sceneType === "vision_timing") return "vision_timing";
  if (sceneType === "roam_timing" || sceneType === "support_roam") {
    return "roam_timing";
  }
  if (sceneType === "death") return "death_avoidance";
  if (hasAnyText(text, ["fight_direction", "cover", "enemy_jungle"])) {
    return "fight_direction";
  }

  return "unknown";
}

function mapStrengthCategory(scene: SceneRecord): CoachingStrength["category"] {
  const text = getSceneText(scene);
  const category = mapSceneToImprovementCategory(scene);

  if (hasAnyText(text, ["solo_kill", "kill_angle"])) return "kill_angle";
  if (hasAnyText(text, ["priority", "prio", "lane_priority"])) {
    return "lane_priority";
  }
  if (hasAnyText(text, ["survival", "escape"])) return "survival";
  if (hasAnyText(text, ["conversion", "gain", "positive"])) return "conversion";

  return category;
}

function hasVideoEvidence(scene: SceneRecord) {
  const status = getString(scene, ["videoEvidenceStatus"]);
  return Boolean(scene.videoEvidence) || status === "attached";
}

function hasRiotEvidence(scene: SceneRecord) {
  return (
    getStringArray(scene, ["riotEvidenceSummary", "evidenceSummary"]).length > 0 ||
    Boolean(getString(scene, ["evidenceSummaryKo"]))
  );
}

function buildEvidence(scene: SceneRecord, sceneId: string): CoachingEvidenceItem[] {
  const evidence: CoachingEvidenceItem[] = [];
  const riotSummaries = getStringArray(scene, ["riotEvidenceSummary"]);
  const evidenceSummaryKo = getString(scene, ["evidenceSummaryKo"]);

  if (riotSummaries.length > 0 || evidenceSummaryKo) {
    evidence.push({
      source: "riot",
      confidence: "medium",
      labelKo: "Riot 경기 기록 근거",
      detailKo: riotSummaries[0] ?? evidenceSummaryKo,
      sceneId,
    });
  }

  if (hasVideoEvidence(scene)) {
    const videoEvidence = isRecord(scene.videoEvidence)
      ? scene.videoEvidence
      : undefined;
    evidence.push({
      source: "video",
      confidence:
        compactText(videoEvidence?.confidence) === "confirmed"
          ? "high"
          : "medium",
      labelKo: "영상 근거 후보",
      detailKo:
        compactText(videoEvidence?.noteKo) ??
        "해당 장면 근처의 영상 근거 후보가 연결되어 있습니다.",
      sceneId,
    });
  }

  return evidence;
}

export function inferEvidenceConfidenceFromScene(
  sceneLike: unknown
): EvidenceConfidence {
  if (!isRecord(sceneLike)) return "low";
  const evidence = buildEvidence(sceneLike, getSceneId(sceneLike, 0));

  if (evidence.some((item) => item.source === "video")) return "high";
  if (evidence.some((item) => item.source === "riot")) return "high";
  return "low";
}

function inferSceneReviewConfidence(
  scene: SceneRecord,
  evidence: CoachingEvidenceItem[]
): EvidenceConfidence {
  if (evidence.some((item) => item.source === "video" || item.source === "riot")) {
    return "high";
  }
  if (getNumber(scene, ["reviewWorthinessScore", "repeatScore"]) !== undefined) {
    return "medium";
  }
  return "low";
}

function buildReviewHypothesis(sceneType: CoachingSceneType) {
  const hypotheses: Record<CoachingSceneType, string> = {
    death:
      "복기용 가설: 이 장면은 사망 직전 위치, 자원, 상대 개입 가능성을 다시 확인할 후보입니다.",
    solo_kill:
      "복기용 가설: 이 장면은 좋은 킬각 판단과 이후 전환 선택을 함께 확인할 후보입니다.",
    post_kill_conversion:
      "복기용 가설: 이 장면은 킬 이후 웨이브, 귀환, 플레이트 전환이 흔들렸을 가능성을 확인할 후보입니다.",
    objective_setup:
      "복기용 가설: 이 장면은 오브젝트 전 미드 웨이브와 리콜 타이밍을 먼저 확인할 후보입니다.",
    jungle_collapse:
      "복기용 가설: 이 장면은 상대 정글 위치가 불확실한 상태에서 압박했는지 확인할 후보입니다.",
    support_roam:
      "복기용 가설: 이 장면은 서포터 로밍 또는 아군 커버 차이를 확인할 후보입니다.",
    roam_timing:
      "복기용 가설: 이 장면은 이동 전 미드 웨이브와 상대 위치 정보가 충분했는지 확인할 후보입니다.",
    wave_loss:
      "복기용 가설: 이 장면은 웨이브 정리 전 이동이나 교전 선택을 다시 볼 후보입니다.",
    recall_timing:
      "복기용 가설: 이 장면은 귀환 또는 잔류 타이밍의 기회비용을 확인할 후보입니다.",
    vision_timing:
      "복기용 가설: 이 장면은 시야를 잡는 위치와 커버 여부를 확인할 후보입니다.",
    unknown:
      "복기용 가설: 현재 근거만으로는 장면 유형이 확정되지 않아 추가 확인이 필요한 후보입니다.",
  };

  return hypotheses[sceneType];
}

function buildCorrection(sceneType: CoachingSceneType) {
  const corrections: Record<CoachingSceneType, string> = {
    death: "죽기 직전에는 라인 위치, 생존 자원, 상대 합류 가능성을 순서대로 확인합니다.",
    solo_kill: "킬각을 만든 뒤에는 20초 안에 웨이브, 플레이트, 귀환 중 하나를 선택합니다.",
    post_kill_conversion:
      "킬 이후 바로 다음 행동을 정해 이득이 사라지기 전에 웨이브나 귀환을 정리합니다.",
    objective_setup:
      "오브젝트 60초 전에는 미드 웨이브 상태와 리콜 가능 시간을 먼저 확인합니다.",
    jungle_collapse:
      "상대 정글 위치가 확인되기 전까지 시야 없는 쪽으로 길게 압박하지 않습니다.",
    support_roam:
      "교전 전에 아군 커버와 상대 서포터 이동 가능성을 한 번 더 확인합니다.",
    roam_timing:
      "로밍 전에는 미드 웨이브가 손해 없이 정리되는지 먼저 확인합니다.",
    wave_loss:
      "웨이브가 불리하면 이동보다 정리 또는 짧은 보정 선택을 우선합니다.",
    recall_timing:
      "잔류와 귀환 중 하나를 고를 때 다음 웨이브와 오브젝트 시간을 같이 봅니다.",
    vision_timing:
      "깊은 시야는 아군 커버 또는 상대 위치 정보가 있을 때만 시도합니다.",
    unknown:
      "장면을 다시 볼 때 눈에 보이는 사실과 추정을 나누어 하나씩 확인합니다.",
  };

  return corrections[sceneType];
}

function buildNextAction(sceneType: CoachingSceneType) {
  const actions: Partial<Record<CoachingSceneType, string>> = {
    solo_kill: "킬 이후 20초 안에 다음 이득 전환 선택을 말로 정리합니다.",
    post_kill_conversion:
      "킬 이후 웨이브, 플레이트, 귀환 중 하나를 먼저 선택합니다.",
    objective_setup: "오브젝트 60초 전 미드 웨이브 상태부터 확인합니다.",
    jungle_collapse:
      "상대 정글 위치가 보이기 전에는 시야 없는 강가 쪽 압박을 멈춥니다.",
    vision_timing: "시야를 잡기 전 아군 커버 위치를 먼저 확인합니다.",
  };

  return actions[sceneType];
}

function isPositiveScene(scene: SceneRecord) {
  const text = getSceneText(scene);
  return hasAnyText(text, [
    "good_decision",
    "solo_kill_candidate",
    "fight_advantage",
    "strength",
    "positive",
    "gain",
  ]);
}

function isImprovementScene(scene: SceneRecord) {
  const text = getSceneText(scene);
  return hasAnyText(text, [
    "bad_decision",
    "missed_opportunity",
    "pattern_flag",
    "death",
    "gank",
    "objective_setup_failure",
    "post_kill_conversion",
    "no_flash",
    "unsafe_warding",
  ]);
}

function buildSceneReview(
  scene: SceneRecord,
  index: number
): SceneCoachingReview {
  const sceneId = getSceneId(scene, index);
  const sceneType = mapSceneTypeToCoachingSceneType(scene);
  const evidence = buildEvidence(scene, sceneId);
  const confidence = inferSceneReviewConfidence(scene, evidence);
  const sceneReview: SceneCoachingReview = {
    sceneId,
    titleKo: getSceneTitle(scene, index),
    sceneType,
    reviewHypothesisKo: buildReviewHypothesis(sceneType),
    evidence,
    confidence,
    correctionKo: buildCorrection(sceneType),
  };
  const nextActionKo = buildNextAction(sceneType);

  if (nextActionKo) {
    sceneReview.nextActionKo = nextActionKo;
  }

  if (isPositiveScene(scene)) {
    sceneReview.goodDecisionKo =
      "이 장면은 유지할 만한 좋은 판단 후보입니다. 다만 영상이나 세부 근거로 조건을 다시 확인합니다.";
  }

  if (isImprovementScene(scene)) {
    sceneReview.missedConditionKo =
      "확정 판정은 아니지만, 이 장면에서는 사전에 확인했어야 할 조건이 있었는지 점검합니다.";
  }

  return sceneReview;
}

function mapSeverity(scene: SceneRecord): ImprovementCandidate["severity"] {
  const score = getNumber(scene, ["reviewWorthinessScore", "repeatScore"]) ?? 0;
  const text = getSceneText(scene);

  if (score >= 90 || hasAnyText(text, ["high"])) return "high";
  if (score > 0 || hasAnyText(text, ["medium"])) return "medium";
  return "low";
}

function mapRepeatScore(scene: SceneRecord) {
  const reviewWorthinessScore = getNumber(scene, ["reviewWorthinessScore"]);
  const repeatScore = getNumber(scene, ["repeatScore"]);

  if (typeof repeatScore === "number") return repeatScore;
  if (typeof reviewWorthinessScore === "number") {
    return Math.max(1, Math.round(reviewWorthinessScore));
  }
  return 1;
}

function buildImprovementCandidate(
  scene: SceneRecord,
  index: number
): ImprovementCandidate {
  const sceneId = getSceneId(scene, index);
  const category = mapSceneToImprovementCategory(scene);

  return {
    id: `improvement-${sceneId}`,
    category,
    severity: mapSeverity(scene),
    repeatScore: mapRepeatScore(scene),
    evidenceSceneIds: [sceneId],
    feedbackKo: `${getSceneTitle(scene, index)} 장면은 ${category} 관점에서 다시 확인할 개선 후보입니다.`,
  };
}

function buildStrength(scene: SceneRecord, index: number): CoachingStrength {
  const sceneId = getSceneId(scene, index);

  return {
    id: `strength-${sceneId}`,
    category: mapStrengthCategory(scene),
    evidenceSceneIds: [sceneId],
    feedbackKo: `${getSceneTitle(scene, index)} 장면은 다음 판에도 유지할 만한 좋은 판단 후보입니다.`,
  };
}

function computeOverallConfidence(sceneReviews: SceneCoachingReview[]) {
  if (sceneReviews.length === 0) return "low";
  if (
    sceneReviews.some((sceneReview) =>
      sceneReview.evidence.some(
        (item) => item.source === "riot" || item.source === "video"
      )
    )
  ) {
    return "high";
  }
  return "medium";
}

function selectNextGameGoal(
  improvementCandidates: ImprovementCandidate[],
  sceneReviews: SceneCoachingReview[]
) {
  const firstImprovement = improvementCandidates[0];
  if (firstImprovement) {
    return {
      goalKo: firstImprovement.feedbackKo,
      triggerKo: "비슷한 장면 조건이 다시 나올 때",
      successConditionKo:
        "판단 전에 확인할 조건을 하나 말로 정리하고 행동합니다.",
      basedOn: {
        sceneIds: firstImprovement.evidenceSceneIds,
        improvementCandidateId: firstImprovement.id,
      },
    };
  }

  const firstScene = sceneReviews[0];
  if (firstScene) {
    return {
      goalKo: firstScene.nextActionKo ?? firstScene.correctionKo,
      triggerKo: "같은 유형의 장면이 다시 나올 때",
      successConditionKo: "행동 전에 확인할 조건 하나를 먼저 체크합니다.",
      basedOn: {
        sceneIds: [firstScene.sceneId],
      },
    };
  }

  return {
    goalKo: "다음 판에는 다시 봐야 할 장면 1개를 먼저 복기하세요.",
    triggerKo: "게임이 끝난 직후",
    successConditionKo:
      "다시 볼 장면 1개를 고르고 확인 후보와 다음 행동을 하나로 정리합니다.",
    basedOn: {
      sceneIds: [],
    },
  };
}

function buildMatchSummary(
  sceneReviews: SceneCoachingReview[],
  confidence: EvidenceConfidence
) {
  return {
    titleKo: "이번 판 복기 초안",
    summaryKo:
      sceneReviews.length > 0
        ? "자동 장면 후보를 바탕으로 먼저 확인할 복기 포인트를 정리했습니다."
        : "아직 주요 장면 후보가 부족해 기본 복기 초안만 생성했습니다.",
    overallHypothesisKo:
      "현재 근거 기준으로는 일부 장면에서 다음 판 목표 후보가 있을 수 있습니다.",
    confidence,
  };
}

export function buildCoachingFeedbackDraftFromScenes(
  input: CoachingFeedbackDraftInput
): CoachingFeedback {
  const candidateSceneReviews = makeUniqueScenes(input.topScenes, input.rankedScenes)
    .slice(0, 3)
    .map(buildSceneReview);
  const improvementCandidates = makeUniqueScenes(
    input.improvementScenes,
    input.topScenes
  )
    .filter(isImprovementScene)
    .map(buildImprovementCandidate);
  const strengths = makeUniqueScenes(input.strengthScenes)
    .filter(isPositiveScene)
    .map(buildStrength);
  const evidenceConfidence = computeOverallConfidence(candidateSceneReviews);

  return {
    matchId: input.matchId,
    puuid: input.puuid,
    generatedAtIsoTimestamp:
      input.generatedAtIsoTimestamp ?? "1970-01-01T00:00:00.000Z",
    matchSummary: buildMatchSummary(candidateSceneReviews, evidenceConfidence),
    sceneReviews: candidateSceneReviews,
    strengths,
    improvementCandidates,
    recurringPatterns: [],
    nextGameGoal: selectNextGameGoal(
      improvementCandidates,
      candidateSceneReviews
    ),
    evidenceConfidence,
    personalization: {
      profileApplied: false,
    },
  };
}
