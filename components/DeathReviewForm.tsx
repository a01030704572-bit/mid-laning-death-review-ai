"use client";

import { useState } from "react";
import { DeathReviewInput, ReviewResult, RiskTag, ScenarioType } from "@/types/review";
import {
  laneStateDetailOptions,
  allyJunglePositionOptions,
  postPushIntentOptions,
  teamSideOptions,
  movementSideOptions,
  wardLocationDetailOptions,
  enemyMidStateOptions,
  allyJungleSideDetailOptions,
} from "@/lib/modules/vision/options";

// ─── Types ───────────────────────────────────────────────────────────────────

type Props = {
  onResult: (data: { riskTags: RiskTag[]; result: ReviewResult }) => void;
};

type UserScenario = ScenarioType | "NOT_SURE";

// ─── Constants ───────────────────────────────────────────────────────────────

const initialInput: DeathReviewInput = {
  playerTier: "gold",
  currentOutcome: "death",
  myChampion: "",
  enemyChampion: "",
  gameTime: "pre_lane",
  laneState: "pre_lane",
  beforeDeathAction: "early_jungle_tracking_ward",
  visionState: "no_river_vision",
  enemyJungleLocation: "unknown",
  survivalResources: [],
  deathCause: "unknown",
  freeDescription: "",
  laneStateDetail: "unknown",
  allyJunglePosition: "unknown",
  visionPurpose: "unknown",
  postPushIntent: "unknown",
  teamSide: "unknown",
  movementSide: "unknown",
  wardLocationDetail: "unknown",
  enemyMidState: "unknown",
  allyJungleSideDetail: "unknown",
  enemyKeyCooldownsKnown: "",
  myKeyCooldownsKnown: "",
  matchupNote: "",
};

// Step 3: scenario options
const SCENARIO_OPTIONS: { value: UserScenario; label: string; sub: string }[] = [
  {
    value: "PRE_LANE_VISION",
    label: "레벨 1 시야 / 인베이드",
    sub: "레인 시작 전 시야를 잡거나 인베이드 중 발생한 상황",
  },
  {
    value: "GANKED_WHILE_PUSHING",
    label: "라인 푸시 중 갱 당함",
    sub: "라인을 밀다가 정글 갱킹에 당한 상황",
  },
  {
    value: "SOLO_KILL_TRADE",
    label: "1:1 교전 / 킬각",
    sub: "상대와 1:1 딜교 또는 킬각을 노리다 발생한 상황",
  },
  {
    value: "RECALL_GREED",
    label: "귀환 탐욕",
    sub: "귀환 타이밍을 놓치거나 더 먹으려다 발생한 상황",
  },
  {
    value: "UNSAFE_WARDING",
    label: "위험한 와딩",
    sub: "와드를 박으러 갔다가 발생한 상황",
  },
  {
    value: "ADVANTAGE_CONVERSION",
    label: "이득 후 운영",
    sub: "이득을 만들었는데 그 이후 판단이 애매한 상황",
  },
  {
    value: "NOT_SURE",
    label: "잘 모르겠다",
    sub: "어떤 유형인지 판단이 어려운 상황",
  },
];

// Outcome options
const OUTCOME_OPTIONS: [string, string][] = [
  ["death", "죽었다"],
  ["survived_but_lost", "살아남았지만 손해를 봤다"],
  ["forced_enemy_recall", "상대를 집 보냈다"],
  ["solo_kill", "솔킬을 땄다"],
  ["gained_lane_priority", "라인 주도권을 얻었다"],
  ["plate_or_cs_gain", "플레이트 / CS 이득을 봤다"],
  ["unknown", "잘 모르겠다"],
];

// survivalResources checkboxes
const SURVIVAL_RESOURCE_OPTIONS: [string, string][] = [
  ["no_flash", "Flash 없음"],
  ["no_escape", "이동기 없음"],
  ["low_hp", "체력 낮음"],
  ["low_resource", "마나 / 기력 부족"],
  ["key_cooldown_down", "주요 스킬 쿨타임"],
];

