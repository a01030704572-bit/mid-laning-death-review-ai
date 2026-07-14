import type { RankedReviewScene } from "@/types/matchReview";
import {
  buildNextGameActionGoal,
  formatReviewSceneTime,
} from "@/lib/postGameSummary";

type PostGameSummaryCardProps = {
  topScenes: RankedReviewScene[];
  strengthScenes: RankedReviewScene[];
  improvementScenes: RankedReviewScene[];
};

function sceneLabel(scene: RankedReviewScene) {
  return `${formatReviewSceneTime(scene.gameTimeSec)} · ${scene.displayNameKo}`;
}

export default function PostGameSummaryCard({
  topScenes,
  strengthScenes,
}: PostGameSummaryCardProps) {
  const primaryScene = topScenes[0];
  const strengthScene = strengthScenes[0];

  return (
    <section className="rounded-2xl border border-zinc-200 bg-zinc-950 p-4 text-white">
      <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="text-xs font-semibold text-zinc-300">
            이번 판 핵심 요약
          </p>
          <p className="mt-2 text-sm leading-6">
            {primaryScene
              ? `${sceneLabel(primaryScene)} 장면을 가장 먼저 복기해보세요.`
              : "Riot 경기 기록을 불러오면 먼저 볼 장면을 자동으로 정리합니다."}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/10 p-3">
          <p className="text-xs font-semibold text-zinc-300">다음 판 딱 하나</p>
          <p className="mt-2 text-sm leading-6">
            {buildNextGameActionGoal(primaryScene)}
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-xs font-semibold text-zinc-300">
            유지할 좋은 판단
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-100">
            {strengthScene
              ? `${sceneLabel(strengthScene)} 판단은 다음 판에도 유지할 만한 장면입니다.`
              : "아직 자동으로 분리된 좋은 판단 후보가 없습니다."}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-xs font-semibold text-zinc-300">먼저 볼 장면</p>
          <p className="mt-2 text-sm leading-6 text-zinc-100">
            {primaryScene ? sceneLabel(primaryScene) : "대표 장면 없음"}
          </p>
        </div>
      </div>
    </section>
  );
}
