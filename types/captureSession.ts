import type { OverwolfCapturePackage } from "@/types/overwolfCapture";

export type CaptureSessionStatus =
  | "received"
  | "validated"
  | "match_pending"
  | "rejected";

export type CaptureSessionValidationIssue = {
  field: string;
  reasonKo: string;
};

export type CaptureSession = {
  sessionId: string;
  status: CaptureSessionStatus;
  receivedAtIsoTimestamp: string;
  sourcePackage?: OverwolfCapturePackage;
  validationIssues: CaptureSessionValidationIssue[];
};
