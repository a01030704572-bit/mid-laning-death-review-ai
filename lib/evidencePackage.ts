import type {
  BuildSceneEvidencePackageInput,
  EvidenceConflict,
  EvidenceSourceConfidence,
  SceneEvidencePackage,
} from "@/types/evidence";
import type { RiotEvidenceEvent } from "@/types/riot";

const UNKNOWN_VALUES = new Set([undefined, null, "", "unknown", "unclear"]);

function hasKnownValue(value: unknown): boolean {
  return !UNKNOWN_VALUES.has(value as string);
}

function addUnique(target: string[], value: string | undefined): void {
  if (value && !target.includes(value)) {
    target.push(value);
  }
}

function cloneManualSource(
  manualInput: BuildSceneEvidencePackageInput["manualInput"]
): SceneEvidencePackage["sources"]["manual"] {
  if (!manualInput) return undefined;
  return {
    ...manualInput,
    survivalResources: manualInput.survivalResources
      ? [...manualInput.survivalResources]
      : undefined,
  };
}

function cloneVideoSource(
  videoDraft: BuildSceneEvidencePackageInput["videoDraft"]
): SceneEvidencePackage["sources"]["video"] {
  if (!videoDraft) return undefined;
  return {
    ...videoDraft,
    keyFacts: videoDraft.keyFacts ? [...videoDraft.keyFacts] : undefined,
    uncertainFacts: videoDraft.uncertainFacts
      ? [...videoDraft.uncertainFacts]
      : undefined,
    suggestedFields: videoDraft.suggestedFields
      ? { ...videoDraft.suggestedFields }
      : undefined,
  };
}

function cloneRiotSource(
  riotEvidence: BuildSceneEvidencePackageInput["riotEvidence"]
): SceneEvidencePackage["sources"]["riot"] {
  if (!riotEvidence) return undefined;
  return {
    ...riotEvidence,
    events: riotEvidence.events
      ? riotEvidence.events.map((event) => ({
          ...event,
          uncertainInfo: event.uncertainInfo ? [...event.uncertainInfo] : [],
        }))
      : undefined,
    playerDelta: riotEvidence.playerDelta
      ? { ...riotEvidence.playerDelta }
      : undefined,
    enemyMidDelta: riotEvidence.enemyMidDelta
      ? { ...riotEvidence.enemyMidDelta }
      : undefined,
    objectiveContext: riotEvidence.objectiveContext
      ? {
          ...riotEvidence.objectiveContext,
          actualObjectivesKilledInWindow:
            riotEvidence.objectiveContext.actualObjectivesKilledInWindow?.map(
              (objective) => ({ ...objective })
            ) ?? [],
        }
      : undefined,
    gainLossDraft: riotEvidence.gainLossDraft
      ? {
          ...riotEvidence.gainLossDraft,
          playerLosses: riotEvidence.gainLossDraft.playerLosses
            ? [...riotEvidence.gainLossDraft.playerLosses]
            : [],
          enemyGains: riotEvidence.gainLossDraft.enemyGains
            ? [...riotEvidence.gainLossDraft.enemyGains]
            : [],
        }
      : undefined,
    uncertainInfo: riotEvidence.uncertainInfo
      ? [...riotEvidence.uncertainInfo]
      : undefined,
  };
}

function confidenceFromManual(
  manualInput: BuildSceneEvidencePackageInput["manualInput"]
): EvidenceSourceConfidence {
  if (!manualInput) return "unknown";

  const knownFields = [
    manualInput.currentOutcome,
    manualInput.deathCause,
    manualInput.freeDescription,
    manualInput.laneStateDetail,
    manualInput.visionPurpose,
    manualInput.postPushIntent,
  ].filter(hasKnownValue);

  if (knownFields.length >= 3) return "high";
  if (knownFields.length > 0) return "medium";
  return "low";
}

function confidenceFromVideo(
  videoDraft: BuildSceneEvidencePackageInput["videoDraft"]
): EvidenceSourceConfidence {
  if (!videoDraft) return "unknown";
  if ((videoDraft.keyFacts?.length ?? 0) >= 2) return "medium";
  if (hasKnownValue(videoDraft.summary) || hasKnownValue(videoDraft.suggestedFreeDescription)) {
    return "low";
  }
  return "unknown";
}

