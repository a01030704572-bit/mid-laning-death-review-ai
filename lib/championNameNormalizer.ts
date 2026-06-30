const CHAMPION_ALIASES: Record<string, string> = {
  "아칼리": "akali",
  "리산드라": "lissandra",
  "리신": "leesin",
  "리 신": "leesin",
};

export function normalizeChampionName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const alias = CHAMPION_ALIASES[trimmed];
  if (alias) return alias;

  const compact = trimmed
    .toLowerCase()
    .replace(/[\s'’.\-_]/g, "");
  return compact || null;
}

export function championNamesMatch(left: unknown, right: unknown): boolean {
  const normalizedLeft = normalizeChampionName(left);
  const normalizedRight = normalizeChampionName(right);
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
}
