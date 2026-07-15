export type ClipUploadStatus =
  | "pending"
  | "uploading"
  | "uploaded"
  | "failed"
  | "skipped";

export type ClipStorageProvider =
  | "local_debug"
  | "s3"
  | "cloudflare_r2"
  | "supabase_storage"
  | "unknown";

export type ClipUploadRecord = {
  clipId: string;
  triggerEventId: string;
  packageId?: string;
  matchId?: string;
  provider: ClipStorageProvider;
  status: ClipUploadStatus;

  storageKey?: string;
  uploadUrl?: string;
  playbackUrl?: string;

  durationMs?: number;
  startedAtLocalTimestampMs?: number;
  endedAtLocalTimestampMs?: number;

  errorCode?: string;
  errorKo?: string;

  createdAtIsoTimestamp: string;
  updatedAtIsoTimestamp: string;
};

export type ClipUploadPlan = {
  packageId?: string;
  matchId?: string;
  provider: ClipStorageProvider;
  records: ClipUploadRecord[];
  warningsKo: string[];
};