function confidenceFromRiot(
  riotEvidence: BuildSceneEvidencePackageInput["riotEvidence"]
): EvidenceSourceConfidence {
  if (!riotEvidence) return "unknown";
  if (
    (riotEvidence.events?.length ?? 0) > 0 ||
    riotEvidence.playerDelta ||
    riotEvidence.objectiveContext
  ) {
    return "medium";
  }
  return "low";
}

function eventSummary(events: RiotEvidenceEvent[] | undefined): string | undefined {
  if (!events?.length) return undefined;

  const importantEvents = events.filter(
    (event) => event.importance === "primary" || event.importance === "secondary"
  );
  const targetEvents = importantEvents.length > 0 ? importantEvents : events;
  return `Riot 이벤트: ${targetEvents
    .slice(0, 4)
    .map((event) => `${event.kind} ${event.timestampSec}초`)
    .join(", ")}`;
}

function formatObjectiveContext(
  riotEvidence: BuildSceneEvidencePackageInput["riotEvidence"]
): string | undefined {
  const objectiveContext = riotEvidence?.objectiveContext;
  if (!objectiveContext) return undefined;

  const parts: string[] = [];
  if (objectiveContext.nearestObjective !== "none") {
    const timeText =
      objectiveContext.timeToObjectiveSec === null
        ? "시간 미상"
        : `${objectiveContext.timeToObjectiveSec}초 후`;
    parts.push(
      `가장 가까운 예정 오브젝트 추정: ${objectiveContext.nearestObjective}, ${timeText}`
    );
  }

  const actualObjectivesKilledInWindow =
    objectiveContext.actualObjectivesKilledInWindow ?? [];

  if (actualObjectivesKilledInWindow.length > 0) {
    parts.push(
      `장면 내 처치된 오브젝트: ${actualObjectivesKilledInWindow
        .map((objective) => `${objective.type} ${objective.timestampSec}초`)
        .join(", ")}`
    );
  }

  if (objectiveContext.impactsDeath) {
    parts.push("오브젝트 준비 턴 영향 가능성: 있음");
  }

  return parts.length > 0 ? parts.join(" / ") : undefined;
}

function hasRiotEvent(
  riotEvidence: BuildSceneEvidencePackageInput["riotEvidence"],
  kind: RiotEvidenceEvent["kind"]
): boolean {
  return riotEvidence?.events?.some((event) => event.kind === kind) ?? false;
}

function detectConflicts({
  manualInput,
  videoDraft,
  riotEvidence,
}: BuildSceneEvidencePackageInput): EvidenceConflict[] {
  const conflicts: EvidenceConflict[] = [];
  const riotHasDeath = hasRiotEvent(riotEvidence, "death");
  const manualOutcome = manualInput?.currentOutcome;
  const videoOutcome = videoDraft?.suggestedFields?.currentOutcome;

  const manualDeathLike = [
    "death",
    "ganked_and_died",
    "died_while_warding",
    "objective_fight_loss",
  ].includes(manualOutcome ?? "");

  if (manualDeathLike && riotEvidence && !riotHasDeath) {
    conflicts.push({
      field: "currentOutcome",
      sources: ["manual", "riot"],
      description:
        "수동 입력은 사망 장면을 가리키지만 Riot timeline window 안에서 플레이어 사망 이벤트가 확인되지 않았습니다.",
      severity: "medium",
    });
  }

  if (["solo_kill", "fight_advantage"].includes(manualOutcome ?? "") && riotHasDeath) {
    conflicts.push({
      field: "currentOutcome",
      sources: ["manual", "riot"],
      description:
        "수동 입력은 이득 장면을 가리키지만 Riot timeline에는 플레이어 사망 이벤트가 있습니다.",
      severity: "medium",
    });
  }

  if (
    hasKnownValue(manualOutcome) &&
    hasKnownValue(videoOutcome) &&
    manualOutcome !== videoOutcome
  ) {
    conflicts.push({
      field: "currentOutcome",
      sources: ["manual", "video"],
      description: "수동 입력의 결과와 영상 초안의 추천 결과가 서로 다릅니다.",
      severity: "low",
    });
  }

  if (
    videoDraft?.suggestedSceneOutcomeAssessment === "death" &&
    riotEvidence &&
    !riotHasDeath
  ) {
    conflicts.push({
      field: "sceneOutcomeAssessment",
      sources: ["video", "riot"],
      description:
        "영상 초안은 사망으로 보지만 Riot timeline window 안에서 플레이어 사망 이벤트가 확인되지 않았습니다.",
      severity: "medium",
    });
  }

  return conflicts;
}

