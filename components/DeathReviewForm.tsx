"use client";

import { useState } from "react";
import { DeathReviewInput, ReviewResult, RiskTag } from "@/types/review";

type Props = {
  onResult: (data: { riskTags: RiskTag[]; result: ReviewResult }) => void;
};

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
  deathCause: "pre_lane_vision_invade",
  freeDescription: "",
};

const deathOrLossSituationOptions: [string, string][] = [
  ["why_death_happened", "왜 죽었는지 알고 싶다"],
  ["where_to_stop", "어디서 멈췄어야 했는지 알고 싶다"],
  ["missed_jungle_or_roam", "상대 정글/로밍 위험을 놓쳤는지 보고 싶다"],
  ["vision_decision_review", "시야를 잡으러 간 판단이 맞았는지 보고 싶다"],
  ["trade_or_cs_greed", "딜교/CS 욕심이 과했는지 보고 싶다"],
  ["bad_trade_value", "손해 본 교환이었는지 알고 싶다"],
  ["bad_recall_timing", "귀환 타이밍을 놓쳤는지 보고 싶다"],
  ["unknown", "잘 모르겠다"],
];

const advantageSituationOptions: [string, string][] = [
  ["kill_angle_review", "킬각 판단이 맞았는지 보고 싶다"],
  ["post_kill_wave_recall", "이득 이후 웨이브/귀환 판단이 애매하다"],
  ["plate_or_vision_choice", "플레이트를 칠지 시야를 잡을지 애매하다"],
  ["jungle_risk_after_kill", "킬 이후 상대 정글 리스크를 어떻게 봐야 할지 모르겠다"],
  ["advantage_conversion", "이득을 더 크게 굴리는 방법을 알고 싶다"],
  ["post_kill_priority", "킬 이후 다음 행동 우선순위를 알고 싶다"],
  ["unknown", "잘 모르겠다"],
];

const laneAdvantageSituationOptions: [string, string][] = [
  ["how_to_convert_lane_advantage", "이득을 어떻게 굴려야 했는지 알고 싶다"],
  ["push_or_recall_review", "웨이브를 밀고 귀환해야 했는지 보고 싶다"],
  ["plate_or_vision_choice", "플레이트를 칠지 시야를 잡을지 애매하다"],
  ["roam_or_objective_window", "로밍/오브젝트로 연결할 수 있었는지 보고 싶다"],
  ["jungle_tracking_with_priority", "상대 정글 위치를 고려했어야 했는지 보고 싶다"],
  ["maintain_priority", "주도권을 유지하는 방법을 알고 싶다"],
  ["unknown", "잘 모르겠다"],
];

function getSituationTypeOptions(currentOutcome: string): [string, string][] {
  if (
    currentOutcome === "solo_kill" ||
    currentOutcome === "forced_enemy_recall"
  ) {
    return advantageSituationOptions;
  }

  if (
    currentOutcome === "gained_lane_priority" ||
    currentOutcome === "plate_or_cs_gain"
  ) {
    return laneAdvantageSituationOptions;
  }

  return deathOrLossSituationOptions;
}

const deathOrLossActionOptions: [string, string][] = [
  ["early_jungle_tracking_ward", "초반 정글 동선 확인용 시야를 잡으러 감"],
  ["deep_warding", "상대 정글/칼부 쪽 깊은 시야를 잡으러 감"],
  ["move_to_ally_jungle", "아군 정글 쪽으로 합류하려고 움직임"],
  ["follow_missing_mid", "상대 미드가 안 보이는데 따라가려 함"],
  ["cs_greed", "미니언 먹으러 앞으로 감"],
  ["trade", "딜교하려고 들어감"],
  ["warding", "와드를 박으러 감"],
  ["delayed_recall", "귀환 타이밍을 미룸"],
  ["chasing", "상대를 추격함"],
  ["cooldown_down_forward", "스킬이 빠진 상태에서 앞으로 감"],
];

const killAdvantageActionOptions: [string, string][] = [
  ["enemy_key_spell_down_engage", "상대 주요 스킬이 빠진 뒤 진입"],
  ["enemy_low_hp_engage", "상대 체력/자원 부족을 보고 진입"],
  ["level6_kill_angle", "6렙 킬각을 보고 들어감"],
  ["enemy_stepped_forward", "상대가 앞으로 나온 타이밍에 진입"],
  ["good_wave_kill_angle", "라인 위치가 좋아서 진입"],
  ["enemy_mistake_engage", "상대 실수를 보고 진입"],
  ["post_kill_unclear", "킬 이후 운영 판단이 애매했음"],
];

