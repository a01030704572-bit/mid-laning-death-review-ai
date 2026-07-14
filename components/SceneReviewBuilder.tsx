import type { ReactNode } from "react";
import {
  buildSceneReviewSourceSummary,
  type SceneReviewSourceState,
} from "@/lib/sceneReviewSourceSummary";
import type { VideoDraftApplyWarning } from "@/lib/videoDraftTrustGate";

type SceneReviewBuilderProps = {
  manualForm: ReactNode;
  videoDraftPanel: ReactNode;
  riotEvidencePanel: ReactNode;
  sourceState: SceneReviewSourceState;
  canApplyVideoDraftPatch?: boolean;
  onApplyVideoDraftPatch?: () => void;
  videoDraftApplyWarning?: VideoDraftApplyWarning | null;
};

function SourceCard({
  title,
  description,
  status,
  primary = false,
}: {
  title: string;
  description: string;
  status: string;
  primary?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        primary
          ? "border-zinc-300 bg-zinc-100"
          : "border-zinc-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-zinc-950">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            {description}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${
            primary
              ? "bg-zinc-950 text-white"
              : "border border-zinc-200 bg-zinc-50 text-zinc-500"
          }`}
        >
          {status}
        </span>
      </div>
    </div>
  );
}

function EvidenceDetails({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <details className="group rounded-2xl border border-zinc-200 bg-white">
      <summary className="cursor-pointer list-none px-4 py-3 marker:hidden">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-950">{title}</h3>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              {description}
            </p>
          </div>
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-500 group-open:hidden">
            열기
          </span>
          <span className="hidden rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-500 group-open:inline">
            접기
          </span>
        </div>
      </summary>
      <div className="border-t border-zinc-200 p-4">{children}</div>
    </details>
  );
}

export default function SceneReviewBuilder({
  manualForm,
  videoDraftPanel,
  riotEvidencePanel,
  sourceState,
  canApplyVideoDraftPatch = false,
  onApplyVideoDraftPatch,
  videoDraftApplyWarning,
}: SceneReviewBuilderProps) {
  const sourceSummary = buildSceneReviewSourceSummary(sourceState);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-zinc-950">이번 판 자동 복기</h2>
        <p className="mt-1 text-sm leading-6 text-zinc-500">
          Riot 매치를 연결하면 장면을 자동으로 찾아드립니다. 자동 후보가 부족할 때만 직접 입력하세요.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <SourceCard
          title="Riot 경기 기록"
          description="킬/데스/오브젝트 이벤트 기반"
          status={sourceSummary.riotStatusKo}
          primary
        />
        <SourceCard
          title="영상 초안"
          description="클립에서 보조 관찰 추출"
          status={sourceSummary.videoStatusKo}
        />
        <SourceCard
          title="직접 입력"
          description="자동 후보가 부족할 때 보완"
          status={sourceSummary.manualStatusKo}
        />
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold text-zinc-500">
              현재 복기 소스 상태
            </p>
            <p className="mt-1 text-sm leading-6 text-zinc-800">
              {sourceSummary.overallStatusKo}
            </p>
          </div>
          {sourceSummary.connectedSourceBadges.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {sourceSummary.connectedSourceBadges.map((badge) => (
                <span
                  key={badge}
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                >
                  {badge}
                </span>
              ))}
            </div>
          )}
        </div>
        <p className="mt-3 text-xs leading-5 text-zinc-500">
          영상/Riot 결과는 최종 판단이 아니라 자동 후보와 직접 입력을 보조하는 근거입니다.
        </p>
        {sourceState.hasVideoDraft && !sourceState.isVideoDraftApplied && (
          <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 p-3">
            {videoDraftApplyWarning && (
              <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                {videoDraftApplyWarning.message}
              </p>
            )}
            {canApplyVideoDraftPatch ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-sky-800">
                  영상 초안이 준비되었습니다. 적용 전에 직접 수정할 수 있습니다.
                </p>
                <button
                  type="button"
                  onClick={onApplyVideoDraftPatch}
                  className="rounded-lg bg-sky-700 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-800"
                >
                  영상 초안 폼에 적용
                </button>
              </div>
            ) : (
              <p className="text-xs leading-5 text-sky-800">
                적용 가능한 입력값 후보가 아직 없습니다.
              </p>
            )}
          </div>
        )}
      </div>

      {manualForm}

      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-bold text-zinc-900">보조 근거 연결</h3>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            필요할 때만 열어 영상 초안과 Riot 경기 기록 근거를 확인합니다.
          </p>
        </div>

        <EvidenceDetails
          title="영상으로 입력값 초안 만들기"
          description="짧은 클립에서 직접 입력에 넣을 후보 값을 준비합니다."
        >
          {videoDraftPanel}
        </EvidenceDetails>

        <EvidenceDetails
          title="Riot 경기 기록으로 근거 확인하기"
          description="킬, 데스, 오브젝트, 성장 변화 이벤트를 보조 근거로 확인합니다."
        >
          {riotEvidencePanel}
        </EvidenceDetails>
      </div>
    </section>
  );
}
