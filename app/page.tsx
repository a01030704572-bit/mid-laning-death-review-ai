"use client";

import { useState } from "react";
import DeathReviewForm from "@/components/DeathReviewForm";
import ReviewResultCard from "@/components/ReviewResultCard";
import { ReviewResult, RiskTag } from "@/types/review";

export default function Home() {
  const [reviewData, setReviewData] = useState<{
    riskTags: RiskTag[];
    result: ReviewResult;
  } | null>(null);

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10 text-zinc-950">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-3">
          <p className="text-sm font-medium text-zinc-500">
            League of Legends AI Coaching MVP
          </p>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Mid Laning Death Review AI
          </h1>

          <p className="max-w-3xl text-zinc-600">
            미드 라인전에서 죽은 상황을 입력하면, 가능한 Risk Tag와 복기 질문,
            다음 판 행동 목표를 생성합니다. 이 앱은 정답을 단정하지 않고
            플레이어가 스스로 생각하도록 돕는 것을 목표로 합니다.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-2">
          <DeathReviewForm onResult={setReviewData} />

          {reviewData ? (
            <ReviewResultCard
              riskTags={reviewData.riskTags}
              result={reviewData.result}
            />
          ) : (
            <div className="flex min-h-96 items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-center text-zinc-500">
              <div>
                아직 리뷰 결과가 없습니다.
                <br />
                왼쪽 입력 폼을 작성하고 Death Review를 생성해보세요.
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}