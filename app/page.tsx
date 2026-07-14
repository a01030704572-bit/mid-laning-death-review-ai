"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import CoachingDashboardLayout from "@/components/CoachingDashboardLayout";
import DeathReviewForm from "@/components/DeathReviewForm";
import EvidenceMetadataPreview from "@/components/EvidenceMetadataPreview";
import MatchAnalysisDashboard from "@/components/MatchAnalysisDashboard";
import ReviewInsightPanel from "@/components/ReviewInsightPanel";
import ReviewResultCard from "@/components/ReviewResultCard";
import RiotEvidencePanel from "@/components/RiotEvidencePanel";
import SceneReviewBuilder from "@/components/SceneReviewBuilder";
import VideoDraftPanel from "@/components/VideoDraftPanel";
import { ReviewResult, RiskTag, ScenarioType } from "@/types/review";
import type { ReviewSceneCompletion } from "@/types/history";
import type { ReviewEvidenceMetadata } from "@/types/evidence";
import type { MatchReviewReport, RankedReviewScene } from "@/types/matchReview";
import type { RiotTimelineEvidence } from "@/types/riot";
import type { LockedRiotVideoContext, VideoReviewDraft } from "@/types/videoDraft";
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
import { getAppMode, type AppMode } from "@/lib/appMode";

type ManualReviewFallbackSectionProps = {
  appMode: AppMode;
  children: ReactNode;
};

function ManualReviewFallbackSection({
  appMode,
  children,
}: ManualReviewFallbackSectionProps) {
  const [isOpen, setIsOpen] = useState(appMode === "debug");

  useEffect(() => {
    setIsOpen(appMode === "debug");
  }, [appMode]);

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-zinc-950">
              직접 복기 입력하기
            </h3>
            {appMode === "debug" && (
              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold text-zinc-500">
                Debug mode
              </span>
            )}
          </div>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            자동 후보가 맞지 않거나 더 자세히 복기하고 싶을 때 사용하세요.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 sm:w-auto"
        >
          {isOpen ? "직접 복기 입력 접기" : "직접 복기 입력 열기"}
        </button>
      </div>

      <div className={isOpen ? "border-t border-zinc-200 p-4" : "hidden"}>
        {children}
      </div>
    </section>
  );
}

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
  const [lockedRiotVideoContext, setLockedRiotVideoContext] =
    useState<LockedRiotVideoContext | null>(null);
  const [matchReviewReport, setMatchReviewReport] =
    useState<MatchReviewReport | null>(null);
  const [selectedScene, setSelectedScene] =
    useState<RankedReviewScene | null>(null);
  const [matchReviewError, setMatchReviewError] = useState<string | null>(null);
  const [isMatchReviewLoading, setIsMatchReviewLoading] = useState(false);
  const [hasExistingCoreSceneInput, setHasExistingCoreSceneInput] =
    useState(false);
  const [appMode, setAppMode] = useState<AppMode>("user");

  useEffect(() => {
    setAppMode(getAppMode());
  }, []);

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

  function handleRiotEvidenceChange(
    nextEvidence: RiotTimelineEvidence | null,
    nextLockedRiotContext: LockedRiotVideoContext | null = null
  ) {
    setRiotEvidence(nextEvidence);
    setLockedRiotVideoContext(nextLockedRiotContext);
    if (!nextEvidence) {
      setMatchReviewReport(null);
      setSelectedScene(null);
      setMatchReviewError(null);
    }
  }

  async function loadMatchReview(matchId: string, puuid: string) {
    setIsMatchReviewLoading(true);
    setMatchReviewError(null);
    setMatchReviewReport(null);
    setSelectedScene(null);

    try {
      const params = new URLSearchParams({
        matchId,
        puuid,
        regionalRoute: "asia",
      });
      const response = await fetch(
        `/api/riot/match-review?${params.toString()}`
      );
      const data = (await response.json()) as {
        report?: MatchReviewReport;
        error?: string;
      };

      if (!response.ok || !data.report) {
        throw new Error(
          data.error || "자동 복기 장면 후보를 불러오지 못했습니다."
        );
      }

      setMatchReviewReport(data.report);
      setSelectedScene(data.report.topScenes[0] ?? null);
    } catch (requestError) {
      setMatchReviewError(
        requestError instanceof Error
          ? requestError.message
          : "자동 복기 장면 후보를 불러오지 못했습니다."
      );
    } finally {
      setIsMatchReviewLoading(false);
    }
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
        appMode={appMode}
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
  const matchAnalysisPanel =
    isMatchReviewLoading || matchReviewError || matchReviewReport ? (
      <div className="space-y-3">
        {isMatchReviewLoading && (
          <p className="rounded-xl border border-zinc-200 bg-white p-3 text-sm text-zinc-500">
            자동 복기 장면 후보를 불러오는 중입니다.
          </p>
        )}
        {matchReviewError && (
          <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {matchReviewError}
          </p>
        )}
        <MatchAnalysisDashboard
          report={matchReviewReport}
          selectedScene={selectedScene}
          onSelectScene={setSelectedScene}
        />
      </div>
    ) : null;

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
            <ManualReviewFallbackSection appMode={appMode}>
              <DeathReviewForm
                onResult={handleReviewResult}
                videoDraft={videoDraft}
                isVideoDraftApplied={isVideoDraftApplied}
                videoDraftPatch={videoDraftPatch}
                videoDraftPatchVersion={videoDraftPatchVersion}
                onCoreSceneInputChange={setHasExistingCoreSceneInput}
                riotEvidence={riotEvidence}
              />
            </ManualReviewFallbackSection>
          }
          videoDraftPanel={
            <VideoDraftPanel
              onDraftChange={handleVideoDraftChange}
              embedded
              lockedRiotContext={lockedRiotVideoContext}
            />
          }
          riotEvidencePanel={
            <RiotEvidencePanel
              embedded
              appMode={appMode}
              onEvidenceChange={handleRiotEvidenceChange}
              onMatchReviewRequested={loadMatchReview}
            />
          }
          matchAnalysisDashboard={matchAnalysisPanel}
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
      appMode={appMode}
    />
  );
}
