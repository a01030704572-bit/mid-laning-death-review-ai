import type {
  VideoDraftFieldEvidenceSourceDetail,
  VideoDraftFieldEvidenceSources,
  VideoDraftMapEvidenceSource,
  LockedRiotVideoContext,
  VideoReviewDraft,
} from "@/types/videoDraft";
import { normalizeChampionName } from "@/lib/championNameNormalizer";
import type {
  AllyJungleCoverBeforeFight,
  CurrentOutcome,
  EnemyJungleInfoBeforeFight,
  EnemyMidState,
  LaneStateDetail,
  MapSide,
  MidPriorityBeforeObjective,
  ObjectivePrepAction,
  ObjectiveType,
  PostPushIntent,
  SceneOutcomeAssessment,
  ScenarioType,
  TimeToObjective,
} from "@/types/review";

export const MAX_VIDEO_DRAFT_BYTES = 100 * 1024 * 1024;
export const MAX_VIDEO_DRAFT_NOTE_LENGTH = 500;

export const ALLOWED_VIDEO_DRAFT_MIME_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

type ClipMetadata = {
  size: number;
  type: string;
};

export type VideoDraftValidationError = {
  status: 400 | 413;
  message: string;
};

const SCENARIO_TYPES = new Set<ScenarioType>([
  "PRE_LANE_VISION",
  "GANKED_WHILE_PUSHING",
  "SOLO_KILL_TRADE",
  "RECALL_GREED",
  "UNSAFE_WARDING",
  "ADVANTAGE_CONVERSION",
  "OBJECTIVE_PREP_TURN",
  "MID_ROAM_FIGHT_JOIN",
  "GENERAL_LANING_DEATH",
]);

const SCENE_OUTCOME_ASSESSMENTS = new Set<SceneOutcomeAssessment>([
  "good_decision",
  "risky_but_successful",
  "questionable",
  "loss",
  "death",
  "unclear",
]);

const CURRENT_OUTCOMES = new Set<CurrentOutcome>([
  "death",
  "solo_kill",
  "failed_kill_attempt",
  "survived_but_lost",
  "fight_advantage",
  "forced_enemy_recall",
  "gained_lane_priority",
  "lost_lane_priority",
  "plate_or_cs_gain",
  "plate_or_cs_loss",
  "unclear_recall_timing",
  "ganked_and_died",
  "escaped_gank_but_lost",
  "ally_jungle_coordination_mismatch",
  "fought_despite_known_enemy_jungle",
  "cover_misread",
  "died_while_warding",
  "vision_loss",
  "overextended_for_vision",
  "unclear_post_vision_decision",
  "objective_fight_loss",
  "secured_objective",
  "objective_trade_gain",
  "missed_objective_and_lane_gain",
  "unclear_objective_join_tradeoff",
  "unknown",
]);

const OBJECTIVE_TYPES = new Set<ObjectiveType>([
  "void_grubs",
  "dragon",
  "rift_herald",
]);
const LANE_PRIORITIES = new Set<MidPriorityBeforeObjective>([
  "have_prio",
  "no_prio",
  "contested",
]);
const LANE_STATE_DETAILS = new Set<LaneStateDetail>([
  "crashed_into_enemy_tower",
  "slow_pushing_to_enemy",
  "enemy_freezing",
  "neutral_middle",
  "being_pushed_in",
  "big_wave_bouncing_back",
]);
const ENEMY_MID_STATES = new Set<EnemyMidState>([
  "visible_under_tower",
  "visible_in_lane",
  "missing",
  "following_me",
  "resetting_or_dead",
]);
const OBJECTIVE_TIMINGS = new Set<TimeToObjective>([
  "ninety_to_sixty",
  "sixty_to_thirty",
  "under_thirty",
  "already_spawned",
]);
const OBJECTIVE_PREP_ACTIONS = new Set<ObjectivePrepAction>([
  "pushed_mid",
  "recalled",
  "stayed_low_resource",
  "moved_first",
  "followed_late",
  "took_plate_or_cs",
  "placed_vision",
  "did_not_prepare",
]);
const MOVEMENT_DIRECTIONS = new Set<MapSide>(["top_side", "bot_side"]);
const ENEMY_JUNGLE_INFO = new Set<EnemyJungleInfoBeforeFight>([
  "not_seen_recently",
  "seen_same_side",
  "seen_opposite_side",
  "seen_near_mid",
  "dead_or_recalled",
]);
const ALLY_JUNGLE_COVER = new Set<AllyJungleCoverBeforeFight>([
  "same_side_near_mid",
  "same_side_but_far",
  "opposite_side",
  "dead_or_recalled",
  "resetting",
]);
const POST_PUSH_INTENTS = new Set<PostPushIntent>([
  "take_plate",
  "roam",
  "recall",
  "ward",
  "invade_with_jungle",
  "hover_side_lane",
  "stay_for_cs",
  "escape_or_disengage",
]);
const VIDEO_DRAFT_MAP_EVIDENCE_SOURCES = new Set<VideoDraftMapEvidenceSource>([
  "direct_screen",
  "minimap",
  "riot_event",
  "inferred",
  "unknown",
]);
const TRUSTED_MAP_EVIDENCE_SOURCES = new Set<VideoDraftMapEvidenceSource>([
  "direct_screen",
  "minimap",
  "riot_event",
]);

