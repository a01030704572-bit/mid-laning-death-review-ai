import type { ReactNode } from "react";
import type { AppMode } from "@/lib/appMode";

type CoachingDashboardLayoutProps = {
  insight: ReactNode;
  topSummary?: ReactNode;
  sceneBuilder: ReactNode;
  result: ReactNode;
  appMode?: AppMode;
};

function StatusBadge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-600">
      {children}
    </span>
  );
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-lg font-bold text-zinc-950">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-zinc-500">{description}</p>
    </div>
  );
}

export default function CoachingDashboardLayout({
  insight,
  topSummary,
  sceneBuilder,
  result,
  appMode = "user",
}: CoachingDashboardLayoutProps) {
  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-zinc-500">
            League of Legends Post-game Review Preview
          </p>

          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Mid Laning Decision Review AI
              </h1>
              <p className="mt-3 text-sm leading-6 text-zinc-600 sm:text-base">
                Riot 경기 기록을 바탕으로 복기할 장면을 먼저 찾고, 필요한 경우 수동 입력으로 보완합니다.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {appMode === "debug" && <StatusBadge>Debug mode</StatusBadge>}
              <StatusBadge>자동 복기 Preview</StatusBadge>
              <StatusBadge>Riot 근거 기반</StatusBadge>
              <StatusBadge>수동 입력은 보조</StatusBadge>
            </div>
          </div>
        </header>

        {topSummary}

        {insight}

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(380px,0.95fr)]">
          <div>{sceneBuilder}</div>

          <div className="space-y-4">
            <SectionTitle
              title="장면 분석 결과"
              description="직접 복기 입력으로 생성한 코칭 결과와 연결된 근거 메타데이터를 확인합니다."
            />
            {result}
          </div>
        </section>
      </div>
    </main>
  );
}
