"use client";

import { useEffect, useState } from "react";
import RecentHabitPatternCard from "@/components/RecentHabitPatternCard";
import RepeatedPatternPreviewCard from "@/components/RepeatedPatternPreviewCard";
import type { EliminationPatternResult } from "@/types/autoScene";
import {
  clearReviewSceneHistory,
  loadReviewSceneHistory,
} from "@/lib/reviewHistory";
import { analyzeHabitPatterns } from "@/lib/habitPatternAnalyzer";
import {
  buildReviewInsightSummary,
  mapHabitPatternsToReviewInsightManualPatterns,
} from "@/lib/reviewInsightSummary";

type ReviewInsightPanelProps = {
  repeatedPatternPreviewResults: EliminationPatternResult[];
};

function loadHabitAnalysis() {
  return analyzeHabitPatterns(loadReviewSceneHistory());
}

export default function ReviewInsightPanel({
  repeatedPatternPreviewResults,
}: ReviewInsightPanelProps) {
  const [habitAnalysis, setHabitAnalysis] = useState(() =>
    analyzeHabitPatterns([])
  );
  const insightSummary = buildReviewInsightSummary({
    manualPatterns: mapHabitPatternsToReviewInsightManualPatterns(habitAnalysis),
    automationResults: repeatedPatternPreviewResults,
  });
  const insightSourceLabel =
    insightSummary.source === "combined"
      ? "수동 기록 + 자동화 샘플"
      : insightSummary.source === "manual_history"
        ? "수동 기록 기반"
        : "자동화 샘플 기반";

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
          <h2 className="text-xl font-bold text-zinc-950">오늘의 복기 인사이트</h2>
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
            <p className="mt-2 inline-flex rounded-full border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-500">
              {insightSourceLabel}
            </p>
            <h3 className="mt-2 text-lg font-bold text-zinc-950">
              {insightSummary.primaryHabitKo}
            </h3>

            <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-3">
              <p className="text-xs font-semibold text-zinc-500">
                왜 이게 먼저인가요?
              </p>
              <p className="mt-1 text-sm leading-6 text-zinc-700">
                {insightSummary.whyThisFirstKo}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-semibold text-emerald-800">
              다음 판 1개 목표
            </p>
            <p className="mt-2 text-sm leading-6 text-emerald-950">
              {insightSummary.nextGameGoalKo}
            </p>
          </div>
        </div>

        {insightSummary.supportingCandidatesKo.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-zinc-500">
              같이 확인할 후보
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {insightSummary.supportingCandidatesKo.map((candidate) => (
                <span
                  key={candidate}
                  className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600"
                >
                  {candidate}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="text-xs leading-5 text-zinc-500">
        {insightSummary.cautionKo}
      </p>

      <details className="group rounded-2xl border border-zinc-200 bg-white">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-zinc-900 marker:hidden">
          <span className="inline-flex items-center gap-2">
            상세 분석 보기
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
