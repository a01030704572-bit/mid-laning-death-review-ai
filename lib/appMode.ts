export type AppMode = "user" | "debug";

export function getAppMode(): AppMode {
  if (typeof window === "undefined") return "user";

  const params = new URLSearchParams(window.location.search);
  if (params.get("debug") === "true") return "debug";
  if (process.env.NEXT_PUBLIC_APP_MODE === "debug") return "debug";

  return "user";
}
