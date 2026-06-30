import { normalizeChampionName } from "@/lib/championNameNormalizer";
import type { RiotChampionContext } from "@/lib/riotChampionContext";
import type { ReviewFormPatch } from "@/lib/videoDraftToReviewFormPatch";

export type VideoDraftChampionConflict = {
  field: "myChampion" | "enemyChampion";
  videoValue: string;
  source: "manual" | "riot";
  sourceValue: string;
  reasonKo: string;
};

export type VideoDraftChampionStatus =
  | "verified_match"
  | "conflict"
  | "unverified_no_riot_context"
  | "ambiguous_riot_position"
  | "manual_value_preserved"
  | "not_provided";

export type VideoDraftVerificationResult = {
  filteredPatch: ReviewFormPatch;
  championStatuses: Record<"myChampion" | "enemyChampion", VideoDraftChampionStatus>;
  conflicts: VideoDraftChampionConflict[];
  actionableConflicts: VideoDraftChampionConflict[];
  notes: string[];
};

export function filterVideoDraftPatchWithVerification(input: {
  patch: ReviewFormPatch;
  manualInput?: Partial<Record<"myChampion" | "enemyChampion", string>>;
  riotContext?: RiotChampionContext | null;
  conflictCap?: number;
}): VideoDraftVerificationResult {
  const filteredPatch = { ...input.patch };
  const conflicts: VideoDraftChampionConflict[] = [];
  const notes: string[] = [];
  const championStatuses: VideoDraftVerificationResult["championStatuses"] = {
    myChampion: "not_provided",
    enemyChampion: "not_provided",
  };

  verifyField({
    field: "myChampion",
    patch: filteredPatch,
    manualValue: input.manualInput?.myChampion,
    riotValue: input.riotContext?.playerChampion ?? null,
    riotValueKey: input.riotContext?.playerChampionKey ?? null,
    hasRiotContext: hasRiotPlayerContext(input.riotContext),
    isRiotAmbiguous: false,
    conflicts,
    notes,
    championStatuses,
  });

  verifyField({
    field: "enemyChampion",
    patch: filteredPatch,
    manualValue: input.manualInput?.enemyChampion,
    riotValue: input.riotContext?.enemyMidChampion ?? null,
    riotValueKey: input.riotContext?.enemyMidChampionKey ?? null,
    hasRiotContext: Boolean(input.riotContext && input.riotContext.status === "player_found"),
    isRiotAmbiguous: input.riotContext?.enemyMidStatus === "ambiguous",
    conflicts,
    notes,
    championStatuses,
  });

  return {
    filteredPatch,
    championStatuses,
    conflicts,
    actionableConflicts: conflicts.slice(0, input.conflictCap ?? 3),
    notes,
  };
}

function verifyField(input: {
  field: "myChampion" | "enemyChampion";
  patch: ReviewFormPatch;
  manualValue?: string;
  riotValue: string | null;
  riotValueKey: string | null;
  hasRiotContext: boolean;
  isRiotAmbiguous: boolean;
  conflicts: VideoDraftChampionConflict[];
  notes: string[];
  championStatuses: VideoDraftVerificationResult["championStatuses"];
}) {
  const videoValue = input.patch[input.field];
  if (!videoValue) return;

  const videoKey = normalizeChampionName(videoValue);
  if (!videoKey) {
    delete input.patch[input.field];
    input.championStatuses[input.field] = "not_provided";
    return;
  }

  const manualKey = normalizeChampionName(input.manualValue);
  if (manualKey && manualKey !== videoKey) {
    input.conflicts.push({
      field: input.field,
      videoValue,
      source: "manual",
      sourceValue: input.manualValue ?? "",
      reasonKo: "기존 수동 입력과 영상 초안 챔피언 후보가 다릅니다.",
    });
    delete input.patch[input.field];
    input.championStatuses[input.field] = "manual_value_preserved";
    return;
  }

  if (input.riotValueKey && input.riotValueKey !== videoKey) {
    input.conflicts.push({
      field: input.field,
      videoValue,
      source: "riot",
      sourceValue: input.riotValue ?? "",
      reasonKo: "Riot 참가자 정보와 영상 초안 챔피언 후보가 다릅니다.",
    });
    delete input.patch[input.field];
    input.championStatuses[input.field] = "conflict";
    return;
  }

  if (input.riotValueKey === videoKey || manualKey === videoKey) {
    input.championStatuses[input.field] = "verified_match";
    return;
  }

  if (input.isRiotAmbiguous) {
    input.championStatuses[input.field] = "ambiguous_riot_position";
    input.notes.push("Riot 포지션 정보가 모호해 상대 미드 챔피언을 확정하지 않았습니다.");
    return;
  }

  if (!input.hasRiotContext) {
    input.championStatuses[input.field] = "unverified_no_riot_context";
    input.notes.push("Riot 참가자 정보가 없어 영상 챔피언 후보는 미검증 상태입니다.");
  }
}

function hasRiotPlayerContext(riotContext?: RiotChampionContext | null) {
  return Boolean(
    riotContext &&
      riotContext.status === "player_found" &&
      riotContext.playerChampionKey
  );
}
