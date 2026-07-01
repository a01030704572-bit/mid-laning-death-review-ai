"use client";

import { useMemo, useState } from "react";
import CoachingDashboardLayout from "@/components/CoachingDashboardLayout";
import DeathReviewForm from "@/components/DeathReviewForm";
import EvidenceMetadataPreview from "@/components/EvidenceMetadataPreview";
import ReviewInsightPanel from "@/components/ReviewInsightPanel";
import ReviewResultCard from "@/components/ReviewResultCard";
import RiotEvidencePanel from "@/components/RiotEvidencePanel";
import SceneReviewBuilder from "@/components/SceneReviewBuilder";
import VideoDraftPanel from "@/components/VideoDraftPanel";
import { ReviewResult, RiskTag, ScenarioType } from "@/types/review";
import type { ReviewSceneCompletion } from "@/types/history";
import type { ReviewEvidenceMetadata } from "@/types/evidence";
import type { RiotTimelineEvidence } from "@/types/riot";
import type { VideoReviewDraft } from "@/types/videoDraft";
import {
  createReviewSceneRecord,
  saveReviewSceneRecord,
} from "@/lib/reviewHistory";
import { buildRepeatedPatternPreviewResults } from "@/lib/riot/repeatedPatternPreviewFixture";
import {
  hasUsableVideoDraftPatch,
  mapVideoDraftToReviewFormPatch,
} from "@/lib/videoDraftToReviewFormPatch";
import { filterVideoDraftPatchWithVerification } from "@/lib/videoDraftVerification";
import {
  buildVideoDraftApplyWarning,
  filterVideoDraftPatchByTrustGate,
} from "@/lib/videoDraftTrustGate";

export default function Home() {
  const [reviewData, setReviewData] = useState<{
    riskTags: RiskTag[];
    scenarioType?: ScenarioType;
    result: ReviewResult;
    evidenceMetadata?: ReviewEvidenceMetadata;
  } | null>(null);
  const [videoDraft, setVideoDraft] = useState<VideoReviewDraft | null>(null);
  const [isVideoDraftApplied, setIsVideoDraftApplied] = useState(false);
  const [videoDraftPatchVersion, setVideoDraftPatchVersion] = useState(0);
  const [riotEvidence, setRiotEvidence] =
    useState<RiotTimelineEvidence | null>(null);
  const [hasExistingCoreSceneInput, setHasExistingCoreSceneInput] =
    useState(false);
  const repeatedPatternPreviewResults =
    buildRepeatedPatternPreviewResults("gold_platinum");
  const videoDraftPatch = useMemo(
    () => mapVideoDraftToReviewFormPatch(videoDraft),
    [videoDraft]
  );
  const videoDraftTrustGate = useMemo(
    () => filterVideoDraftPatchByTrustGate(videoDraftPatch),
    [videoDraftPatch]
  );
  const safeVideoDraftPatchPreview = useMemo(
    () =>
      filterVideoDraftPatchWithVerification({
        patch: videoDraftTrustGate.filteredPatch,
      }).filteredPatch,
    [videoDraftTrustGate]
  );
  const canApplyVideoDraftPatch = hasUsableVideoDraftPatch(
    safeVideoDraftPatchPreview
  );
  const videoDraftApplyWarning = useMemo(
    () =>
      buildVideoDraftApplyWarning({
        hasExistingCoreSceneInput,
        blockedFields: videoDraftTrustGate.blockedFields,
      }),
    [hasExistingCoreSceneInput, videoDraftTrustGate.blockedFields]
  );

  function handleVideoDraftChange(nextVideoDraft: VideoReviewDraft | null) {
    setVideoDraft(nextVideoDraft);
    setIsVideoDraftApplied(false);
  }

  function handleApplyVideoDraftPatch() {
    if (!canApplyVideoDraftPatch) return;
    setVideoDraftPatchVersion((version) => version + 1);
    setIsVideoDraftApplied(true);
  }

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

  const resultPanel = reviewData ? (
    <div className="space-y-4">
      <ReviewResultCard
        riskTags={reviewData.riskTags}
        scenarioType={reviewData.scenarioType}
        result={reviewData.result}
      />
      <EvidenceMetadataPreview evidenceMetadata={reviewData.evidenceMetadata} />
    </div>
  ) : (
    <div className="flex min-h-96 items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-center text-zinc-500 shadow-sm">
      <div>
        아직 코칭 리뷰 결과가 없습니다.
        <br />
        왼쪽 입력 폼을 작성하고 Coaching Review를 생성해보세요.
      </div>
    </div>
  );

  return (
    <CoachingDashboardLayout
      insight={
        <ReviewInsightPanel
          repeatedPatternPreviewResults={repeatedPatternPreviewResults}
        />
      }
      sceneBuilder={
        <SceneReviewBuilder
          manualForm={
            <DeathReviewForm
              onResult={handleReviewResult}
              videoDraft={videoDraft}
              videoDraftPatch={videoDraftPatch}
              videoDraftPatchVersion={videoDraftPatchVersion}
              onCoreSceneInputChange={setHasExistingCoreSceneInput}
              riotEvidence={riotEvidence}
            />
          }
          videoDraftPanel={
            <VideoDraftPanel onDraftChange={handleVideoDraftChange} embedded />
          }
          riotEvidencePanel={
            <RiotEvidencePanel
              embedded
              onEvidenceChange={setRiotEvidence}
            />
          }
          sourceState={{
            hasManualInput: true,
            hasVideoDraft: Boolean(videoDraft),
            isVideoDraftApplied,
            hasRiotEvidence: Boolean(riotEvidence),
            isRiotEvidenceConnected: Boolean(riotEvidence),
          }}
          canApplyVideoDraftPatch={canApplyVideoDraftPatch}
          onApplyVideoDraftPatch={handleApplyVideoDraftPatch}
          videoDraftApplyWarning={videoDraftApplyWarning}
        />
      }
      result={resultPanel}
    />
  );
}
