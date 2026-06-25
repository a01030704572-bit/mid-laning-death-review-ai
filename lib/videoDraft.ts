import type { VideoReviewDraft } from "@/types/videoDraft";
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

export function buildVideoDraftPrompt(note: string) {
  const sceneNote = note.trim() || "추가 장면 메모 없음";

  return `
You extract form-ready review inputs from a short League of Legends clip for the existing Mid Laning Decision Review AI form.
This is NOT a generic video summary and NOT final coaching. Do not judge the play or submit the review form.

Player scene note:
${sceneNote}

Use the player scene note as an important hint, while keeping conflicts with the visible clip in uncertainFacts.

Extraction order:
1. Identify the review scene type and outcome only when supported.
2. Extract structured facts for the existing form before writing the summary.
3. Focus on lane state and wave position before movement, mid roam/fight join, enemy mid movement, objective preparation/timing, death/loss/good decision/risky success, and post-fight conversion.
4. Mention jungle/support cover only when visible in the clip or explicitly stated in the scene note.
5. Put every unclear input in uncertainFacts instead of guessing. Prefer "확인 필요".

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
  sceneNote = ""
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
  const scenario = acceptedValue(source.suggestedScenarioType, SCENARIO_TYPES);
  const assessment = acceptedValue(
    source.suggestedSceneOutcomeAssessment,
    SCENE_OUTCOME_ASSESSMENTS
  );
  const summary = normalizeString(source.summary) || "장면의 일부 행동이 보입니다";
  const keyFacts = normalizeStringArray(source.keyFacts);
  const uncertainFacts = normalizeStringArray(source.uncertainFacts);
  const normalizedUncertainFacts =
    keyFacts.length === 0 && uncertainFacts.length === 0
      ? [
          "이동 전 미드 웨이브 상태",
          "상대 미드의 이동 여부",
          "교전 결과와 이후 전환",
        ]
      : uncertainFacts;
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
    uncertainFacts: normalizedUncertainFacts,
    suggestedFreeDescription: isWeakFreeDescription(suggestedFreeDescription)
      ? buildFallbackFreeDescription({
          note: sceneNote,
          summary,
          keyFacts,
          uncertainFacts: normalizedUncertainFacts,
        })
      : suggestedFreeDescription,
    suggestedFields: Object.fromEntries(
      Object.entries(suggestedFields).filter(([, value]) => value !== undefined)
    ),
    confidenceNote:
      normalizeString(source.confidenceNote) ||
      "영상만으로 확정하기 어려운 정보는 직접 확인해주세요.",
  };
}
