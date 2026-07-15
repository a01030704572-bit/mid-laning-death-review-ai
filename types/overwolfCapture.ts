export type OverwolfCaptureEventType =
  | "death"
  | "solo_kill"
  | "kill"
  | "assist"
  | "objective"
  | "recall"
  | "unknown";

export type OverwolfCaptureConfidence = "high" | "medium" | "low";

export type OverwolfCaptureEvent = {
  id: string;
  type: OverwolfCaptureEventType;
  localTimestampMs: number;
  estimatedGameTimeSec?: number;
  confidence: OverwolfCaptureConfidence;
  rawEventName?: string;
  summaryKo?: string;
  raw?: unknown;
};

export type OverwolfClip = {
  id: string;
  triggerEventId: string;
  filePathOrUrl?: string;
  pastDurationMs: number;
  futureDurationMs: number;
  capturedAtLocalTimestampMs: number;
  status: "captured" | "capture_failed" | "capture_partial";
};

export type OverwolfCapturePackage = {
  packageId: string;
  source: "overwolf";
  matchIdGuess?: string;
  puuidGuess?: string;
  gameNameGuess?: string;
  tagLineGuess?: string;
  clientVersion?: string;
  events: OverwolfCaptureEvent[];
  clips: OverwolfClip[];
  collectedAtLocalTimestampMs: number;
};

export type OverwolfAlignmentResult = {
  status: "aligned" | "misaligned" | "unknown";
  deltaSeconds?: number;
  matchedRiotEventId?: string;
  matchedOverwolfEventId?: string;
  toleranceSecUsed?: 10 | 30;
  confidence: "confirmed" | "likely" | "unconfirmed";
  reasonKo?: string;
};

export type SceneVideoEvidence = {
  sceneId: string;
  clip?: Omit<OverwolfClip, "triggerEventId">;
  sourceEvent?: Omit<OverwolfCaptureEvent, "raw">;
  confidence: "confirmed" | "likely" | "unconfirmed";
  alignment: OverwolfAlignmentResult;
  noteKo: string;
};
