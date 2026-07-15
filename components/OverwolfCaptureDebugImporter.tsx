"use client";

import { useState, type ChangeEvent } from "react";
import { validateOverwolfCapturePackage } from "@/lib/overwolfCaptureValidation";
import type { CaptureSession } from "@/types/captureSession";

type ValidationResult = {
  safe: boolean;
  session: CaptureSession;
};

function buildJsonParseFailure(message: string): ValidationResult {
  return {
    safe: false,
    session: {
      sessionId: "capture-session:invalid-json",
      status: "rejected",
      receivedAtIsoTimestamp: "1970-01-01T00:00:00.000Z",
      validationIssues: [
        {
          field: "json",
          reasonKo: `JSON 형식을 확인할 수 없습니다. ${message}`,
        },
      ],
    },
  };
}

export default function OverwolfCaptureDebugImporter() {
  const [jsonText, setJsonText] = useState("");
  const [result, setResult] = useState<ValidationResult | null>(null);

  function validateText(nextText = jsonText) {
    try {
      const parsed = JSON.parse(nextText);
      setResult(validateOverwolfCapturePackage(parsed));
    } catch (error) {
      setResult(
        buildJsonParseFailure(
          error instanceof Error ? error.message : "알 수 없는 오류입니다."
        )
      );
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setJsonText(text);
      if (text.trim()) validateText(text);
    };
    reader.onerror = () => {
      setResult(buildJsonParseFailure("파일을 읽지 못했습니다."));
    };
    reader.readAsText(file);
  }

  const sourcePackage = result?.session.sourcePackage;

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-bold text-zinc-950">
              Overwolf Capture Package Validator
            </h2>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
              Debug only
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Debug only · Overwolf capture package validator
          </p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            이 도구는 검증만 수행하며 저장/업로드/리포트 생성은 하지 않습니다.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <textarea
          value={jsonText}
          onChange={(event) => setJsonText(event.target.value)}
          placeholder='{"packageId":"fixture","source":"overwolf","events":[],"clips":[],"collectedAtLocalTimestampMs":0}'
          className="min-h-44 w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs leading-5 text-zinc-800 outline-none focus:border-zinc-400"
        />

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => validateText()}
            className="rounded-lg bg-zinc-950 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
          >
            Capture Package 검증하기
          </button>
          <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100">
            JSON 파일 불러오기
            <input
              type="file"
              accept="application/json,.json"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {result && (
        <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <div className="grid gap-2 text-xs text-zinc-600 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <span className="font-semibold text-zinc-500">safe</span>
              <p className="mt-1 font-bold text-zinc-950">
                {result.safe ? "true" : "false"}
              </p>
            </div>
            <div>
              <span className="font-semibold text-zinc-500">status</span>
              <p className="mt-1 font-bold text-zinc-950">
                {result.session.status}
              </p>
            </div>
            <div>
              <span className="font-semibold text-zinc-500">sessionId</span>
              <p className="mt-1 break-all font-bold text-zinc-950">
                {result.session.sessionId}
              </p>
            </div>
            <div>
              <span className="font-semibold text-zinc-500">receivedAt</span>
              <p className="mt-1 break-all font-bold text-zinc-950">
                {result.session.receivedAtIsoTimestamp}
              </p>
            </div>
          </div>

          {sourcePackage && (
            <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-3 text-xs text-zinc-600">
              <p className="font-semibold text-zinc-950">
                packageId: {sourcePackage.packageId}
              </p>
              <p className="mt-1">
                events {sourcePackage.events.length}개 · clips{" "}
                {sourcePackage.clips.length}개
              </p>
            </div>
          )}

          <div className="mt-3">
            <h3 className="text-xs font-bold text-zinc-950">
              validationIssues
            </h3>
            {result.session.validationIssues.length > 0 ? (
              <ul className="mt-2 space-y-1 text-xs text-zinc-600">
                {result.session.validationIssues.map((issue, index) => (
                  <li
                    key={`${issue.field}-${index}`}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2"
                  >
                    <span className="font-semibold text-zinc-800">
                      {issue.field}
                    </span>
                    <span className="mx-2 text-zinc-300">·</span>
                    {issue.reasonKo}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-500">
                검증 이슈가 없습니다.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