export class InvalidVideoDraftResponseError extends Error {}

export function getVideoDraftFileValidationError(
  file: ClipMetadata | null
): VideoDraftValidationError | null {
  if (!file) {
    return { status: 400, message: "영상 클립 파일을 선택해주세요." };
  }
  if (
    !ALLOWED_VIDEO_DRAFT_MIME_TYPES.includes(
      file.type as (typeof ALLOWED_VIDEO_DRAFT_MIME_TYPES)[number]
    )
  ) {
    return {
      status: 400,
      message: "MP4, WebM, MOV 형식의 영상만 사용할 수 있습니다.",
    };
  }
  if (file.size > MAX_VIDEO_DRAFT_BYTES) {
    return {
      status: 413,
      message: "영상 클립은 100MB 이하만 사용할 수 있습니다.",
    };
  }
  if (file.size <= 0) {
    return { status: 400, message: "비어 있는 영상 파일은 사용할 수 없습니다." };
  }
  return null;
}

function buildLockedRiotContextPrompt(
  lockedRiotContext?: LockedRiotVideoContext | null
) {
  if (!lockedRiotContext) return "";

  const keyEvents = lockedRiotContext.keyEvents?.length
    ? lockedRiotContext.keyEvents
        .map(
          (event) =>
            `- ${event.gameTimeSec}s ${event.type}: ${
              event.descriptionKo ?? "Riot timeline event"
            }`
        )
        .join("\n")
    : "- No compact key events provided.";
  const playerDelta = lockedRiotContext.playerDelta
    ? `CS ${lockedRiotContext.playerDelta.cs ?? "unknown"}, gold ${
        lockedRiotContext.playerDelta.gold ?? "unknown"
      }, XP ${lockedRiotContext.playerDelta.xp ?? "unknown"}`
    : "unknown";
  const enemyMidDelta = lockedRiotContext.enemyMidDelta
    ? `champion ${
        lockedRiotContext.enemyMidDelta.championName ??
        lockedRiotContext.enemyMidChampion ??
        "unknown"
      }, CS ${lockedRiotContext.enemyMidDelta.cs ?? "unknown"}, gold ${
        lockedRiotContext.enemyMidDelta.gold ?? "unknown"
      }, XP ${lockedRiotContext.enemyMidDelta.xp ?? "unknown"}`
    : "unknown";
  const roster = lockedRiotContext.roster ?? [];
  const playerLine = roster.find((participant) => participant.isPlayer);
  const allies = roster.filter((participant) => participant.side === "ally");
  const enemies = roster.filter((participant) => participant.side === "enemy");
  const formatRosterParticipant = (
    participant: NonNullable<LockedRiotVideoContext["roster"]>[number]
  ) =>
    `${participant.championName}(${participant.role}${
      participant.isPlayer ? ", player" : ""
    })`;
  const rosterSection =
    roster.length > 0
      ? `
[Riot Roster Lock]
Riot API confirmed the only champions in this match:
- Player: ${
          playerLine
            ? `${playerLine.championName} - ally ${playerLine.role}`
            : lockedRiotContext.playerChampion ?? "unknown"
        }
- Allies: ${allies.map(formatRosterParticipant).join(", ") || "unknown"}
- Enemies: ${enemies.map(formatRosterParticipant).join(", ") || "unknown"}

Roster lock rules:
1. Riot roster is the identity source of truth.
2. The player champion is locked as ${lockedRiotContext.playerChampion ?? "unknown"}.
3. The enemy mid champion is locked as ${lockedRiotContext.enemyMidChampion ?? "unknown"}.
4. If a visible champion appears in the video, first map it to the Riot roster.
5. If Hecarim appears and the roster says Hecarim is allied jungle, describe him as allied jungle, not as the player.
6. Do not override player champion or enemy mid champion from video.
7. If the video appears to show a champion not in the Riot roster, record it as uncertainty/conflict.
8. Do not put conflicting champion names into structured form fields.
9. Safe non-champion observations are still allowed: wave state, roam direction, fight join, warding, recall, low HP, and visible ally/enemy presence.
`
      : "";

  return `
Locked Riot context:
- matchId: ${lockedRiotContext.matchId ?? "unknown"}
- scene time: ${lockedRiotContext.gameTimeSec ?? "unknown"}s
- window after scene: ${lockedRiotContext.windowSec ?? "unknown"}s
- Riot-confirmed player champion: ${lockedRiotContext.playerChampion ?? "unknown"}
- Riot-confirmed enemy mid champion: ${lockedRiotContext.enemyMidChampion ?? "unknown"}
- player delta: ${playerDelta}
- enemy mid delta: ${enemyMidDelta}
- key Riot events:
${keyEvents}

${rosterSection}

Riot context lock rules:
- Treat the locked Riot context as source-of-truth for champion identities and timeline facts.
- Do not override Riot-confirmed playerChampion or enemyMidChampion based on video appearance.
- If the video appears to show another champion, report it only as uncertainty/conflict.
- Use this Korean wording when relevant: "영상상 다른 챔피언처럼 보일 수 있으나 Riot 기준 챔피언 정보와 충돌하므로 직접 확인이 필요합니다."
- Do not put conflicting champion names into structured form fields or top-level champion fields.
- Non-champion observations such as wave state, movement direction, fight join, warding, recall, and visible positioning can still be extracted.
`;
}