const laneAdvantageActionOptions: [string, string][] = [
  ["pushed_wave", "웨이브를 밀었다"],
  ["hit_plate", "플레이트를 쳤다"],
  ["forced_recall_push", "상대를 집 보내고 라인을 밀었다"],
  ["ward_after_advantage", "이득 이후 시야를 잡으러 갔다"],
  ["looked_for_recall", "귀환 타이밍을 잡으려 했다"],
  ["looked_for_roam_objective", "로밍/오브젝트 합류를 고민했다"],
  ["post_advantage_unclear_action", "이득 이후 다음 행동이 애매했다"],
];

function getBeforeActionOptions(currentOutcome: string): [string, string][] {
  if (
    currentOutcome === "solo_kill" ||
    currentOutcome === "forced_enemy_recall"
  ) {
    return killAdvantageActionOptions;
  }

  if (
    currentOutcome === "gained_lane_priority" ||
    currentOutcome === "plate_or_cs_gain"
  ) {
    return laneAdvantageActionOptions;
  }

  return deathOrLossActionOptions;
}

export default function DeathReviewForm({ onResult }: Props) {
  const [input, setInput] = useState<DeathReviewInput>(initialInput);
  const [loading, setLoading] = useState(false);

  const situationTypeOptions = getSituationTypeOptions(input.currentOutcome);
  const beforeActionOptions = getBeforeActionOptions(input.currentOutcome);

  function updateField<K extends keyof DeathReviewInput>(
    key: K,
    value: DeathReviewInput[K]
  ) {
    setInput((prev) => ({ ...prev, [key]: value }));
  }

  function toggleResource(resource: string) {
    setInput((prev) => {
      const exists = prev.survivalResources.includes(resource);

      return {
        ...prev,
        survivalResources: exists
          ? prev.survivalResources.filter((item) => item !== resource)
          : [...prev.survivalResources, resource],
      };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Review request failed.");
      }

      onResult(data);
    } catch (error) {
      console.error(error);
      alert("리뷰 생성에 실패했습니다. API Key 또는 서버 로그를 확인해보세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
    >
      <div>
        <label className="block text-sm font-medium">내 챔피언</label>
        <input
          className="mt-1 w-full rounded-lg border border-zinc-300 p-2"
          value={input.myChampion}
          onChange={(e) => updateField("myChampion", e.target.value)}
          placeholder="예: Ahri"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">상대 미드 챔피언</label>
        <input
          className="mt-1 w-full rounded-lg border border-zinc-300 p-2"
          value={input.enemyChampion}
          onChange={(e) => updateField("enemyChampion", e.target.value)}
          placeholder="예: Zed"
        />
      </div>

      <SelectField
        label="내 티어"
        value={input.playerTier}
        onChange={(value) => updateField("playerTier", value)}
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

      <SelectField
        label="현재 상황 결과"
        value={input.currentOutcome}
        onChange={(value) =>
          setInput((prev) => ({
            ...prev,
            currentOutcome: value,
            beforeDeathAction: getBeforeActionOptions(value)[0][0],
            deathCause: getSituationTypeOptions(value)[0][0],
          }))
        }
        options={[
          ["death", "죽었다"],
          ["survived_but_lost", "살아남았지만 손해를 봤다"],
          ["forced_enemy_recall", "상대를 집 보냈다"],
          ["solo_kill", "솔킬을 땄다"],
          ["gained_lane_priority", "라인 주도권을 얻었다"],
          ["plate_or_cs_gain", "플레이트/CS 이득을 봤다"],
          ["unknown", "잘 모르겠다"],
        ]}
      />

      <SelectField
        label="게임 시간"
        value={input.gameTime}
        onChange={(value) => updateField("gameTime", value)}
        options={[
          ["pre_lane", "0:00–1:30 / 라인 시작 전 시야·인베이드 구간"],
          ["first_waves", "1:30–3:30 / 첫 웨이브~초반 2렙 구간"],
          ["first_jungle_window", "3:30–6:00 / 첫 정글 개입 가능 구간"],
          ["post_level6", "6:00–10:00 / 6렙 이후 킬각·갱킹 구간"],
          ["plate_objective", "10:00–14:00 / 플레이트·첫 오브젝트 전후"],
          ["after_14", "14:00 이후 / 라인전 종료 전환 구간"],
        ]}
      />

      <SelectField
        label="라인 상태"
        value={input.laneState}
        onChange={(value) => updateField("laneState", value)}
        options={[
          ["pre_lane", "라인 시작 전 / 미니언 도착 전"],
          ["pushing", "내가 밀고 있었다"],
          ["being_pushed", "상대가 밀고 있었다"],
          ["center", "라인이 중앙에 있었다"],
          ["enemy_tower_side", "라인이 상대 타워 근처였다"],
          ["my_tower_side", "라인이 내 타워 근처였다"],
          ["big_wave_crash", "빅웨이브를 밀고 있었다"],
          ["awkward_freeze", "라인이 애매하게 멈춰 있었다"],
        ]}
      />

      <SelectField
        label="상황 직전 행동"
        value={input.beforeDeathAction}
        onChange={(value) => updateField("beforeDeathAction", value)}
        options={beforeActionOptions}
      />

      <SelectField
        label="시야 상태"
        value={input.visionState}
        onChange={(value) => updateField("visionState", value)}
        options={[
          ["river_vision", "강가 시야가 있었다"],
          ["no_river_vision", "강가 시야가 없었다"],
          ["one_side_vision", "한쪽 강가만 시야가 있었다"],
          ["jungle_entrance_vision", "상대 정글 입구 시야가 있었다"],
          ["ward_cooldown", "와드가 쿨이었다"],
          ["unused_ward", "와드는 있었지만 안 박았다"],
          ["unknown", "모르겠다"],
        ]}
      />

      <SelectField
        label="상대 정글 위치"
        value={input.enemyJungleLocation}
        onChange={(value) => updateField("enemyJungleLocation", value)}
        options={[
          ["known", "위치를 알고 있었다"],
          ["unknown", "위치를 몰랐다"],
          ["seen_other_lane", "방금 다른 라인에 보였다"],
          ["outdated", "마지막으로 본 지 오래됐다"],
          ["ally_pinged", "우리 정글이 핑을 찍었다"],
          ["did_not_think", "생각하지 않았다"],
        ]}
      />

      <div>
        <label className="block text-sm font-medium">내 생존 자원</label>
        <div className="mt-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          {[
            ["no_flash", "Flash 없음"],
            ["no_escape", "이동기 없음"],
            ["low_hp", "체력 낮음"],
            ["low_resource", "마나/기력 부족"],
            ["key_cooldown_down", "주요 스킬 쿨타임"],
          ].map(([value, label]) => (
            <label
              key={value}
              className="flex items-center gap-2 rounded-lg border border-zinc-300 p-2"
            >
              <input
                type="checkbox"
                checked={input.survivalResources.includes(value)}
                onChange={() => toggleResource(value)}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <SelectField
        label="리뷰 초점"
        value={input.deathCause}
        onChange={(value) => updateField("deathCause", value)}
        options={situationTypeOptions}
      />

      <div>
        <label className="block text-sm font-medium">자유 상황 설명</label>
        <textarea
          className="mt-1 min-h-28 w-full rounded-lg border border-zinc-300 p-2"
          value={input.freeDescription}
          onChange={(e) => updateField("freeDescription", e.target.value)}
         placeholder={`결과가 발생하기 전후 10~20초를 구체적으로 적어주세요.

          예:
          - 몇 분 상황인지
          - 라인이 어디에 있었는지
          - 상대 주요 스킬/내 주요 스킬이 빠졌는지
          - 내 체력/마나/플래시 상태
          - 상대 정글 위치를 알고 있었는지
          - 킬/죽음/이득 이후 웨이브를 밀었는지, 귀환했는지, 플레이트를 쳤는지
          - 가장 피드백받고 싶은 고민이 무엇인지

짧게 쓰면 AI가 일반적인 리뷰만 할 수 있고, 자세히 쓸수록 1:1 피드백에 가까워집니다.`}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-black px-4 py-3 font-medium text-white disabled:opacity-50"
      >
        {loading ? "리뷰 생성 중..." : "Coaching Review 생성하기"}
      </button>
    </form>
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
      <label className="block text-sm font-medium">{label}</label>
      <select
        className="mt-1 w-full rounded-lg border border-zinc-300 p-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}