function derivePrimarySceneType({
  manualInput,
  videoDraft,
  riotEvidence,
}: BuildSceneEvidencePackageInput): string | undefined {
  if (hasKnownValue(manualInput?.deathCause)) return manualInput?.deathCause;
  if (hasKnownValue(manualInput?.currentOutcome)) return manualInput?.currentOutcome;
  if (hasKnownValue(videoDraft?.suggestedScenarioType)) {
    return videoDraft?.suggestedScenarioType ?? undefined;
  }
  if (hasRiotEvent(riotEvidence, "death")) return "riot_death";
  if (hasRiotEvent(riotEvidence, "objective")) return "riot_objective";
  if (hasRiotEvent(riotEvidence, "turret_plate")) return "riot_turret_plate";
  if (hasRiotEvent(riotEvidence, "kill")) return "riot_kill";
  return undefined;
}

function deriveReviewFocus({
  manualInput,
  videoDraft,
  riotEvidence,
}: BuildSceneEvidencePackageInput): string[] {
  const focus: string[] = [];
  const text = [
    manualInput?.freeDescription,
    manualInput?.deathCause,
    manualInput?.currentOutcome,
    videoDraft?.summary,
    videoDraft?.suggestedFreeDescription,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    ["death", "ganked_and_died", "died_while_warding", "objective_fight_loss"].includes(
      manualInput?.currentOutcome ?? ""
    ) ||
    hasRiotEvent(riotEvidence, "death") ||
    videoDraft?.suggestedSceneOutcomeAssessment === "death"
  ) {
    addUnique(focus, "death_review");
  }

  if (
    ["solo_kill", "failed_kill_attempt", "fight_advantage"].includes(
      manualInput?.currentOutcome ?? ""
    ) ||
    hasRiotEvent(riotEvidence, "kill")
  ) {
    addUnique(focus, "kill_or_fight");
  }

  if (
    hasRiotEvent(riotEvidence, "objective") ||
    riotEvidence?.objectiveContext?.actualObjectivesKilledInWindow?.length ||
    ["objective_fight_loss", "secured_objective", "objective_trade_gain"].includes(
      manualInput?.currentOutcome ?? ""
    )
  ) {
    addUnique(focus, "objective_tradeoff");
  }

  if (
    text.includes("ward") ||
    text.includes("vision") ||
    text.includes("시야") ||
    text.includes("와드") ||
    hasRiotEvent(riotEvidence, "ward")
  ) {
    addUnique(focus, "vision_or_warding");
  }

  if (hasRiotEvent(riotEvidence, "turret_plate")) {
    addUnique(focus, "turret_plate_pressure");
  }

  if (
    (riotEvidence?.playerDelta?.csDelta ?? 1) <= 0 ||
    (riotEvidence?.playerDelta?.xpDelta ?? 1) <= 0 ||
    riotEvidence?.gainLossDraft?.tempoImpact
  ) {
    addUnique(focus, "tempo_loss");
  }

  return focus;
}

function deriveRiskTagsFromEvidence(
  riotEvidence: BuildSceneEvidencePackageInput["riotEvidence"]
): string[] {
  const tags: string[] = [];
  if (!riotEvidence) return tags;

  if (hasRiotEvent(riotEvidence, "death")) {
    addUnique(tags, "RIOT_CONFIRMED_DEATH_EVENT");
  }
  if (
    hasRiotEvent(riotEvidence, "objective") ||
    riotEvidence.objectiveContext?.objectiveKilledInWindow ||
    riotEvidence.objectiveContext?.impactsDeath
  ) {
    addUnique(tags, "RIOT_OBJECTIVE_CONTEXT");
  }
  if (hasRiotEvent(riotEvidence, "turret_plate")) {
    addUnique(tags, "RIOT_TURRET_PLATE_PRESSURE");
  }
  if ((riotEvidence.playerDelta?.csDelta ?? 1) <= 0) {
    addUnique(tags, "RIOT_POSSIBLE_CS_LOSS");
  }
  if ((riotEvidence.playerDelta?.xpDelta ?? 1) <= 0) {
    addUnique(tags, "RIOT_POSSIBLE_XP_LOSS");
  }
  if ((riotEvidence.playerDelta?.totalGoldDelta ?? 121) < 120) {
    addUnique(tags, "RIOT_LIMITED_GOLD_GAIN");
  }

  return tags;
}