export function buildVideoDraftPrompt(
  note: string,
  lockedRiotContext?: LockedRiotVideoContext | null
) {
  const sceneNote = note.trim() || "추가 장면 메모 없음";

  return `
You extract form-ready review inputs from a short League of Legends clip for the existing Mid Laning Decision Review AI form.
This is NOT a generic video summary and NOT final coaching. Do not judge the play or submit the review form.

Player scene note:
${sceneNote}

${buildLockedRiotContextPrompt(lockedRiotContext)}

Use the player scene note as an important hint, while keeping conflicts with the visible clip in uncertainFacts.

Extraction order:
1. Identify the review scene type and outcome only when supported.
2. Extract structured facts for the existing form before writing the summary.
3. Focus on lane state and wave position before movement, mid roam/fight join, enemy mid movement, objective preparation/timing, death/loss/good decision/risky success, and post-fight conversion.
4. Mention jungle/support cover only when visible in the clip or explicitly stated in the scene note.
5. Put every unclear input in uncertainFacts instead of guessing. Prefer "확인 필요".

Map and jungle evidence rules:
- If you claim jungle position, ally jungle cover, movement side, fight direction, or support location, state the evidence source in fieldEvidenceSources.
- Use source "direct_screen" only when the relevant champion/action is visible on the main screen.
- Use source "minimap" only when the minimap clearly shows the relevant champion or movement.
- Use source "riot_event" only when locked Riot context key events directly support the claim.
- Use source "inferred" only for reasoning from wave state, pathing, missing champions, or likely macro intent.
- Use source "unknown" when the evidence source is unclear.
- Do not confidently fill enemyJungleInfo, allyJungleCover, or movementDirection from inferred or unknown evidence. If minimap is unclear, omit the field and write "확인 필요" in uncertainFacts.
- Safe non-jungle observations like wave state, roam direction, fight join, recall, and low HP can still be extracted when visible.

Accuracy rules:
- Treat every conclusion as a hypothesis.
- Do not overclaim champion names, exact cooldowns, items, gold, jungle position, objective state, or objective timing unless clearly visible or stated in the note.
- Preserve ally/enemy ownership exactly. Never turn an enemy into an ally or an ally into an enemy.
- Omit unsafe suggestedFields instead of guessing. Use only the listed enum values.
- Do not return Risk Tags or final coaching advice.
- The player note is a self-review hypothesis, not ground truth. Compare visibleFacts, playerHypothesis, coachingHypotheses, uncertainFacts, riskReasoning, and likelyGainLossStructure in the Korean text fields.
- For death/loss clips, do not default to risky_but_successful. Use death, loss, questionable, or unclear unless the visible outcome clearly succeeded despite risk.
- For solo-kill, warding, and non-objective death clips, do not include objectiveType, timeToObjective, or objectivePrepAction.
- If the note says dragon was secured, map suggestedFields.currentOutcome to secured_objective and do not reduce the clip to a lane roam.
- Avoid generic filler such as "교전 자체에 대한 판단은 필요" or "중앙 지역에서 교전이 발생" when more specific wave, movement, objective, outcome, or conversion information is visible.

suggestedFreeDescription rules:
- Write a form-ready Korean paragraph of 2-4 sentences, normally 120-300 Korean characters.
- Combine the scene note, clearly visible facts, and specific manual checks.
- State what happened before movement, what movement or fight occurred, the result, and what remains uncertain when available.
- It must be directly useful in the existing 추가 설명 field, not a generic observation.
- If the clip is unclear, still combine the scene note and visible facts, then explicitly list the important checks in natural sentences.

Example style only; do not copy facts that are not visible:
"미드 라인을 먼저 밀고 용 싸움에 합류한 장면으로 보입니다. 상대 미드가 먼저 움직였는지, 내가 라인을 완전히 밀고 갔는지는 영상에서 추가 확인이 필요합니다. 교전 결과는 좋았지만, 상대 합류 변수와 내 진입 타이밍을 함께 복기할 필요가 있습니다."

Return ONLY valid JSON with this exact structure:
{
  "suggestedScenarioType": "PRE_LANE_VISION | GANKED_WHILE_PUSHING | SOLO_KILL_TRADE | RECALL_GREED | UNSAFE_WARDING | ADVANTAGE_CONVERSION | OBJECTIVE_PREP_TURN | MID_ROAM_FIGHT_JOIN | GENERAL_LANING_DEATH | null",
  "suggestedSceneOutcomeAssessment": "good_decision | risky_but_successful | questionable | loss | death | unclear | null",
  "summary": "short Korean scene summary",
  "keyFacts": ["clearly visible Korean fact"],
  "uncertainFacts": ["unclear fact that needs confirmation"],
  "suggestedFreeDescription": "editable Korean description",
  "suggestedFields": {
    "currentOutcome": "death | solo_kill | failed_kill_attempt | survived_but_lost | fight_advantage | forced_enemy_recall | gained_lane_priority | lost_lane_priority | plate_or_cs_gain | plate_or_cs_loss | ganked_and_died | died_while_warding | vision_loss | objective_fight_loss | secured_objective | objective_trade_gain | missed_objective_and_lane_gain | unclear_objective_join_tradeoff (optional)",
    "objectiveType": "void_grubs | dragon | rift_herald (optional)",
    "lanePriority": "have_prio | no_prio | contested (optional)",
    "laneStateDetail": "crashed_into_enemy_tower | slow_pushing_to_enemy | enemy_freezing | neutral_middle | being_pushed_in | big_wave_bouncing_back (optional)",
    "enemyMidState": "visible_under_tower | visible_in_lane | missing | following_me | resetting_or_dead (optional)",
    "timeToObjective": "ninety_to_sixty | sixty_to_thirty | under_thirty | already_spawned (optional)",
    "objectivePrepAction": "pushed_mid | recalled | stayed_low_resource | moved_first | followed_late | took_plate_or_cs | placed_vision | did_not_prepare (optional)",
    "movementDirection": "top_side | bot_side (optional)",
    "enemyJungleInfo": "not_seen_recently | seen_same_side | seen_opposite_side | seen_near_mid | dead_or_recalled (optional)",
    "allyJungleCover": "same_side_near_mid | same_side_but_far | opposite_side | dead_or_recalled | resetting (optional)",
    "postPushIntent": "take_plate | roam | recall | ward | invade_with_jungle | hover_side_lane | stay_for_cs | escape_or_disengage (optional)"
  },
  "fieldEvidenceSources": {
    "movementDirection": { "source": "direct_screen | minimap | riot_event | inferred | unknown", "detail": "short reason (optional)" },
    "enemyJungleInfo": { "source": "direct_screen | minimap | riot_event | inferred | unknown", "championName": "enemy jungler name if visible or from Riot roster (optional)", "detail": "short reason (optional)" },
    "allyJungleCover": { "source": "direct_screen | minimap | riot_event | inferred | unknown", "championName": "ally jungler name if visible or from Riot roster (optional)", "detail": "short reason (optional)" }
  },
  "confidenceNote": "Korean explanation of what is visible and what still needs confirmation"
}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function acceptedValue<T extends string>(value: unknown, allowed: Set<T>) {
  return typeof value === "string" && allowed.has(value as T)
    ? (value as T)
    : undefined;
}

function normalizeFieldEvidenceSourceDetail(
  value: unknown
): VideoDraftFieldEvidenceSourceDetail | undefined {
  if (typeof value === "string") {
    const source = acceptedValue(value, VIDEO_DRAFT_MAP_EVIDENCE_SOURCES);
    return source ? { source } : undefined;
  }
  const record = asRecord(value);
  const source = acceptedValue(record.source, VIDEO_DRAFT_MAP_EVIDENCE_SOURCES);
  if (!source) return undefined;
  return {
    source,
    championName: normalizeString(record.championName) || undefined,
    detail: normalizeString(record.detail) || undefined,
  };
}

function normalizeFieldEvidenceSources(value: unknown): VideoDraftFieldEvidenceSources {
  const source = asRecord(value);
  return {
    movementDirection: normalizeFieldEvidenceSourceDetail(source.movementDirection),
    enemyJungleInfo: normalizeFieldEvidenceSourceDetail(source.enemyJungleInfo),
    allyJungleCover: normalizeFieldEvidenceSourceDetail(source.allyJungleCover),
  };
}

function compactFieldEvidenceSources(
  sources: VideoDraftFieldEvidenceSources
): VideoDraftFieldEvidenceSources | undefined {
  const compacted = Object.fromEntries(
    Object.entries(sources).filter(([, value]) => Boolean(value))
  ) as VideoDraftFieldEvidenceSources;
  return Object.keys(compacted).length > 0 ? compacted : undefined;
}

function hasTrustedMapEvidence(
  detail: VideoDraftFieldEvidenceSourceDetail | VideoDraftMapEvidenceSource | undefined
) {
  const source = typeof detail === "string" ? detail : detail?.source;
  return Boolean(source && TRUSTED_MAP_EVIDENCE_SOURCES.has(source));
}

function rosterParticipantMatches(
  participant: NonNullable<LockedRiotVideoContext["roster"]>[number],
  championName: string | undefined,
  side: "ally" | "enemy",
  role: "jungle" | "support"
) {
  return (
    participant.side === side &&
    participant.role === role &&
    (!championName ||
      normalizeChampionName(participant.championName) ===
        normalizeChampionName(championName))
  );
}

function hasRosterRoleEvidence({
  detail,
  roster,
  side,
  role,
}: {
  detail: VideoDraftFieldEvidenceSourceDetail | VideoDraftMapEvidenceSource | undefined;
  roster?: LockedRiotVideoContext["roster"];
  side: "ally" | "enemy";
  role: "jungle" | "support";
}) {
  if (!roster?.length || typeof detail === "string") return false;
  return roster.some((participant) =>
    rosterParticipantMatches(participant, detail?.championName, side, role)
  );
}

function buildWeakMapEvidenceNote(fieldLabel: string) {
  return `${fieldLabel}는 영상 근거가 추론 또는 불명확한 상태라 구조화 입력에는 넣지 않았습니다. 미니맵/화면/Riot 이벤트로 직접 확인이 필요합니다.`;
}

function hasAnyText(value: string, patterns: string[]) {
  const normalized = value.toLowerCase();
  return patterns.some((pattern) => normalized.includes(pattern.toLowerCase()));
}

function hasUncertaintyCue(value: string) {
  return hasAnyText(value, [
    "unclear",
    "unknown",
    "uncertain",
    "check",
    "confirm",
    "need confirmation",
    "확인 필요",
    "확인해야",
    "확인해주세요",
    "불확실",
    "불명확",
    "모름",
    "모르",
    "정확",
  ]);
}

function buildVerificationText(
  source: Record<string, unknown>,
  uncertainFacts: string[],
  confidenceNote: string
) {
  return [
    ...uncertainFacts,
    confidenceNote,
    normalizeString(source.verificationNote),
    ...normalizeStringArray(source.verificationNotes),
  ]
    .filter(Boolean)
    .join(" ");
}

function hasMapUncertaintyConflict(
  text: string,
  field: "enemyJungleInfo" | "allyJungleCover" | "movementDirection"
) {
  if (!hasUncertaintyCue(text)) return false;
  if (field === "allyJungleCover") {
    return hasAnyText(text, [
      "ally jungle",
      "allied jungle",
      "ally jungler",
      "jungle cover",
      "cover",
      "hecarim",
      "아군 정글",
      "우리 정글",
      "정글 커버",
      "커버",
      "헤카림",
    ]);
  }
  if (field === "enemyJungleInfo") {
    return hasAnyText(text, [
      "enemy jungle",
      "enemy jungler",
      "jungle location",
      "xin zhao",
      "상대 정글",
      "적 정글",
      "정글 위치",
      "신 짜오",
      "신짜오",
    ]);
  }
  return hasAnyText(text, [
    "movement direction",
    "fight direction",
    "movement side",
    "이동 방향",
    "교전 방향",
    "이동 쪽",
    "진입 방향",
  ]);
}

function ensureSentence(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /[.!?。]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function isGenericSceneText(value: string) {
  return (
    value.includes("교전 자체에 대한 판단은 필요") ||
    value.includes("중앙 지역에서 교전이 발생")
  );
}

function isWeakFreeDescription(value: string) {
  return (
    value.length < 60 ||
    isGenericSceneText(value)
  );
}

function includesAny(value: string, patterns: string[]) {
  const normalized = value.toLowerCase();
  return patterns.some((pattern) => normalized.includes(pattern));
}

function firstDraftChampionText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return "";
}

function findRosterChampion(
  roster: LockedRiotVideoContext["roster"] | undefined,
  championName: string
) {
  const championKey = normalizeChampionName(championName);
  if (!championKey) return undefined;
  return roster?.find(
    (participant) => normalizeChampionName(participant.championName) === championKey
  );
}

function roleLabelKo(role: NonNullable<LockedRiotVideoContext["roster"]>[number]["role"]) {
  switch (role) {
    case "top":
      return "탑";
    case "jungle":
      return "정글";
    case "mid":
      return "미드";
    case "bot":
      return "원딜";
    case "support":
      return "서포터";
    default:
      return "역할 미확인";
  }
}

function sideLabelKo(side: NonNullable<LockedRiotVideoContext["roster"]>[number]["side"]) {
  return side === "enemy" ? "상대" : "아군";
}

function championRosterConflictNote({
  draftChampion,
  lockedChampion,
  lockedRoleLabel,
  roster,
}: {
  draftChampion: string;
  lockedChampion?: string | null;
  lockedRoleLabel: "플레이어" | "상대 미드";
  roster?: LockedRiotVideoContext["roster"];
}) {
  if (!roster || roster.length === 0) {
    return `영상상 ${draftChampion}처럼 보일 수 있으나 Riot 기준 ${lockedRoleLabel} 챔피언 ${lockedChampion ?? "확인 필요"} 정보와 충돌하므로 직접 확인이 필요합니다.`;
  }

  const rosterParticipant = findRosterChampion(roster, draftChampion);
  if (rosterParticipant) {
    return `영상에서 ${draftChampion}이 보이지만 Riot roster 기준 ${lockedRoleLabel}는 ${lockedChampion ?? "확인 필요"}이며, ${draftChampion}은 ${sideLabelKo(rosterParticipant.side)} ${roleLabelKo(rosterParticipant.role)}로 보입니다.`;
  }

  return `영상에서 Riot roster에 없는 챔피언명 ${draftChampion}이 감지되어 신원 확정이 필요합니다.`;
}

function lockedChampionConflictNotes(
  source: Record<string, unknown>,
  lockedRiotContext?: LockedRiotVideoContext | null
) {
  if (!lockedRiotContext) return [];

  const notes: string[] = [];
  const draftPlayerChampion = firstDraftChampionText(
    source.myChampion,
    source.champion,
    source.playerChampion
  );
  const draftEnemyChampion = firstDraftChampionText(
    source.enemyChampion,
    source.opponentChampion
  );
  const lockedPlayerKey = normalizeChampionName(lockedRiotContext.playerChampion);
  const lockedEnemyKey = normalizeChampionName(lockedRiotContext.enemyMidChampion);
  const draftPlayerKey = normalizeChampionName(draftPlayerChampion);
  const draftEnemyKey = normalizeChampionName(draftEnemyChampion);

  if (lockedPlayerKey && draftPlayerKey && lockedPlayerKey !== draftPlayerKey) {
    notes.push(
      championRosterConflictNote({
        draftChampion: draftPlayerChampion,
        lockedChampion: lockedRiotContext.playerChampion,
        lockedRoleLabel: "플레이어",
        roster: lockedRiotContext.roster,
      })
    );
  }
  if (lockedEnemyKey && draftEnemyKey && lockedEnemyKey !== draftEnemyKey) {
    notes.push(
      championRosterConflictNote({
        draftChampion: draftEnemyChampion,
        lockedChampion: lockedRiotContext.enemyMidChampion,
        lockedRoleLabel: "상대 미드",
        roster: lockedRiotContext.roster,
      })
    );
  }

  return notes;
}

function normalizeSceneOutcomeAssessment({
  assessment,
  currentOutcome,
  scenario,
  sceneNote,
  summary,
}: {
  assessment: SceneOutcomeAssessment | undefined;
  currentOutcome: CurrentOutcome | undefined;
  scenario: ScenarioType | undefined;
  sceneNote: string;
  summary: string;
}) {
  if (assessment !== "risky_but_successful") return assessment;

  const text = `${sceneNote} ${summary}`;
  const hasDeathCue =
    currentOutcome === "death" ||
    currentOutcome === "ganked_and_died" ||
    currentOutcome === "died_while_warding" ||
    includesAny(text, ["죽었", "죽음", "사망", "데스", "died", "death"]);
  const hasLossCue =
    currentOutcome === "survived_but_lost" ||
    currentOutcome === "plate_or_cs_loss" ||
    currentOutcome === "objective_fight_loss" ||
    currentOutcome === "missed_objective_and_lane_gain" ||
    includesAny(text, ["손해", "잃었", "놓쳤", "loss", "lost"]);
  const hasSuccessCue =
    currentOutcome === "solo_kill" ||
    currentOutcome === "fight_advantage" ||
    currentOutcome === "secured_objective" ||
    currentOutcome === "objective_trade_gain" ||
    includesAny(text, ["성공", "이득", "챙겼", "secure", "secured", "gain"]);

  if (hasDeathCue && !hasSuccessCue) return "death";
  if (hasLossCue && !hasSuccessCue) return "loss";
  if (scenario === "UNSAFE_WARDING" && hasDeathCue) return "death";

  return assessment;
}

function shouldDropObjectiveFields({
  scenario,
  currentOutcome,
}: {
  scenario: ScenarioType | undefined;
  currentOutcome: CurrentOutcome | undefined;
}) {
  if (
    scenario === "OBJECTIVE_PREP_TURN" ||
    currentOutcome === "objective_fight_loss" ||
    currentOutcome === "secured_objective" ||
    currentOutcome === "objective_trade_gain" ||
    currentOutcome === "missed_objective_and_lane_gain" ||
    currentOutcome === "unclear_objective_join_tradeoff"
  ) {
    return false;
  }

  return (
    scenario === "SOLO_KILL_TRADE" ||
    scenario === "UNSAFE_WARDING" ||
    currentOutcome === "solo_kill" ||
    currentOutcome === "failed_kill_attempt" ||
    currentOutcome === "died_while_warding" ||
    currentOutcome === "vision_loss" ||
    currentOutcome === "overextended_for_vision" ||
    currentOutcome === "death" ||
    currentOutcome === "ganked_and_died" ||
    currentOutcome === "survived_but_lost"
  );
}

function buildFallbackFreeDescription({
  note,
  summary,
  keyFacts,
  uncertainFacts,
}: {
  note: string;
  summary: string;
  keyFacts: string[];
  uncertainFacts: string[];
}) {
  const sentences: string[] = [];
  if (note.trim()) sentences.push(ensureSentence(note));
  if (summary && !note.includes(summary) && !isGenericSceneText(summary)) {
    sentences.push(ensureSentence(`영상에서는 ${summary}으로 보입니다`));
  }
  if (keyFacts.length > 0) {
    sentences.push(
      ensureSentence(`영상에서 확인되는 내용은 ${keyFacts.slice(0, 2).join(", ")}입니다`)
    );
  }
  if (uncertainFacts.length > 0) {
    sentences.push(
      ensureSentence(
        `추가 확인이 필요한 항목은 ${uncertainFacts.slice(0, 3).join(", ")}입니다`
      )
    );
  }

  return (
    sentences.join(" ") ||
    "영상에서 장면의 세부 조건을 확정하기 어렵습니다. 이동 전 미드 웨이브, 상대 미드의 이동, 교전 결과와 이후 전환을 직접 확인해주세요."
  );
}

export function parseVideoReviewDraft(
  text: string,
  sceneNote = "",
  lockedRiotContext?: LockedRiotVideoContext | null
): VideoReviewDraft {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new InvalidVideoDraftResponseError(
      "영상 초안 응답을 해석하지 못했습니다. 다시 시도해주세요."
    );
  }

  const source = asRecord(parsed);
  const rawFields = asRecord(source.suggestedFields);
  const fieldEvidenceSources = normalizeFieldEvidenceSources(
    source.fieldEvidenceSources
  );
  const scenario = acceptedValue(source.suggestedScenarioType, SCENARIO_TYPES);
  const assessment = acceptedValue(
    source.suggestedSceneOutcomeAssessment,
    SCENE_OUTCOME_ASSESSMENTS
  );
  const summary = normalizeString(source.summary) || "장면의 일부 행동이 보입니다";
  const keyFacts = normalizeStringArray(source.keyFacts);
  const uncertainFacts = normalizeStringArray(source.uncertainFacts);
  const rawConfidenceNote = normalizeString(source.confidenceNote);
  const verificationText = buildVerificationText(
    source,
    uncertainFacts,
    rawConfidenceNote
  );
  const championConflictNotes = lockedChampionConflictNotes(
    source,
    lockedRiotContext
  );
  const normalizedUncertainFacts =
    keyFacts.length === 0 && uncertainFacts.length === 0
      ? [
          "이동 전 미드 웨이브 상태",
          "상대 미드의 이동 여부",
          "교전 결과와 이후 전환",
        ]
      : uncertainFacts;
  let finalUncertainFacts = Array.from(
    new Set([...championConflictNotes, ...normalizedUncertainFacts])
  ).slice(0, 8);
  const suggestedFreeDescription = normalizeString(
    source.suggestedFreeDescription
  );
  const currentOutcome = acceptedValue(
    rawFields.currentOutcome,
    CURRENT_OUTCOMES
  );
  const suggestedFields = {
    currentOutcome,
    objectiveType: acceptedValue(rawFields.objectiveType, OBJECTIVE_TYPES),
    lanePriority: acceptedValue(rawFields.lanePriority, LANE_PRIORITIES),
    laneStateDetail: acceptedValue(
      rawFields.laneStateDetail,
      LANE_STATE_DETAILS
    ),
    enemyMidState: acceptedValue(rawFields.enemyMidState, ENEMY_MID_STATES),
    timeToObjective: acceptedValue(
      rawFields.timeToObjective,
      OBJECTIVE_TIMINGS
    ),
    objectivePrepAction: acceptedValue(
      rawFields.objectivePrepAction,
      OBJECTIVE_PREP_ACTIONS
    ),
    movementDirection: acceptedValue(
      rawFields.movementDirection,
      MOVEMENT_DIRECTIONS
    ),
    enemyJungleInfo: acceptedValue(
      rawFields.enemyJungleInfo,
      ENEMY_JUNGLE_INFO
    ),
    allyJungleCover: acceptedValue(
      rawFields.allyJungleCover,
      ALLY_JUNGLE_COVER
    ),
    postPushIntent: acceptedValue(
      rawFields.postPushIntent,
      POST_PUSH_INTENTS
    ),
  };
  const weakMapEvidenceNotes: string[] = [];
  if (
    suggestedFields.movementDirection &&
    (!hasTrustedMapEvidence(fieldEvidenceSources.movementDirection) ||
      hasMapUncertaintyConflict(verificationText, "movementDirection"))
  ) {
    suggestedFields.movementDirection = undefined;
    weakMapEvidenceNotes.push(buildWeakMapEvidenceNote("이동 방향/교전 방향"));
  }
  if (
    suggestedFields.enemyJungleInfo &&
    (!hasTrustedMapEvidence(fieldEvidenceSources.enemyJungleInfo) ||
      hasMapUncertaintyConflict(verificationText, "enemyJungleInfo"))
  ) {
    suggestedFields.enemyJungleInfo = undefined;
    weakMapEvidenceNotes.push(buildWeakMapEvidenceNote("상대 정글 위치"));
  }
  if (
    suggestedFields.enemyJungleInfo &&
    fieldEvidenceSources.enemyJungleInfo &&
    typeof fieldEvidenceSources.enemyJungleInfo !== "string" &&
    fieldEvidenceSources.enemyJungleInfo.source === "minimap" &&
    fieldEvidenceSources.enemyJungleInfo.championName &&
    lockedRiotContext?.roster?.length &&
    !hasRosterRoleEvidence({
      detail: fieldEvidenceSources.enemyJungleInfo,
      roster: lockedRiotContext.roster,
      side: "enemy",
      role: "jungle",
    })
  ) {
    suggestedFields.enemyJungleInfo = undefined;
    weakMapEvidenceNotes.push(
      "미니맵에서 본 챔피언이 Riot roster 기준 상대 정글로 확인되지 않아 상대 정글 위치 입력은 보류했습니다."
    );
  }
  if (
    suggestedFields.allyJungleCover &&
    (!hasTrustedMapEvidence(fieldEvidenceSources.allyJungleCover) ||
      hasMapUncertaintyConflict(verificationText, "allyJungleCover"))
  ) {
    suggestedFields.allyJungleCover = undefined;
    weakMapEvidenceNotes.push(buildWeakMapEvidenceNote("아군 정글 커버"));
  }
  if (
    suggestedFields.allyJungleCover &&
    fieldEvidenceSources.allyJungleCover &&
    typeof fieldEvidenceSources.allyJungleCover !== "string" &&
    fieldEvidenceSources.allyJungleCover.source === "minimap" &&
    fieldEvidenceSources.allyJungleCover.championName &&
    lockedRiotContext?.roster?.length &&
    !hasRosterRoleEvidence({
      detail: fieldEvidenceSources.allyJungleCover,
      roster: lockedRiotContext.roster,
      side: "ally",
      role: "jungle",
    })
  ) {
    suggestedFields.allyJungleCover = undefined;
    weakMapEvidenceNotes.push(
      "미니맵에서 본 챔피언이 Riot roster 기준 아군 정글로 확인되지 않아 아군 정글 커버 입력은 보류했습니다."
    );
  }
  if (weakMapEvidenceNotes.length > 0) {
    finalUncertainFacts = Array.from(
      new Set([...weakMapEvidenceNotes, ...finalUncertainFacts])
    ).slice(0, 8);
  }
  if (shouldDropObjectiveFields({ scenario, currentOutcome })) {
    suggestedFields.objectiveType = undefined;
    suggestedFields.timeToObjective = undefined;
    suggestedFields.objectivePrepAction = undefined;
  }
  if (
    currentOutcome === "secured_objective" &&
    suggestedFields.postPushIntent === "roam"
  ) {
    suggestedFields.postPushIntent = undefined;
  }
  const compactedFieldEvidenceSources =
    compactFieldEvidenceSources(fieldEvidenceSources);

  return {
    suggestedScenarioType: scenario ?? null,
    suggestedSceneOutcomeAssessment:
      normalizeSceneOutcomeAssessment({
        assessment,
        currentOutcome,
        scenario,
        sceneNote,
        summary,
      }) ?? null,
    summary,
    keyFacts,
    uncertainFacts: finalUncertainFacts,
    suggestedFreeDescription: isWeakFreeDescription(suggestedFreeDescription)
      ? buildFallbackFreeDescription({
          note: sceneNote,
          summary,
          keyFacts,
          uncertainFacts: finalUncertainFacts,
        })
      : suggestedFreeDescription,
    suggestedFields: Object.fromEntries(
      Object.entries(suggestedFields).filter(([, value]) => value !== undefined)
    ),
    ...(compactedFieldEvidenceSources
      ? { fieldEvidenceSources: compactedFieldEvidenceSources }
      : {}),
    confidenceNote:
      championConflictNotes.length > 0
        ? [
            rawConfidenceNote,
            "Riot 기준 챔피언 정보와 영상 추정이 충돌할 수 있어 챔피언명은 Riot 정보를 우선해야 합니다.",
          ]
            .filter(Boolean)
            .join(" ")
        : rawConfidenceNote ||
          "영상만으로 확정하기 어려운 정보는 직접 확인해주세요.",
  };
}
