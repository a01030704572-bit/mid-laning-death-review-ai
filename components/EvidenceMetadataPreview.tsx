import type { ReviewEvidenceMetadata } from "@/types/evidence";

type Props = {
  evidenceMetadata?: ReviewEvidenceMetadata;
};

function getSourceStatusLabel(
  source: keyof ReviewEvidenceMetadata["sourcePresence"],
  isPresent: boolean
) {
  if (source === "video") {
    return isPresent
      ? "영상 근거: 이번 리뷰에 연결됨"
      : "영상 근거: 이번 리뷰에 연결되지 않음";
  }
  if (source === "riot") {
    return isPresent
      ? "Riot 근거: 이번 리뷰에 연결됨"
      : "Riot 근거: 이번 리뷰에 연결되지 않음";
  }
  return isPresent
    ? "수동 입력: 이번 리뷰에 연결됨"
    : "수동 입력: 이번 리뷰에 연결되지 않음";
}

const SOURCE_ORDER: (keyof ReviewEvidenceMetadata["sourcePresence"])[] = [
  "manual",
  "video",
  "riot",
];

const CONFIDENCE_LABELS = {
  high: "신뢰도 높음",
  medium: "신뢰도 중간",
  low: "신뢰도 낮음",
} as const;

function CompactList({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <ul className="mt-2 space-y-1.5 text-xs leading-5 text-zinc-600">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex gap-2">
          <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-zinc-400" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function ChipList({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] font-medium text-zinc-600"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-zinc-800">{title}</h3>
      {children}
    </div>
  );
}

export default function EvidenceMetadataPreview({ evidenceMetadata }: Props) {
  if (!evidenceMetadata) return null;

  const hasConflict = evidenceMetadata.conflictsSummary.count > 0;
  const derivedContext = evidenceMetadata.derivedContext;
  const sceneCandidates = evidenceMetadata.sceneCandidates;

  return (
    <aside className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">복기 근거 요약</h2>
          <p className="mt-1 text-xs text-zinc-500">
            확정 판정이 아니라 참고용 근거입니다.
          </p>
        </div>
        {evidenceMetadata.packageGenerationFailed && (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
            생성 실패
          </span>
        )}
      </div>

      {evidenceMetadata.packageGenerationFailed && (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
          복기 근거 요약을 생성하지 못했습니다. 기존 AI 피드백은 정상 생성되었습니다.
        </p>
      )}

      <div className="mt-4 space-y-4">
        <Section title="확인된 입력">
          <div className="mt-2 flex flex-wrap gap-2">
            {SOURCE_ORDER.map((source) => {
              const isPresent = evidenceMetadata.sourcePresence[source];

              return (
                <span
                  key={source}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                    isPresent
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-zinc-200 bg-zinc-50 text-zinc-400"
                  }`}
                >
                  {getSourceStatusLabel(source, isPresent)}
                </span>
              );
            })}
          </div>
        </Section>

        <Section title="복기 근거 요약">
          <CompactList items={evidenceMetadata.evidenceSummary} />
        </Section>

        <Section title="부족한 정보">
          <CompactList items={evidenceMetadata.missingInfo} />
        </Section>

        {hasConflict && (
          <Section title="충돌 가능성">
            <p className="mt-2 text-xs text-zinc-600">
              {evidenceMetadata.conflictsSummary.count}개 필드에서 근거 간 차이가
              감지되었습니다.
            </p>
            <ChipList items={evidenceMetadata.conflictsSummary.fields} />
          </Section>
        )}

        {(derivedContext.primarySceneType ||
          derivedContext.likelyReviewFocus.length > 0 ||
          derivedContext.objectiveContext) && (
          <Section title="추정된 복기 초점">
            {derivedContext.primarySceneType && (
              <p className="mt-2 text-xs text-zinc-600">
                주요 장면 유형: {derivedContext.primarySceneType}
              </p>
            )}
            <ChipList items={derivedContext.likelyReviewFocus} />
            {derivedContext.objectiveContext && (
              <p className="mt-2 rounded-xl bg-zinc-50 p-3 text-xs leading-5 text-zinc-600">
                {derivedContext.objectiveContext}
              </p>
            )}
          </Section>
        )}

        {derivedContext.riskTagsFromEvidence.length > 0 && (
          <Section title="근거 기반 위험 태그">
            <ChipList items={derivedContext.riskTagsFromEvidence} />
          </Section>
        )}

        {sceneCandidates && sceneCandidates.candidates.length > 0 && (
          <Section title="장면 후보">
            <div className="mt-2 space-y-3">
              {sceneCandidates.candidates.map((candidate) => (
                <div
                  key={candidate.scenarioId}
                  className="rounded-xl border border-zinc-200 bg-zinc-50 p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold text-zinc-900">
                      {candidate.displayNameKo}
                    </p>
                    <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                      {CONFIDENCE_LABELS[candidate.confidence]}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-zinc-600">
                    {candidate.reasonKo}
                  </p>
                  <ChipList items={candidate.matchedRiskTags} />
                  {candidate.limitingFactors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-[11px] font-semibold text-zinc-500">
                        추가 확인 필요
                      </p>
                      <CompactList items={candidate.limitingFactors} />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs leading-5 text-zinc-500">
              {sceneCandidates.noteKo}
            </p>
          </Section>
        )}
      </div>
    </aside>
  );
}
