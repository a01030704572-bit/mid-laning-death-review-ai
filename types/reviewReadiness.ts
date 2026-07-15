export type ReviewReadinessStatus =
  | "riot_ready"
  | "video_ready"
  | "match_inference_needed"
  | "riot_fallback";

export type ReviewReadinessSource =
  | "riot"
  | "riot_video"
  | "overwolf_inference"
  | "fallback";

export type ReviewReadinessCard = {
  id: ReviewReadinessStatus;
  titleKo: string;
  eyebrowKo: string;
  source: ReviewReadinessSource;
  statusLabelKo: string;
  descriptionKo: string;
  evidenceLabelKo: string;
  ctaKo?: string;
  isActionable: boolean;
};
