"use client";

import { useEffect, useState } from "react";
import DeathReviewForm from "@/components/DeathReviewForm";
import ReviewResultCard from "@/components/ReviewResultCard";
import RecentHabitPatternCard from "@/components/RecentHabitPatternCard";
import { ReviewResult, RiskTag, ScenarioType } from "@/types/review";
import type { ReviewSceneCompletion } from "@/types/history";
import {
  clearReviewSceneHistory,
  createReviewSceneRecord,
  loadReviewSceneHistory,
  saveReviewSceneRecord,
} from "@/lib/reviewHistory";
import { analyzeHabitPatterns } from "@/lib/habitPatternAnalyzer";

export default function Home() {
  const [reviewData, setReviewData] = useState<{
    riskTags: RiskTag[];
    scenarioType?: ScenarioType;
    result: ReviewResult;
  } | null>(null);
  const [habitAnalysis, setHabitAnalysis] = useState(() =>
    analyzeHabitPatterns([])
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setHabitAnalysis(analyzeHabitPatterns(loadReviewSceneHistory()));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  function handleReviewResult(completion: ReviewSceneCompletion) {
    setReviewData({
      riskTags: completion.riskTags,
      scenarioType: completion.scenarioType,
      result: completion.result,
    });

    const savedHistory = saveReviewSceneRecord(
      createReviewSceneRecord(completion)
    );
    if (savedHistory) {
      setHabitAnalysis(analyzeHabitPatterns(savedHistory));
    }
  }

  function handleResetHistory() {
    if (!window.confirm("저장된 복기 장면 기록을 초기화할까요?")) return;
    if (clearReviewSceneHistory()) {
      setHabitAnalysis(analyzeHabitPatterns([]));
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10 text-zinc-950">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-3">
          <p className="text-sm font-medium text-zinc-500">
            League of Legends 1:1 AI Coaching MVP
          </p>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Mid Laning Decision Review AI
          </h1>

          <p className="max-w-3xl text-zinc-600">
            미드 라인전에서 죽음, 손해, 솔킬, 라인 주도권, CS/플레이트 이득
            같은 상황을 입력하면 가능한 Risk Tag와 1:1 코칭 피드백을
            생성합니다. 이 앱은 정답을 단정하지 않고, 플레이어가 자신의
            판단 흐름을 복기하고 다음 판 행동 목표를 세우도록 돕는 것을
            목표로 합니다.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-2">
          <DeathReviewForm onResult={handleReviewResult} />

          <div className="space-y-6">
            {reviewData ? (
              <ReviewResultCard
                riskTags={reviewData.riskTags}
                scenarioType={reviewData.scenarioType}
                result={reviewData.result}
              />
            ) : (
              <div className="flex min-h-96 items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-center text-zinc-500">
                <div>
                  아직 코칭 리뷰 결과가 없습니다.
                  <br />
                  왼쪽 입력 폼을 작성하고 Coaching Review를 생성해보세요.
                </div>
              </div>
            )}
            <RecentHabitPatternCard
              analysis={habitAnalysis}
              onResetHistory={handleResetHistory}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