export function buildSceneEvidencePackage({
  manualInput,
  videoDraft,
  riotEvidence,
  matchId,
  puuid,
  gameTimeSec,
  windowSec,
}: BuildSceneEvidencePackageInput): SceneEvidencePackage {
  const evidenceSummary: string[] = [];
  const missingInfo: string[] = [];

  if (manualInput) {
    if (hasKnownValue(manualInput.currentOutcome)) {
      evidenceSummary.push(`수동 입력 결과: ${manualInput.currentOutcome}`);
    }
    if (hasKnownValue(manualInput.deathCause)) {
      evidenceSummary.push(`수동 입력 주요 원인: ${manualInput.deathCause}`);
    }
    if (hasKnownValue(manualInput.freeDescription)) {
      evidenceSummary.push(`수동 메모: ${manualInput.freeDescription}`);
    }
  } else {
    missingInfo.push("수동 입력이 없어 플레이어 의도와 판단 가설을 확인할 수 없습니다.");
  }

  if (videoDraft) {
    if (hasKnownValue(videoDraft.summary)) {
      evidenceSummary.push(`영상 초안 요약: ${videoDraft.summary}`);
    }
    for (const fact of videoDraft.keyFacts?.slice(0, 2) ?? []) {
      evidenceSummary.push(`영상 관찰: ${fact}`);
    }
    for (const uncertainFact of videoDraft.uncertainFacts ?? []) {
      missingInfo.push(`영상 불확실: ${uncertainFact}`);
    }
  } else {
    missingInfo.push("영상 초안이 없어 화면에 보이는 웨이브/위치/시야 단서를 확인할 수 없습니다.");
  }

  if (riotEvidence) {
    addUnique(evidenceSummary, eventSummary(riotEvidence.events));
    const playerDelta = riotEvidence.playerDelta;
    if (playerDelta) {
      evidenceSummary.push(
        `Riot delta 추정: CS ${playerDelta.csDelta}, XP ${playerDelta.xpDelta}, 골드 ${playerDelta.totalGoldDelta}`
      );
    }
    for (const uncertainInfo of riotEvidence.uncertainInfo ?? []) {
      missingInfo.push(`Riot 불확실: ${uncertainInfo}`);
    }
  } else {
    missingInfo.push("Riot timeline evidence가 없어 객관 이벤트와 CS/XP/골드 변화를 확인할 수 없습니다.");
  }

  const objectiveContext = formatObjectiveContext(riotEvidence);
  if (objectiveContext) {
    evidenceSummary.push(objectiveContext);
  }

  const scenePackage: SceneEvidencePackage = {
    sources: {
      manual: cloneManualSource(manualInput),
      video: cloneVideoSource(videoDraft),
      riot: cloneRiotSource(riotEvidence),
    },
    sourcePresence: {
      manual: Boolean(manualInput),
      video: Boolean(videoDraft),
      riot: Boolean(riotEvidence),
    },
    sourceConfidence: {
      manual: confidenceFromManual(manualInput),
      video: confidenceFromVideo(videoDraft),
      riot: confidenceFromRiot(riotEvidence),
    },
    evidenceSummary,
    missingInfo,
    conflicts: detectConflicts({ manualInput, videoDraft, riotEvidence }),
    derivedContext: {
      primarySceneType: derivePrimarySceneType({
        manualInput,
        videoDraft,
        riotEvidence,
      }),
      likelyReviewFocus: deriveReviewFocus({ manualInput, videoDraft, riotEvidence }),
      riskTagsFromEvidence: deriveRiskTagsFromEvidence(riotEvidence),
      objectiveContext,
    },
  };

  if (matchId !== undefined) scenePackage.matchId = matchId;
  if (puuid !== undefined) scenePackage.puuid = puuid;
  if (gameTimeSec !== undefined) scenePackage.gameTimeSec = gameTimeSec;
  if (windowSec !== undefined) scenePackage.windowSec = windowSec;

  return scenePackage;
}
