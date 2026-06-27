"use client";

import { useState } from "react";
import type { SceneOutcomeAssessment, ScenarioType } from "@/types/review";
import type {
  VideoDraftSuggestedFields,
  VideoReviewDraft,
} from "@/types/videoDraft";
import {
  ALLOWED_VIDEO_DRAFT_MIME_TYPES,
  MAX_VIDEO_DRAFT_BYTES,
} from "@/lib/videoDraft";

type Props = {
  onDraftChange?: (draft: VideoReviewDraft | null) => void;
};

const SCENARIO_LABELS: Record<ScenarioType, string> = {
  PRE_LANE_VISION: "레벨 1 시야 / 인베이드",
  GANKED_WHILE_PUSHING: "라인 푸시 중 갱킹",
  SOLO_KILL_TRADE: "1:1 교전 / 킬각",
  RECALL_GREED: "귀환 타이밍 / 자원 관리",
  UNSAFE_WARDING: "위험한 와딩",
  ADVANTAGE_CONVERSION: "이득 이후 운영",
  OBJECTIVE_PREP_TURN: "오브젝트 준비 / 교환 판단",
  MID_ROAM_FIGHT_JOIN: "미드 로밍 / 교전 합류",
  GENERAL_LANING_DEATH: "일반 라인전 상황",
};

const ASSESSMENT_LABELS: Record<SceneOutcomeAssessment, string> = {
  good_decision: "좋은 판단",
  risky_but_successful: "결과는 좋았지만 위험한 판단",
  questionable: "아쉬운 판단",
  loss: "손해로 이어진 판단",
  death: "죽음으로 이어진 판단",
  unclear: "판단하기 어려움",
};

const FIELD_LABELS: Record<keyof VideoDraftSuggestedFields, string> = {
  currentOutcome: "결과",
  objectiveType: "오브젝트",
  lanePriority: "미드 주도권",
  laneStateDetail: "이동 전 웨이브",
  enemyMidState: "상대 미드 상태",
  timeToObjective: "오브젝트까지 남은 시간",
  objectivePrepAction: "오브젝트 준비 행동",
  movementDirection: "이동 방향",
  enemyJungleInfo: "상대 정글 정보",
  allyJungleCover: "아군 정글 커버",
  postPushIntent: "교전 후 전환 / 다음 행동",
};