// deathCause mapping per scenario (hidden field — set automatically)
function getDefaultDeathCause(scenario: UserScenario): string {
  switch (scenario) {
    case "PRE_LANE_VISION":    return "pre_lane_vision_invade";
    case "GANKED_WHILE_PUSHING": return "jungle_gank";
    case "SOLO_KILL_TRADE":    return "solo_kill";
    case "RECALL_GREED":       return "recall_greed";
    case "UNSAFE_WARDING":     return "warding_death";
    case "ADVANTAGE_CONVERSION": return "unknown";
    default:                   return "unknown";
  }
}

// gameTime / laneState defaults per scenario
function getScenarioDefaults(scenario: UserScenario): Partial<DeathReviewInput> {
  switch (scenario) {
    case "PRE_LANE_VISION":
      return { gameTime: "pre_lane", laneState: "pre_lane", beforeDeathAction: "early_jungle_tracking_ward" };
    case "GANKED_WHILE_PUSHING":
      return { gameTime: "first_jungle_window", laneState: "pushing" };
    case "ADVANTAGE_CONVERSION":
      return { laneState: "center" };
    default:
      return {};
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DeathReviewForm({ onResult }: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [userScenario, setUserScenario] = useState<UserScenario | null>(null);
  const [input, setInput] = useState<DeathReviewInput>(initialInput);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);

  // ── Helpers ──────────────────────────────────────────────────────────────

  function updateField<K extends keyof DeathReviewInput>(key: K, value: DeathReviewInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
  }

  function toggleResource(resource: string) {
    setInput((prev) => {
      const exists = prev.survivalResources.includes(resource);
      return {
        ...prev,
        survivalResources: exists
          ? prev.survivalResources.filter((r) => r !== resource)
          : [...prev.survivalResources, resource],
      };
    });
  }

  function selectScenario(scenario: UserScenario) {
    setUserScenario(scenario);
    const defaults = getScenarioDefaults(scenario);
    const deathCause = getDefaultDeathCause(scenario);
    setInput((prev) => ({ ...prev, ...defaults, deathCause }));
    setStep(4);
  }

  function goBack() {
    if (step === 4) { setStep(3); setUserScenario(null); }
    else if (step === 3) setStep(2);
    else if (step === 2) setStep(1);
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Review request failed.");
      onResult(data);
    } catch (error) {
      console.error(error);
      alert("리뷰 생성에 실패했습니다. API Key 또는 서버 로그를 확인해보세요.");
    } finally {
      setLoading(false);
    }
  }

  // ── Advanced fields — which ones are already shown in step 4 for this scenario
  const scenarioExposedAdvanced: (keyof DeathReviewInput)[] = (() => {
    switch (userScenario) {
      case "PRE_LANE_VISION":
      case "UNSAFE_WARDING":
        return ["wardLocationDetail", "enemyMidState", "enemyKeyCooldownsKnown", "myKeyCooldownsKnown"];
      case "SOLO_KILL_TRADE":
        return ["enemyKeyCooldownsKnown", "myKeyCooldownsKnown"];
      default:
        return ["enemyKeyCooldownsKnown", "myKeyCooldownsKnown"];
    }
  })();

  // ── Step indicator
  const STEP_LABELS = ["기본 정보", "무슨 일이?", "상황 유형", "세부 내용"];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-0 rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">

      {/* Progress bar */}
      <div className="flex border-b border-zinc-100">
        {STEP_LABELS.map((label, i) => {
          const s = (i + 1) as 1 | 2 | 3 | 4;
          const active = step === s;
          const done = step > s;
          return (
            <div
              key={s}
              className={`flex-1 py-3 text-center text-xs font-medium transition-colors
                ${active ? "bg-zinc-950 text-white" : done ? "bg-zinc-100 text-zinc-500" : "text-zinc-400"}`}
            >
              <span className={`inline-flex items-center gap-1.5`}>
                <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px]
                  ${active ? "bg-white text-zinc-950" : done ? "bg-zinc-400 text-white" : "bg-zinc-200 text-zinc-500"}`}>
                  {done ? "✓" : s}
                </span>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="p-6 space-y-5">

        {/* ── STEP 1: Basic Info ─────────────────────────────────────────── */}
        {step === 1 && (
          <>
            <StepHeading
              title="기본 정보"
              desc="복기할 챔피언과 티어를 입력하세요."
            />

            <div>
              <label className="block text-sm font-medium">내 챔피언</label>
              <input
                className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-sm"
                value={input.myChampion}
                onChange={(e) => updateField("myChampion", e.target.value)}
                placeholder="예: 아칼리"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">상대 미드 챔피언</label>
              <input
                className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-sm"
                value={input.enemyChampion}
                onChange={(e) => updateField("enemyChampion", e.target.value)}
                placeholder="예: 벡스"
              />
            </div>

            <SelectField
              label="내 티어"
              value={input.playerTier}
              onChange={(v) => updateField("playerTier", v)}
              options={[
                ["iron_bronze", "Iron / Bronze"],
                ["silver", "Silver"],
                ["gold", "Gold"],
                ["platinum", "Platinum"],
                ["emerald", "Emerald"],
                ["diamond_plus", "Diamond+"],
                ["master_plus", "Master+"],
              ]}
            />

            <NavButtons
              onNext={() => setStep(2)}
              nextDisabled={!input.myChampion.trim() || !input.enemyChampion.trim()}
              nextLabel="다음 →"
            />
          </>
        )}

        {/* ── STEP 2: What happened? ─────────────────────────────────────── */}
        {step === 2 && (
          <>
            <StepHeading
              title="무슨 일이 있었나요?"
              desc="상황의 결과를 선택하세요."
            />

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {OUTCOME_OPTIONS.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    updateField("currentOutcome", value);
                    setStep(3);
                  }}
                  className={`rounded-xl border p-3 text-left text-sm font-medium transition-colors
                    ${input.currentOutcome === value
                      ? "border-zinc-900 bg-zinc-950 text-white"
                      : "border-zinc-200 bg-zinc-50 text-zinc-800 hover:border-zinc-400"
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <NavButtons onBack={() => setStep(1)} nextLabel="" onNext={() => {}} nextHidden />
          </>
        )}

        {/* ── STEP 3: Scenario Type ──────────────────────────────────────── */}
        {step === 3 && (
          <>
            <StepHeading
              title="어떤 유형의 상황이었나요?"
              desc="가장 가까운 상황을 선택하세요. AI가 이 유형에 맞는 질문을 드립니다."
            />

            <div className="space-y-2">
              {SCENARIO_OPTIONS.map(({ value, label, sub }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => selectScenario(value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-left transition-colors hover:border-zinc-400 hover:bg-zinc-100"
                >
                  <p className="text-sm font-semibold text-zinc-900">{label}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">{sub}</p>
                </button>
              ))}
            </div>

            <NavButtons onBack={() => setStep(2)} nextLabel="" onNext={() => {}} nextHidden />
          </>
        )}

        {/* ── STEP 4: Scenario-specific fields ──────────────────────────── */}
        {step === 4 && userScenario && (
          <>
            <StepHeading
              title={SCENARIO_OPTIONS.find((s) => s.value === userScenario)?.label ?? "세부 내용"}
              desc="해당 상황의 세부 정보를 입력하세요. 모르는 항목은 건너뛰어도 됩니다."
            />

            {/* ── PRE_LANE_VISION ── */}
            {userScenario === "PRE_LANE_VISION" && (
              <>
                <SelectField
                  label="혼자였나요, 아니면 누군가 함께였나요?"
                  value={input.allyJunglePosition}
                  onChange={(v) => updateField("allyJunglePosition", v as DeathReviewInput["allyJunglePosition"])}
                  options={allyJunglePositionOptions}
                />
                <SelectField
                  label="상대 정글 위치"
                  value={input.enemyJungleLocation}
                  onChange={(v) => updateField("enemyJungleLocation", v)}
                  options={[
                    ["unknown", "몰랐다"],
                    ["known", "위치를 알고 있었다"],
                    ["seen_other_lane", "방금 다른 라인에 보였다"],
                    ["outdated", "마지막으로 본 지 오래됐다"],
                    ["did_not_think", "생각하지 않았다"],
                  ]}
                />
                <SelectField
                  label="와드 위치"
                  value={input.wardLocationDetail}
                  onChange={(v) => updateField("wardLocationDetail", v as DeathReviewInput["wardLocationDetail"])}
                  options={wardLocationDetailOptions}
                />
                <SurvivalResourcesField
                  values={input.survivalResources}
                  onToggle={toggleResource}
                />
              </>
            )}

            {/* ── GANKED_WHILE_PUSHING ── */}
            {userScenario === "GANKED_WHILE_PUSHING" && (
              <>
                <SelectField
                  label="라인 상태"
                  value={input.laneState}
                  onChange={(v) => updateField("laneState", v)}
                  options={[
                    ["pushing", "내가 밀고 있었다"],
                    ["big_wave_crash", "빅웨이브를 밀고 있었다"],
                    ["enemy_tower_side", "라인이 상대 타워 근처였다"],
                    ["center", "라인이 중앙에 있었다"],
                  ]}
                />
                <SelectField
                  label="강가 시야 상태"
                  value={input.visionState}
                  onChange={(v) => updateField("visionState", v)}
                  options={[
                    ["no_river_vision", "강가 시야가 없었다"],
                    ["river_vision", "강가 시야가 있었다"],
                    ["one_side_vision", "한쪽 강가만 시야가 있었다"],
                    ["ward_cooldown", "와드 쿨타임이었다"],
                    ["unknown", "잘 모르겠다"],
                  ]}
                />
                <SelectField
                  label="상대 정글 위치"
                  value={input.enemyJungleLocation}
                  onChange={(v) => updateField("enemyJungleLocation", v)}
                  options={[
                    ["unknown", "몰랐다"],
                    ["known", "위치를 알고 있었다"],
                    ["seen_other_lane", "방금 다른 라인에 보였다"],
                    ["outdated", "마지막으로 본 지 오래됐다"],
                    ["did_not_think", "생각하지 않았다"],
                  ]}
                />
                <SurvivalResourcesField
                  values={input.survivalResources}
                  onToggle={toggleResource}
                />
              </>
            )}

            {/* ── SOLO_KILL_TRADE ── */}
            {userScenario === "SOLO_KILL_TRADE" && (
              <>
                <TextAreaField
                  label="상대 핵심 스킬 상태 (알고 있다면)"
                  value={input.enemyKeyCooldownsKnown}
                  onChange={(v) => updateField("enemyKeyCooldownsKnown", v)}
                  placeholder="예: 벡스 공포 있음, 궁 없음"
                />
                <TextAreaField
                  label="내 핵심 스킬 상태"
                  value={input.myKeyCooldownsKnown}
                  onChange={(v) => updateField("myKeyCooldownsKnown", v)}
                  placeholder="예: 아칼리 W 없음, R 있음, 점멸 없음"
                />
                <SurvivalResourcesField
                  values={input.survivalResources}
                  onToggle={toggleResource}
                />
                <FreeDescriptionField
                  value={input.freeDescription}
                  onChange={(v) => updateField("freeDescription", v)}
                />
              </>
            )}

            {/* ── RECALL_GREED ── */}
            {userScenario === "RECALL_GREED" && (
              <>
                <SelectField
                  label="귀환 전 웨이브 상태"
                  value={input.laneStateDetail}
                  onChange={(v) => updateField("laneStateDetail", v as DeathReviewInput["laneStateDetail"])}
                  options={laneStateDetailOptions}
                />
                <SurvivalResourcesField
                  values={input.survivalResources}
                  onToggle={toggleResource}
                />
                <FreeDescriptionField
                  value={input.freeDescription}
                  onChange={(v) => updateField("freeDescription", v)}
                />
              </>
            )}

            {/* ── UNSAFE_WARDING ── */}
            {userScenario === "UNSAFE_WARDING" && (
              <>
                <SelectField
                  label="상황 직전 행동"
                  value={input.beforeDeathAction}
                  onChange={(v) => updateField("beforeDeathAction", v)}
                  options={[
                    ["warding", "와드를 박으러 갔다"],
                    ["deep_warding", "깊은 시야를 잡으러 갔다"],
                    ["early_jungle_tracking_ward", "정글 동선 확인용 시야를 잡으러 갔다"],
                  ]}
                />
                <SelectField
                  label="와드 위치"
                  value={input.wardLocationDetail}
                  onChange={(v) => updateField("wardLocationDetail", v as DeathReviewInput["wardLocationDetail"])}
                  options={wardLocationDetailOptions}
                />
                <SelectField
                  label="우리 정글 위치"
                  value={input.allyJunglePosition}
                  onChange={(v) => updateField("allyJunglePosition", v as DeathReviewInput["allyJunglePosition"])}
                  options={allyJunglePositionOptions}
                />
                <SelectField
                  label="상대 미드 상태"
                  value={input.enemyMidState}
                  onChange={(v) => updateField("enemyMidState", v as DeathReviewInput["enemyMidState"])}
                  options={enemyMidStateOptions}
                />
                <SurvivalResourcesField
                  values={input.survivalResources}
                  onToggle={toggleResource}
                />
              </>
            )}

            {/* ── ADVANTAGE_CONVERSION ── */}
            {userScenario === "ADVANTAGE_CONVERSION" && (
              <>
                <SelectField
                  label="이득 후 하려던 행동"
                  value={input.postPushIntent}
                  onChange={(v) => updateField("postPushIntent", v as DeathReviewInput["postPushIntent"])}
                  options={postPushIntentOptions}
                />
                <SelectField
                  label="그 시점 웨이브 상태"
                  value={input.laneStateDetail}
                  onChange={(v) => updateField("laneStateDetail", v as DeathReviewInput["laneStateDetail"])}
                  options={laneStateDetailOptions}
                />
                <SelectField
                  label="우리 정글 위치"
                  value={input.allyJunglePosition}
                  onChange={(v) => updateField("allyJunglePosition", v as DeathReviewInput["allyJunglePosition"])}
                  options={allyJunglePositionOptions}
                />
                <FreeDescriptionField
                  value={input.freeDescription}
                  onChange={(v) => updateField("freeDescription", v)}
                />
              </>
            )}

            {/* ── NOT_SURE / GENERAL_LANING_DEATH ── */}
            {(userScenario === "NOT_SURE" || userScenario === "GENERAL_LANING_DEATH") && (
              <>
                <SelectField
                  label="게임 시간"
                  value={input.gameTime}
                  onChange={(v) => updateField("gameTime", v)}
                  options={[
                    ["pre_lane", "0:00–1:30 / 레인 시작 전"],
                    ["first_waves", "1:30–3:30 / 초반 2렙 구간"],
                    ["first_jungle_window", "3:30–6:00 / 첫 갱킹 구간"],
                    ["post_level6", "6:00–10:00 / 6렙 이후"],
                    ["plate_objective", "10:00–14:00 / 플레이트 구간"],
                    ["after_14", "14:00 이후"],
                  ]}
                />
                <SelectField
                  label="라인 상태"
                  value={input.laneState}
                  onChange={(v) => updateField("laneState", v)}
                  options={[
                    ["pre_lane", "라인 시작 전"],
                    ["pushing", "내가 밀고 있었다"],
                    ["being_pushed", "상대가 밀고 있었다"],
                    ["center", "라인이 중앙에 있었다"],
                    ["enemy_tower_side", "상대 타워 근처였다"],
                    ["my_tower_side", "내 타워 근처였다"],
                    ["big_wave_crash", "빅웨이브를 밀고 있었다"],
                  ]}
                />
                <SelectField
                  label="상황 직전 행동"
                  value={input.beforeDeathAction}
                  onChange={(v) => updateField("beforeDeathAction", v)}
                  options={[
                    ["early_jungle_tracking_ward", "정글 동선 시야를 잡으러 감"],
                    ["deep_warding", "깊은 시야를 잡으러 감"],
                    ["warding", "와드를 박으러 감"],
                    ["cs_greed", "미니언을 먹으러 앞으로 감"],
                    ["trade", "딜교하려고 들어감"],
                    ["delayed_recall", "귀환을 미뤘다"],
                    ["chasing", "상대를 추격함"],
                    ["cooldown_down_forward", "스킬이 없는 상태에서 앞으로 감"],
                  ]}
                />
                <SelectField
                  label="강가 시야 상태"
                  value={input.visionState}
                  onChange={(v) => updateField("visionState", v)}
                  options={[
                    ["no_river_vision", "강가 시야가 없었다"],
                    ["river_vision", "강가 시야가 있었다"],
                    ["one_side_vision", "한쪽만 있었다"],
                    ["ward_cooldown", "와드 쿨타임이었다"],
                    ["unknown", "잘 모르겠다"],
                  ]}
                />
                <SelectField
                  label="상대 정글 위치"
                  value={input.enemyJungleLocation}
                  onChange={(v) => updateField("enemyJungleLocation", v)}
                  options={[
                    ["unknown", "몰랐다"],
                    ["known", "알고 있었다"],
                    ["seen_other_lane", "방금 다른 라인에 보였다"],
                    ["outdated", "마지막으로 본 지 오래됐다"],
                    ["did_not_think", "생각하지 않았다"],
                  ]}
                />
                <SurvivalResourcesField
                  values={input.survivalResources}
                  onToggle={toggleResource}
                />
                <FreeDescriptionField
                  value={input.freeDescription}
                  onChange={(v) => updateField("freeDescription", v)}
                />
              </>
            )}

            {/* ── freeDescription for warding scenarios ── */}
            {(userScenario === "PRE_LANE_VISION" || userScenario === "UNSAFE_WARDING" || userScenario === "GANKED_WHILE_PUSHING") && (
              <FreeDescriptionField
                value={input.freeDescription}
                onChange={(v) => updateField("freeDescription", v)}
              />
            )}

            {/* ── Advanced details (collapsible) ───────────────────────── */}
            {/* Only show fields not already exposed by the scenario above */}
            <div className="rounded-xl border border-zinc-200">
              <button
                type="button"
                onClick={() => setShowAdvanced((p) => !p)}
                className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-zinc-600 hover:text-zinc-900"
              >
                <span>+ 세부 정보 추가 (선택)</span>
                <span className="text-xs text-zinc-400">{showAdvanced ? "접기 ▲" : "펼치기 ▼"}</span>
              </button>

              {showAdvanced && (
                <div className="space-y-4 border-t border-zinc-100 px-4 pb-4 pt-3">
                  <p className="text-xs text-zinc-400">
                    팀 진영, 이동 방향, 정글 위치 상세 등을 추가하면 AI가 덜 추측합니다.
                  </p>

                  <SelectField
                    label="내 팀 진영"
                    value={input.teamSide}
                    onChange={(v) => updateField("teamSide", v as DeathReviewInput["teamSide"])}
                    options={teamSideOptions}
                  />
                  <SelectField
                    label="움직인 방향 (미니맵 기준)"
                    value={input.movementSide}
                    onChange={(v) => updateField("movementSide", v as DeathReviewInput["movementSide"])}
                    options={movementSideOptions}
                  />
                  <SelectField
                    label="우리 정글 위치 상세"
                    value={input.allyJungleSideDetail}
                    onChange={(v) => updateField("allyJungleSideDetail", v as DeathReviewInput["allyJungleSideDetail"])}
                    options={allyJungleSideDetailOptions}
                  />

                  {/* Only show cooldown fields here if NOT already shown above */}
                  {!scenarioExposedAdvanced.includes("enemyKeyCooldownsKnown") && (
                    <TextAreaField
                      label="상대 핵심 스킬 상태"
                      value={input.enemyKeyCooldownsKnown}
                      onChange={(v) => updateField("enemyKeyCooldownsKnown", v)}
                      placeholder="예: 벡스 공포 있음, 궁 없음"
                    />
                  )}
                  {!scenarioExposedAdvanced.includes("myKeyCooldownsKnown") && (
                    <TextAreaField
                      label="내 핵심 스킬 상태"
                      value={input.myKeyCooldownsKnown}
                      onChange={(v) => updateField("myKeyCooldownsKnown", v)}
                      placeholder="예: 아칼리 W 없음, R 있음, 점멸 없음"
                    />
                  )}

                  <TextAreaField
                    label="매치업 메모"
                    value={input.matchupNote}
                    onChange={(v) => updateField("matchupNote", v)}
                    placeholder="예: 6렙 전에는 벡스 상대로 주도권 잡기 어렵다"
                  />
                </div>
              )}
            </div>

            {/* ── Submit ─────────────────────────────────────────────────── */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={goBack}
                className="rounded-xl border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
              >
                ← 이전
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 rounded-xl bg-zinc-950 px-4 py-3 text-sm font-medium text-white disabled:opacity-50 hover:bg-zinc-800"
              >
                {loading ? "리뷰 생성 중..." : "Coaching Review 생성하기"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Shared Sub-components ────────────────────────────────────────────────────

function StepHeading({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="pb-1">
      <h2 className="text-base font-bold text-zinc-900">{title}</h2>
      <p className="mt-0.5 text-xs text-zinc-500">{desc}</p>
    </div>
  );
}

function NavButtons({
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
  nextHidden,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
  nextHidden?: boolean;
}) {
  return (
    <div className="flex gap-3 pt-1">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
        >
          ← 이전
        </button>
      )}
      {!nextHidden && (
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className="flex-1 rounded-xl bg-zinc-950 px-4 py-3 text-sm font-medium text-white disabled:opacity-40 hover:bg-zinc-800"
        >
          {nextLabel}
        </button>
      )}
    </div>
  );
}

function SurvivalResourcesField({
  values,
  onToggle,
}: {
  values: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-800">
        내 생존 자원 상태 <span className="text-xs font-normal text-zinc-400">(해당하는 것 모두 선택)</span>
      </label>
      <div className="mt-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        {SURVIVAL_RESOURCE_OPTIONS.map(([value, label]) => (
          <label
            key={value}
            className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 transition-colors
              ${values.includes(value)
                ? "border-zinc-700 bg-zinc-100 font-medium"
                : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
              }`}
          >
            <input
              type="checkbox"
              checked={values.includes(value)}
              onChange={() => onToggle(value)}
              className="h-3.5 w-3.5"
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  );
}

function FreeDescriptionField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-800">
        추가 설명 <span className="text-xs font-normal text-zinc-400">(선택)</span>
      </label>
      <textarea
        className="mt-1 min-h-20 w-full rounded-lg border border-zinc-300 p-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="상황 전후 10~20초를 간단히 적어주세요. 자세할수록 더 정확한 피드백이 나옵니다."
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-800">{label}</label>
      <select
        className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-800">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 min-h-16 w-full rounded-lg border border-zinc-300 bg-white p-2 text-sm"
      />
    </div>
  );
}
