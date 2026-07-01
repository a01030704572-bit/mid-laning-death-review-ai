"use client";

import { useState } from "react";
import type {
  RiotMatchListItem,
  RiotMatchListResponse,
  RiotRegionalRoute,
  RiotTimelineEvidence,
  RiotTimelineEvidenceResponse,
} from "@/types/riot";

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function parseGameTimeSec(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return NaN;
  if (!trimmed.includes(":")) return Number(trimmed);
  const [minutes, seconds] = trimmed.split(":").map(Number);
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return NaN;
  return minutes * 60 + seconds;
}

function objectiveLabel(value: string) {
  switch (value) {
    case "dragon":
      return "Dragon";
    case "horde":
      return "Void Grubs";
    case "rift_herald":
      return "Rift Herald";
    case "baron":
      return "Baron";
    default:
      return "None";
  }
}

type RiotEvidencePanelProps = {
  embedded?: boolean;
  onEvidenceChange?: (evidence: RiotTimelineEvidence | null) => void;
};

export default function RiotEvidencePanel({
  embedded = false,
  onEvidenceChange,
}: RiotEvidencePanelProps) {
  const [gameName, setGameName] = useState("");
  const [tagLine, setTagLine] = useState("");
  const [regionalRoute, setRegionalRoute] = useState<RiotRegionalRoute>("asia");
  const [matches, setMatches] = useState<RiotMatchListItem[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<RiotMatchListItem | null>(null);
  const [gameTime, setGameTime] = useState("");
  const [windowSec, setWindowSec] = useState(60);
  const [evidence, setEvidence] = useState<RiotTimelineEvidence | null>(null);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const primaryEvents = evidence
    ? evidence.events.filter((event) => event.importance !== "minor")
    : [];
  const minorEvents = evidence
    ? evidence.events.filter((event) => event.importance === "minor")
    : [];

  async function loadMatches() {
    setError(null);
    setEvidence(null);
    onEvidenceChange?.(null);
    setSelectedMatch(null);

    if (!gameName.trim() || !tagLine.trim()) {
      setError("Riot ID와 Tag를 입력해 주세요.");
      return;
    }

    setLoadingMatches(true);
    try {
      const params = new URLSearchParams({
        gameName: gameName.trim(),
        tagLine: tagLine.trim(),
        regionalRoute,
        count: "5",
      });
      const response = await fetch(`/api/riot/matches?${params.toString()}`);
      const data = (await response.json()) as RiotMatchListResponse & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error || "최근 경기 조회에 실패했습니다.");
      }
      setMatches(data.matches);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "최근 경기 조회에 실패했습니다."
      );
    } finally {
      setLoadingMatches(false);
    }
  }

  async function loadEvidence() {
    setError(null);
    setEvidence(null);
    onEvidenceChange?.(null);

    if (!selectedMatch) {
      setError("클립이 나온 경기를 선택해 주세요.");
      return;
    }

    const gameTimeSec = parseGameTimeSec(gameTime);
    if (!Number.isFinite(gameTimeSec) || gameTimeSec < 0) {
      setError("게임 시간을 초 또는 mm:ss 형식으로 입력해 주세요.");
      return;
    }

    setLoadingEvidence(true);
    try {
      const response = await fetch("/api/riot/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: selectedMatch.matchId,
          puuid: selectedMatch.puuid,
          gameTimeSec,
          windowSec,
          championName: selectedMatch.championName,
        }),
      });
      const data = (await response.json()) as RiotTimelineEvidenceResponse & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error || "Riot evidence 조회에 실패했습니다.");
      }
      setEvidence(data.evidence);
      onEvidenceChange?.(data.evidence);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Riot evidence 조회에 실패했습니다."
      );
    } finally {
      setLoadingEvidence(false);
    }
  }

  return (
    <section
      className={
        embedded
          ? "space-y-4"
          : "space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
      }
    >
      {!embedded && (
      <div>
        <h2 className="text-lg font-bold text-zinc-950">Riot 경기 기록으로 근거 확인하기</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Riot match timeline 기준으로 클립 주변의 이벤트, CS/골드/XP 변화, 오브젝트 영향을 추정합니다.
        </p>
      </div>
      )}

      <div className="grid gap-3 md:grid-cols-4">
        <label className="text-sm font-medium text-zinc-800">
          Riot ID
          <input
            value={gameName}
            onChange={(event) => setGameName(event.target.value)}
            placeholder="gameName"
            className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-sm"
          />
        </label>
        <label className="text-sm font-medium text-zinc-800">
          Tag
          <input
            value={tagLine}
            onChange={(event) => setTagLine(event.target.value)}
            placeholder="KR1"
            className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-sm"
          />
        </label>
        <label className="text-sm font-medium text-zinc-800">
          Region
          <select
            value={regionalRoute}
            onChange={(event) => setRegionalRoute(event.target.value as RiotRegionalRoute)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white p-2 text-sm"
          >
            <option value="asia">asia</option>
            <option value="americas">americas</option>
            <option value="europe">europe</option>
            <option value="sea">sea</option>
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={loadMatches}
            disabled={loadingMatches}
            className="w-full rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {loadingMatches ? "조회 중..." : "최근 경기 가져오기"}
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {matches.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-900">최근 5경기</h3>
          <div className="grid gap-2 md:grid-cols-2">
            {matches.map((match) => (
              <button
                key={match.matchId}
                type="button"
                onClick={() => {
                  setSelectedMatch(match);
                  setEvidence(null);
                  onEvidenceChange?.(null);
                }}
                className={`rounded-xl border p-3 text-left text-sm ${
                  selectedMatch?.matchId === match.matchId
                    ? "border-zinc-950 bg-zinc-100"
                    : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-zinc-950">{match.championName}</span>
                  <span className={match.win ? "text-emerald-700" : "text-red-700"}>
                    {match.win ? "승리" : "패배"}
                  </span>
                </div>
                <div className="mt-1 text-zinc-600">
                  KDA {match.kills}/{match.deaths}/{match.assists} · {formatDuration(match.gameDuration)}
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  {formatDate(match.gameCreation)}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedMatch && (
        <div className="grid gap-3 border-t border-zinc-200 pt-4 md:grid-cols-3">
          <label className="text-sm font-medium text-zinc-800">
            게임 시간
            <input
              value={gameTime}
              onChange={(event) => setGameTime(event.target.value)}
              placeholder="예: 7:30 또는 450"
              className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-sm"
            />
          </label>
          <label className="text-sm font-medium text-zinc-800">
            장면 이후 분석 범위
            <select
              value={windowSec}
              onChange={(event) => setWindowSec(Number(event.target.value))}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white p-2 text-sm"
            >
              <option value={30}>30초</option>
              <option value={60}>60초</option>
              <option value={90}>90초</option>
              <option value={120}>120초</option>
            </select>
            <span className="mt-1 block text-xs font-normal text-zinc-500">
              입력한 게임 시간부터 이후 N초 동안의 Riot timeline 이벤트와 delta를 확인합니다.
            </span>
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={loadEvidence}
              disabled={loadingEvidence}
              className="w-full rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {loadingEvidence ? "Evidence 조회 중..." : "Riot Evidence 가져오기"}
            </button>
          </div>
        </div>
      )}

      {evidence && (
        <div className="space-y-3 border-t border-zinc-200 pt-4">
          <p className="text-xs text-zinc-500">Riot timeline 기준 추정값입니다.</p>
          <EvidenceBlock title="주요 이벤트">
            {primaryEvents.length > 0 ? (
              <ul className="list-disc space-y-1 pl-5">
                {primaryEvents.map((event, index) => (
                  <li key={`${event.timestampSec}-${event.kind}-${index}`}>
                    {event.description} · {event.kind} · {event.importance}
                    {event.isPlayerInvolved ? " · 플레이어 관여" : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <p>선택한 window 안에 주요 이벤트가 없습니다.</p>
            )}
          </EvidenceBlock>
          {minorEvents.length > 0 && (
            <EvidenceBlock title="기타 이벤트">
              <details>
                <summary className="cursor-pointer text-zinc-700">
                  ward/item/level 이벤트 {minorEvents.length}개 보기
                </summary>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-zinc-600">
                  {minorEvents.map((event, index) => (
                    <li key={`${event.timestampSec}-${event.kind}-minor-${index}`}>
                      {event.description} · {event.kind}
                      {event.isPlayerInvolved ? " · 플레이어 관여" : ""}
                    </li>
                  ))}
                </ul>
              </details>
            </EvidenceBlock>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <EvidenceBlock title="Player Delta">
              <p>CS {evidence.playerDelta.csBefore} → {evidence.playerDelta.csAfter} ({evidence.playerDelta.csDelta})</p>
              <p>Gold {evidence.playerDelta.totalGoldBefore} → {evidence.playerDelta.totalGoldAfter} ({evidence.playerDelta.totalGoldDelta})</p>
              <p>XP {evidence.playerDelta.xpBefore} → {evidence.playerDelta.xpAfter} ({evidence.playerDelta.xpDelta})</p>
              <p>Level {evidence.playerDelta.levelBefore} → {evidence.playerDelta.levelAfter}</p>
            </EvidenceBlock>
            <EvidenceBlock title="Enemy Mid Delta">
              {evidence.enemyMidDelta.participantId ? (
                <>
                  <p>{evidence.enemyMidDelta.championName}</p>
                  <p>CS {evidence.enemyMidDelta.csBefore} → {evidence.enemyMidDelta.csAfter} ({evidence.enemyMidDelta.csDelta})</p>
                  <p>Gold delta {evidence.enemyMidDelta.totalGoldDelta}</p>
                  <p>XP delta {evidence.enemyMidDelta.xpDelta}</p>
                </>
              ) : (
                <p>상대 미드 정보를 특정하지 못했습니다.</p>
              )}
            </EvidenceBlock>
          </div>

          <EvidenceBlock title="Objective Context">
            <p>
              가장 가까운 예정 오브젝트 추정: {objectiveLabel(evidence.objectiveContext.nearestObjective)}
              {evidence.objectiveContext.timeToObjectiveSec !== null
                ? `, ${evidence.objectiveContext.timeToObjectiveSec}초 후`
                : ""}
            </p>
            <div className="mt-2">
              <p className="font-medium text-zinc-900">장면 내 처치된 오브젝트</p>
              {evidence.objectiveContext.actualObjectivesKilledInWindow.length > 0 ? (
                <ul className="list-disc space-y-1 pl-5">
                  {evidence.objectiveContext.actualObjectivesKilledInWindow.map((objective) => (
                    <li key={`${objective.type}-${objective.timestampSec}`}>
                      {objectiveLabel(objective.type)}, {objective.timestampSec}초
                      {objective.killerTeamId ? ` · Team ${objective.killerTeamId}` : ""}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>없음</p>
              )}
            </div>
            <p>오브젝트 준비 턴 영향 가능성: {evidence.objectiveContext.impactsDeath ? "있음" : "낮음"}</p>
          </EvidenceBlock>

          <EvidenceBlock title="이 판단의 기회비용 / 후속 전환 체크">
            <p className="font-medium text-zinc-900">{evidence.gainLossDraft.swingSummary}</p>
            <p className="mt-2">Tempo: {evidence.gainLossDraft.tempoImpact}</p>
            <p>Objective: {evidence.gainLossDraft.objectiveImpact}</p>
            <p>Confidence: {evidence.gainLossDraft.confidence}</p>
            <div className="mt-2 grid gap-3 md:grid-cols-2">
              <List title="플레이어 전환 체크" items={evidence.gainLossDraft.playerLosses} />
              <List title="상대/맵 이벤트 체크" items={evidence.gainLossDraft.enemyGains} />
            </div>
          </EvidenceBlock>

          {evidence.uncertainInfo.length > 0 && (
            <EvidenceBlock title="Uncertain Info">
              <ul className="list-disc space-y-1 pl-5">
                {evidence.uncertainInfo.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </EvidenceBlock>
          )}
        </div>
      )}
    </section>
  );
}

function EvidenceBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-700">
      <h3 className="font-semibold text-zinc-900">{title}</h3>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="font-medium text-zinc-900">{title}</h4>
      {items.length > 0 ? (
        <ul className="mt-1 list-disc space-y-1 pl-5">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-zinc-500">표시할 항목이 없습니다.</p>
      )}
    </div>
  );
}