const FIELD_VALUE_LABELS: Record<string, string> = {
  death: "죽었다",
  solo_kill: "솔로킬을 냈다",
  failed_kill_attempt: "킬각을 봤지만 실패했다",
  survived_but_lost: "살았지만 손해를 봤다",
  fight_advantage: "교전에서 이득을 봤다",
  forced_enemy_recall: "상대 귀환을 강제했다",
  gained_lane_priority: "라인 주도권을 얻었다",
  lost_lane_priority: "라인 주도권을 잃었다",
  plate_or_cs_gain: "플레이트나 CS 이득을 봤다",
  plate_or_cs_loss: "플레이트나 CS 손해를 봤다",
  unclear_recall_timing: "귀환 타이밍이 애매했다",
  ganked_and_died: "갱을 당해 죽었다",
  escaped_gank_but_lost: "갱은 피했지만 손해를 봤다",
  ally_jungle_coordination_mismatch: "아군 정글과 합이 맞지 않았다",
  fought_despite_known_enemy_jungle: "상대 정글 정보를 알고도 싸웠다",
  cover_misread: "커버 방향을 잘못 읽었다",
  died_while_warding: "와딩하다 죽었다",
  vision_loss: "시야 주도권을 잃었다",
  overextended_for_vision: "시야를 잡으려다 과하게 나갔다",
  unclear_post_vision_decision: "시야 이후 판단이 애매했다",
  objective_fight_loss: "오브젝트 싸움에서 손해를 봤다",
  secured_objective: "오브젝트를 챙겼다",
  objective_trade_gain: "오브젝트를 포기하고 다른 이득을 봤다",
  missed_objective_and_lane_gain: "오브젝트도 라인 이득도 놓쳤다",
  unclear_objective_join_tradeoff: "합류와 라인 선택이 애매했다",
  unknown: "확인 필요",
  void_grubs: "공허 유충",
  dragon: "드래곤",
  rift_herald: "협곡의 전령",
  have_prio: "미드 주도권 있음",
  no_prio: "미드 주도권 없음",
  contested: "미드 주도권 경합",
  crashed_into_enemy_tower: "웨이브를 상대 타워에 밀어 넣음",
  slow_pushing_to_enemy: "웨이브가 상대 쪽으로 천천히 밀리는 중",
  enemy_freezing: "상대가 웨이브를 프리징 중",
  neutral_middle: "웨이브가 미드 중앙 근처",
  being_pushed_in: "웨이브를 받아먹는 중",
  big_wave_bouncing_back: "상대 타워에서 큰 웨이브가 돌아오는 중",
  visible_under_tower: "상대 미드가 타워 아래에 보임",
  visible_in_lane: "상대 미드가 라인에 보임",
  missing: "상대 미드가 보이지 않음",
  following_me: "상대 미드가 따라오는 중",
  resetting_or_dead: "상대 미드가 귀환 중이거나 죽은 상태",
  ninety_to_sixty: "오브젝트 약 60~90초 전",
  sixty_to_thirty: "오브젝트 약 30~60초 전",
  under_thirty: "오브젝트 30초 이내",
  already_spawned: "오브젝트가 이미 생성됨",
  pushed_mid: "미드 웨이브를 먼저 정리함",
  recalled: "오브젝트 전에 귀환함",
  stayed_low_resource: "자원이 부족한 채 남음",
  moved_first: "오브젝트 쪽으로 먼저 이동함",
  followed_late: "웨이브를 정리하지 못하고 늦게 합류함",
  took_plate_or_cs: "플레이트나 CS를 선택함",
  placed_vision: "오브젝트 주변 시야를 준비함",
  did_not_prepare: "별도 준비 행동이 보이지 않음",
  top_side: "탑 쪽",
  bot_side: "바텀 쪽",
  not_seen_recently: "상대 정글을 최근에 확인하지 못함",
  seen_same_side: "상대 정글이 같은 쪽에서 확인됨",
  seen_opposite_side: "상대 정글이 반대쪽에서 확인됨",
  seen_near_mid: "상대 정글이 미드 근처에서 확인됨",
  dead_or_recalled: "죽었거나 귀환한 상태",
  same_side_near_mid: "아군 정글이 같은 쪽 미드 근처",
  same_side_but_far: "아군 정글이 같은 쪽이지만 멀리 있음",
  opposite_side: "아군 정글이 반대쪽",
  resetting: "아군 정글이 귀환 중",
  take_plate: "플레이트로 전환",
  roam: "다른 라인 로밍으로 전환",
  recall: "귀환으로 전환",
  ward: "시야 확보로 전환",
  invade_with_jungle: "아군 정글과 함께 진입",
  hover_side_lane: "사이드 라인 지원",
  stay_for_cs: "웨이브와 CS를 선택",
  escape_or_disengage: "이탈을 우선함",
};

