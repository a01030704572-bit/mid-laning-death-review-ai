import type { RiotTimelineEvidence } from "@/types/riot";
import type { DeathReviewInput } from "@/types/review";
import type { VideoReviewDraft } from "@/types/videoDraft";

export type EvidenceSourceName = "manual" | "video" | "riot";

export type EvidenceSourceConfidence = "high" | "medium" | "low" | "unknown";

export type EvidenceConflict = {
  field: string;
  sources: EvidenceSourceName[];
  description: string;
  severity: "low" | "medium" | "high";
};

export type SceneEvidencePackageSources = {
  manual?: Partial<DeathReviewInput>;
  video?: Partial<VideoReviewDraft>;
  riot?: Partial<RiotTimelineEvidence>;
};

export type SceneEvidencePackage = {
  sources: SceneEvidencePackageSources;
  sourcePresence: Record<EvidenceSourceName, boolean>;
  sourceConfidence: Record<EvidenceSourceName, EvidenceSourceConfidence>;
  evidenceSummary: string[];
  missingInfo: string[];
  conflicts: EvidenceConflict[];
  derivedContext: {
    primarySceneType?: string;
    likelyReviewFocus: string[];
    riskTagsFromEvidence: string[];
    objectiveContext?: string;
  };
  matchId?: string;
  puuid?: string;
  gameTimeSec?: number;
  windowSec?: number;
};

export type ReviewEvidenceMetadata = {
  sourcePresence: SceneEvidencePackage["sourcePresence"];
  sourceConfidence: SceneEvidencePackage["sourceConfidence"];
  evidenceSummary: string[];
  missingInfo: string[];
  conflictsSummary: {
    count: number;
    fields: string[];
  };
  derivedContext: SceneEvidencePackage["derivedContext"];
  sceneCandidates?: SceneCandidateMetadata;
  packageGenerationFailed?: boolean;
};

export type CompactSceneCandidateMetadata = {
  scenarioId: string;
  displayNameKo: string;
  confidence: "high" | "medium" | "low";
  matchedRiskTags: string[];
  reasonKo: string;
  limitingFactors: string[];
};

export type SceneCandidateMetadata = {
  candidates: CompactSceneCandidateMetadata[];
  candidateScenarioIds: string[];
  candidateMetricIds: string[];
  candidateHabitPatternIds: string[];
  noteKo: string;
};

export type BuildSceneEvidencePackageInput = {
  manualInput?: Partial<DeathReviewInput> | null;
  videoDraft?: Partial<VideoReviewDraft> | null;
  riotEvidence?: Partial<RiotTimelineEvidence> | null;
  matchId?: string;
  puuid?: string;
  gameTimeSec?: number;
  windowSec?: number;
};
