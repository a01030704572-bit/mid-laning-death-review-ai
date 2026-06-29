"use client";

import { useEffect, useState } from "react";
import RecentHabitPatternCard from "@/components/RecentHabitPatternCard";
import RepeatedPatternPreviewCard from "@/components/RepeatedPatternPreviewCard";
import type {
  AutoSceneGroupType,
  EliminationPatternResult,
} from "@/types/autoScene";
import {
  clearReviewSceneHistory,
  loadReviewSceneHistory,
} from "@/lib/reviewHistory";
import { analyzeHabitPatterns } from "@/lib/habitPatternAnalyzer";

type ReviewInsightPanelProps = {
  repeatedPatternPreviewResults: EliminationPatternResult[];
};

const NEXT_GAME_GOAL =
  "상대 정글 위치가 확인되기 전까지 시야 없는 쪽으로 압박하지 않기.";

const SUPPORTING_PATTERN_LABELS: Partial<Record<AutoSceneGroupType, string>> = {
  no_flash_fight_like: "점멸 없는 교전",
  solo_kill_conversion_like: "솔킬 후 전환",
  objective_setup_like: "오브젝트 전 준비",
};

const SUPPORTING_PATTERN_ORDER: AutoSceneGroupType[] = [
  "no_flash_fight_like",
  "solo_kill_conversion_like",
  "objective_setup_like",
];

function loadHabitAnalysis() {
  return analyzeHabitPatterns(loadReviewSceneHistory());
}

function supportingPatternLabel(result: EliminationPatternResult) {
  return SUPPORTING_PATTERN_LABELS[result.groupType] ?? result.primaryPatternKo;
}

export default function ReviewInsightPanel({
  repeatedPatternPreviewResults,
}: ReviewInsightPanelProps) {
  const [habitAnalysis, setHabitAnalysis] = useState(() =>
    analyzeHabitPatterns([])
  );
  const primaryResultId = repeatedPatternPreviewResults[0]?.id;
  const supportingPatterns = SUPPORTING_PATTERN_ORDER.flatMap((groupType) => {
    const result = repeatedPatternPreviewResults.find(
      (candidate) =>
        candidate.groupType === groupType && candidate.id !== primaryResultId
    );
    return result ? [result] : [];
  }).slice(0, 3);

  useEffect(() => {
    function refreshHabitAnalysis() {
      setHabitAnalysis(loadHabitAnalysis());
    }

    refreshHabitAnalysis();
    window.addEventListener("review-history-updated", refreshHabitAnalysis);

    return () => {
      window.removeEventListener("review-history-updated", refreshHabitAnalysis);
    };
  }, []);

  function handleResetHistory() {
    if (!window.confirm("저장된 복기 장면 기록을 초기화할까요?")) return;
    if (clearReviewSceneHistory()) {
      setHabitAnalysis(analyzeHabitPatterns([]));
      window.dispatchEvent(new Event("review-history-updated"));
    }
  }

  return (
    <section className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-950">복기 인사이트</h2>
          <p className="mt-1 text-sm text-zinc-500">
            최근 복기 기록과 자동화 분석 샘플을 종합한 핵심 교정 후보입니다.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            수동 복기 기록
          </span>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            자동화 분석 샘플
          </span>
          <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
            영상 확인 필요
          </span>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              이번에 가장 먼저 고칠 습관
            </p>
            <h3 className="mt-2 text-lg font-bold text-zinc-950">
              강가/정글 위치 확인 없이 압박하는 판단
            </h3>

            <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-3">
              <p className="text-xs font-semibold text-zinc-500">
                왜 이게 먼저인가요?
              </p>
              <p className="mt-1 text-sm leading-6 text-zinc-700">
                최근 수동 복기에서는 강가 시야/정글 위치 문제가 반복됐고,
                자동화 샘플에서도 푸시 중 정글 개입 후보가 가장 강하게
                잡혔습니다.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-semibold text-emerald-800">
              다음 판 1개 목표
            </p>
            <p className="mt-2 text-sm leading-6 text-emerald-950">
              {NEXT_GAME_GOAL}
            </p>
          </div>
        </div>

        {supportingPatterns.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-zinc-500">
              같이 확인할 후보
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {supportingPatterns.map((result) => (
                <span
                  key={result.id}
                  className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600"
                >
                  {supportingPatternLabel(result)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="text-xs leading-5 text-zinc-500">
        자동화 분석은 아직 샘플 Preview이며, 실제 경기 분석은 Riot/영상 연결
        이후 적용됩니다.
      </p>

      <details className="group rounded-2xl border border-zinc-200 bg-white">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-zinc-900 marker:hidden">
          <span className="inline-flex items-center gap-2">
            상세 근거 보기
            <span className="text-xs font-medium text-zinc-400 group-open:hidden">
              펼치기
            </span>
            <span className="hidden text-xs font-medium text-zinc-400 group-open:inline">
              접기
            </span>
          </span>
        </summary>

        <div className="grid gap-5 border-t border-zinc-200 p-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">
                수동 복기 기록 상세
              </h3>
              <p className="mt-1 text-sm text-zinc-500">
                최근 입력한 복기 기록에서 반복되는 판단 습관을 요약합니다.
              </p>
            </div>
            <RecentHabitPatternCard
              analysis={habitAnalysis}
              onResetHistory={handleResetHistory}
            />
          </div>

          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">
                자동화 패턴 후보 상세
              </h3>
              <p className="mt-1 text-sm text-zinc-500">
                아래 카드는 경기 이벤트 기록 기반 자동화 엔진의 UI 확인용
                샘플입니다.
              </p>
            </div>
            <RepeatedPatternPreviewCard
              results={repeatedPatternPreviewResults}
              compact
            />
          </div>
        </div>
      </details>
    </section>
  );
}