export default function VideoDraftPanel({ onDraftChange }: Props) {
  const [clip, setClip] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [provider, setProvider] = useState<"gemini" | "openai">("gemini");
  const [draft, setDraft] = useState<VideoReviewDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit() {
    setError(null);
    setCopied(false);
    setDraft(null);
    onDraftChange?.(null);

    if (!clip) {
      setError("영상 클립 파일을 선택해주세요.");
      return;
    }
    if (
      !ALLOWED_VIDEO_DRAFT_MIME_TYPES.includes(
        clip.type as (typeof ALLOWED_VIDEO_DRAFT_MIME_TYPES)[number]
      )
    ) {
      setError("MP4, WebM, MOV 형식의 영상만 사용할 수 있습니다.");
      return;
    }
    if (clip.size > MAX_VIDEO_DRAFT_BYTES) {
      setError("영상 클립은 100MB 이하만 사용할 수 있습니다.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("clip", clip);
      formData.append("note", note);
      formData.append("provider", provider);

      const response = await fetch("/api/video-draft", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as {
        draft?: VideoReviewDraft;
        error?: string;
      };

      if (!response.ok || !data.draft) {
        throw new Error(data.error || "영상 초안 생성에 실패했습니다.");
      }
      setDraft(data.draft);
      onDraftChange?.(data.draft);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "영상 초안 생성에 실패했습니다."
      );
    } finally {
      setLoading(false);
    }
  }

  async function copySuggestedDescription() {
    if (!draft?.suggestedFreeDescription) return;
    try {
      await navigator.clipboard.writeText(draft.suggestedFreeDescription);
      setCopied(true);
    } catch {
      setError("클립보드에 복사하지 못했습니다. 텍스트를 직접 선택해주세요.");
    }
  }

  const suggestedFieldEntries = draft
    ? Object.entries(draft.suggestedFields).filter(([, value]) => value)
    : [];

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-bold text-zinc-950">영상에서 복기 입력값 추출</h2>
        <p className="mt-1 text-sm text-zinc-500">
          짧은 클립에서 기존 복기 폼에 사용할 장면 사실과 입력값 초안을 추출합니다. 최종 판단이나 코칭이 아니며, 내용을 직접 확인한 뒤 수동으로 사용하세요.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-zinc-800">
            영상 클립
          </label>
          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
            onChange={(event) => {
              setClip(event.target.files?.[0] ?? null);
              setError(null);
              setDraft(null);
              onDraftChange?.(null);
            }}
            className="mt-1 block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-800 hover:file:bg-zinc-200"
          />
          <p className="mt-1 text-xs text-zinc-500">
            MP4, WebM, MOV · 최대 100MB · 15~60초 권장
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-800">
            장면 메모 <span className="font-normal text-zinc-400">(선택)</span>
          </label>
          <textarea
            value={note}
            maxLength={500}
            onChange={(event) => setNote(event.target.value)}
            placeholder="예: 용 싸움 장면, 아칼리 시점."
            className="mt-1 min-h-20 w-full rounded-lg border border-zinc-300 p-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-800">
          영상 분석 provider
        </label>
        <select
          value={provider}
          onChange={(event) => {
            setProvider(event.target.value as "gemini" | "openai");
            setError(null);
            setDraft(null);
            onDraftChange?.(null);
          }}
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white p-2 text-sm text-zinc-800 md:max-w-xs"
        >
          <option value="gemini">Gemini native video</option>
          <option value="openai">OpenAI frame vision</option>
        </select>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading}
        className="rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {loading ? "영상 처리 및 입력값 추출 중..." : "복기 입력값 초안 추출하기"}
      </button>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {draft && (
        <div className="space-y-4 border-t border-zinc-200 pt-4">
          <div className="flex flex-wrap gap-2 text-xs font-medium">
            {draft.suggestedScenarioType && (
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700">
                {SCENARIO_LABELS[draft.suggestedScenarioType]}
              </span>
            )}
            {draft.suggestedSceneOutcomeAssessment && (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                {ASSESSMENT_LABELS[draft.suggestedSceneOutcomeAssessment]}
              </span>
            )}
          </div>

          <DraftSection title="장면 요약">
            <p>{draft.summary}</p>
          </DraftSection>

          <div className="grid gap-3 md:grid-cols-2">
            <DraftList title="영상에서 확인된 내용" items={draft.keyFacts} />
            <DraftList
              title="직접 확인할 내용"
              items={draft.uncertainFacts}
              emptyMessage="추가로 표시된 불확실 정보가 없습니다."
            />
          </div>

          {suggestedFieldEntries.length > 0 && (
            <DraftSection title="복기 폼 입력 후보">
              <dl className="space-y-1">
                {suggestedFieldEntries.map(([key, value]) => (
                  <div key={key} className="flex gap-2">
                    <dt className="font-medium text-zinc-900">
                      {FIELD_LABELS[key as keyof VideoDraftSuggestedFields]}:
                    </dt>
                    <dd>{FIELD_VALUE_LABELS[String(value)] ?? "확인 필요"}</dd>
                  </div>
                ))}
              </dl>
            </DraftSection>
          )}

          <DraftSection title="복기 폼에 사용할 추가 설명 초안">
            <p className="whitespace-pre-wrap">{draft.suggestedFreeDescription || "확인 필요"}</p>
            <button
              type="button"
              onClick={copySuggestedDescription}
              disabled={!draft.suggestedFreeDescription}
              className="mt-3 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-40"
            >
              {copied ? "복사됨" : "추가 설명 복사"}
            </button>
          </DraftSection>

          <p className="text-xs leading-5 text-zinc-500">
            {draft.confidenceNote}
          </p>
        </div>
      )}
    </section>
  );
}

function DraftSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
      <h3 className="font-semibold text-zinc-900">{title}</h3>
      <div className="mt-2 leading-6">{children}</div>
    </div>
  );
}

function DraftList({
  title,
  items,
  emptyMessage = "영상에서 확실히 확인된 내용이 없습니다.",
}: {
  title: string;
  items: string[];
  emptyMessage?: string;
}) {
  return (
    <DraftSection title={title}>
      {items.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5">
          {items.map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <p>{emptyMessage}</p>
      )}
    </DraftSection>
  );
}
