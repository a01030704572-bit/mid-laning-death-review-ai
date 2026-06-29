"use client";

import { useState } from "react";
import DeathReviewForm from "@/components/DeathReviewForm";
import ReviewResultCard from "@/components/ReviewResultCard";
import EvidenceMetadataPreview from "@/components/EvidenceMetadataPreview";
import ReviewInsightPanel from "@/components/ReviewInsightPanel";
import VideoDraftPanel from "@/components/VideoDraftPanel";
import RiotEvidencePanel from "@/components/RiotEvidencePanel";
import { ReviewResult, RiskTag, ScenarioType } from "@/types/review";
import type { ReviewSceneCompletion } from "@/types/history";
import type { ReviewEvidenceMetadata } from "@/types/evidence";
import type { VideoReviewDraft } from "@/types/videoDraft";
import {
  createReviewSceneRecord,
  saveReviewSceneRecord,
} from "@/lib/reviewHistory";
import { buildRepeatedPatternPreviewResults } from "@/lib/riot/repeatedPatternPreviewFixture";

export default function Home() {
  const [reviewData, setReviewData] = useState<{
    riskTags: RiskTag[];
    scenarioType?: ScenarioType;
    result: ReviewResult;
    evidenceMetadata?: ReviewEvidenceMetadata;
  } | null>(null);
  const [videoDraft, setVideoDraft] = useState<VideoReviewDraft | null>(null);
  const repeatedPatternPreviewResults =
    buildRepeatedPatternPreviewResults("gold_platinum");

  function handleReviewResult(completion: ReviewSceneCompletion) {
    setReviewData({
      riskTags: completion.riskTags,
      scenarioType: completion.scenarioType,
      result: completion.result,
      evidenceMetadata: completion.evidenceMetadata,
    });

    const savedHistory = saveReviewSceneRecord(
      createReviewSceneRecord(completion)
    );
    if (savedHistory) {
      window.dispatchEvent(new Event("review-history-updated"));
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
            미드 라인에서 발생한 죽음, 손해, 로밍, 라인 주도권, CS/플레이트 이득
            같은 장면을 입력하면 가능한 Risk Tag와 1:1 코칭 피드백을 생성합니다.
            이 도구는 정답을 확정하지 않고, 플레이어가 자신의 판단 흐름을 복기하고
            다음 게임 행동 목표를 세우도록 돕는 것을 목표로 합니다.
          </p>
        </header>

        <VideoDraftPanel onDraftChange={setVideoDraft} />
        <RiotEvidencePanel />

        <div className="grid gap-8 lg:grid-cols-2">
          <DeathReviewForm onResult={handleReviewResult} videoDraft={videoDraft} />

          <div className="space-y-6">
            {reviewData ? (
              <>
                <ReviewResultCard
                  riskTags={reviewData.riskTags}
                  scenarioType={reviewData.scenarioType}
                  result={reviewData.result}
                />
                <EvidenceMetadataPreview
                  evidenceMetadata={reviewData.evidenceMetadata}
                />
              </>
            ) : (
              <div className="flex min-h-96 items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-center text-zinc-500">
                <div>
                  아직 코칭 리뷰 결과가 없습니다.
                  <br />
                  왼쪽 입력 폼을 작성하고 Coaching Review를 생성해보세요.
                </div>
              </div>
            )}
          </div>
        </div>

        <ReviewInsightPanel
          repeatedPatternPreviewResults={repeatedPatternPreviewResults}
        />
      </div>
    </main>
  );
}
