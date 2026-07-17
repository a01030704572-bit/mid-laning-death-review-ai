import { DEFAULT_FEEDBACK_JUDGE_INTERNAL_LABEL_BLOCKLIST } from "@/lib/feedbackJudgePrompt";
import type {
  FeedbackJudgeIssue,
  FeedbackJudgeResult,
  FeedbackJudgeVerdict,
} from "@/types/feedbackJudge";

const SNAKE_CASE_PATTERN = /\b[a-z]+(?:_[a-z0-9]+)+\b/g;
const SCREAMING_CASE_PATTERN = /\b[A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+\b/g;

const HIDDEN_PSYCH_PROFILE_PHRASES = [
  "승부욕이 강한 타입",
  "인내심이 부족",
  "tilted",
  "greedy person",
  "lacks discipline",
  "멘탈이 약한",
  "참을성이 없는",
];

const MANIPULATIVE_PHRASES = [
  "계속 질 것입니다",
  "지금 안 고치면",
  "이대로면 절대",
  "고치지 않으면 계속",
];

const SHAMING_PHRASES = [
  "당신 때문에",
  "네가 망쳤",
  "실력이 부족해서",
  "부끄러운",
];

const VAGUE_GOALS = [
  "더 신중하게 플레이하세요",
  "신중하게 플레이하세요",
  "잘하세요",
  "판단력을 기르세요",
  "조심하세요",
  "집중하세요",
];

export function detectInternalLabelLeaks(text: string): string[] {
  const matches = new Set<string>();

  for (const label of DEFAULT_FEEDBACK_JUDGE_INTERNAL_LABEL_BLOCKLIST) {
    if (text.includes(label)) matches.add(label);
  }
  for (const match of text.matchAll(SNAKE_CASE_PATTERN)) {
    matches.add(match[0]);
  }
  for (const match of text.matchAll(SCREAMING_CASE_PATTERN)) {
    matches.add(match[0]);
  }

  return [...matches];
}

export function detectHiddenPsychProfilePhrases(text: string): string[] {
  return detectPhrases(text, HIDDEN_PSYCH_PROFILE_PHRASES);
}

export function detectManipulativePhrases(text: string): string[] {
  return detectPhrases(text, [...MANIPULATIVE_PHRASES, ...SHAMING_PHRASES]);
}

export function hasActionableNextGameGoal(text: string): boolean {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return false;
  if (VAGUE_GOALS.some((goal) => normalized === goal || normalized.includes(goal))) {
    return false;
  }

  const hasTrigger =
    /(?:하면|할 때|나오면|보이면|없으면|전까지|이후|뒤|전에|if|when)/i.test(
      normalized
    );
  const hasAction =
    /(?:확인|선택|멈추|박고|정리|와드|귀환|압박하지|움직이|체크|기다리|ping|핑)/i.test(
      normalized
    );
  const hasObservableCondition =
    /\d+\s*(?:초|분)|(?:하나|먼저|안에|전까지|기준|성공|확인)/.test(
      normalized
    );

  return hasTrigger && hasAction && hasObservableCondition;
}

export function sanitizeUserFacingFeedbackText(text: string): string {
  const withoutBlocklistedLabels =
    DEFAULT_FEEDBACK_JUDGE_INTERNAL_LABEL_BLOCKLIST.reduce(
      (current, label) => current.replaceAll(label, ""),
      text
    );

  return withoutBlocklistedLabels
    .replace(/\b[a-z]+(?:_[a-z0-9]+)+\b/g, "")
    .replace(/\b[A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+\b/g, "")
    .replace(/유지할\s*강점\s*[·ㆍ•-]\s*/g, "")
    .replace(/\s*[·ㆍ•-]\s*(?=[,.;:!?。！？]|$)/g, "")
    .replace(/([,.;:!?。！？]){2,}/g, "$1")
    .replace(/\s+([,.;:!?。！？])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function enforceFeedbackJudgeResultSafety(
  result: FeedbackJudgeResult
): FeedbackJudgeResult {
  const issues = cloneIssues(result.issues);
  const hasHighBlocker = issues.some(
    (issue) =>
      issue.severity === "high" &&
      (issue.type === "hidden_psych_profile" ||
        issue.type === "manipulative" ||
        issue.type === "shaming")
  );
  const hasInternalLabel = issues.some((issue) => issue.type === "internal_label");
  let verdict: FeedbackJudgeVerdict = result.verdict;

  if (hasHighBlocker) {
    verdict = "reject";
  } else if (hasInternalLabel && verdict === "pass") {
    verdict = "revise";
  }

  return {
    ...result,
    verdict,
    issues,
    safeRewrite: result.safeRewrite
      ? {
          ...result.safeRewrite,
          notesKo: result.safeRewrite.notesKo
            ? [...result.safeRewrite.notesKo]
            : undefined,
        }
      : undefined,
    shouldShowToUser: verdict !== "reject",
  };
}

function detectPhrases(text: string, phrases: string[]) {
  const loweredText = text.toLowerCase();
  return phrases.filter((phrase) => loweredText.includes(phrase.toLowerCase()));
}

function cloneIssues(issues: FeedbackJudgeIssue[]) {
  return issues.map((issue) => ({ ...issue }));
}
