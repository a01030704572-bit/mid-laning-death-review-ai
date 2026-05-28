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

export default function DeathReviewForm({ onResult }: Props) {
  const [input, setInput] = useState<DeathReviewInput>(initialInput);
  const [loading, setLoading] = useState(false);

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
        onChange={(value) => updateField("currentOutcome", value)}
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
      </div>

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
        label="죽기 직전 행동"
        value={input.beforeDeathAction}
        onChange={(value) => updateField("beforeDeathAction", value)}
               options={[
          ["early_jungle_tracking_ward", "초반 정글 동선 확인용 시야를 잡으러 감"],
          ["deep_warding", "상대 정글/칼부 쪽 깊은 시야를 잡으러 감"],
          ["move_to_ally_jungle", "아군 정글 쪽으로 합류하려고 움직임"],
          ["follow_missing_mid", "상대 미드가 안 보이는데 따라가려 함"],
          ["cs_greed", "미니언 먹으러 앞으로 감"],
          ["trade", "딜교하려고 들어감"],
          ["kill_angle", "킬각을 보려고 들어감"],
          ["plate", "타워 플레이트를 치고 있었음"],
          ["delayed_recall", "귀환 타이밍을 미룸"],
          ["warding", "와드를 박으러 감"],
          ["roaming", "로밍 가려고 움직임"],
          ["chasing", "상대를 추격함"],
          ["cooldown_down_forward", "스킬이 빠진 상태에서 앞으로 감"],
        ]}
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
        label="사망 원인 유형"
        value={input.deathCause}
        onChange={(value) => updateField("deathCause", value)}
                options={[
          ["pre_lane_vision_invade", "프리라인 시야/인베이드 중 사망"],
          ["early_collapse", "상대 다수 인원에게 초반에 물림"],
          ["joined_jungle_fight", "아군 정글 교전에 합류하다 사망"],
          ["solo_kill", "상대 미드에게 솔킬"],
          ["jungle_gank", "정글 갱킹"],
          ["mid_jungle", "미드 + 정글 합류"],
          ["support_roam", "로밍/서포터 개입"],
          ["tower_dive", "타워 다이브"],
          ["chasing_death", "추격하다가 역으로 죽음"],
          ["warding_death", "시야 잡다가 죽음"],
          ["recall_greed", "귀환 안 하고 버티다 죽음"],
          ["unknown", "잘 모르겠다"],
        ]}
      />

      <div>
        <label className="block text-sm font-medium">자유 상황 설명</label>
        <textarea
          className="mt-1 min-h-28 w-full rounded-lg border border-zinc-300 p-2"
          value={input.freeDescription}
          onChange={(e) => updateField("freeDescription", e.target.value)}
          placeholder="죽기 전 또는 이득을 본 직전 10~20초 상황을 적어주세요. 예: 몇 분 상황인지, 왜 앞으로 갔는지, 상대 미드/정글 위치를 알고 있었는지, 플/궁/이동기가 있었는지, 시야를 잡으려던 목적이나 이득을 본 뒤 무엇을 하려 했는지."
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-black px-4 py-3 font-medium text-white disabled:opacity-50"
      >
        {loading ? "리뷰 생성 중..." : "Death Review 생성하기"}
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