import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

export const mockWorker = setupWorker(...handlers);

const KEY = "sb-mock-api";

/**
 * Runtime-toggleable, no dev-server restart needed: visit ?mock=1 once to
 * turn it on (persisted in localStorage), ?mock=0 to turn it off. See
 * README-mock-api.md for what is and isn't mocked.
 */
export async function maybeStartMockApi(): Promise<void> {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const flag = url.searchParams.get("mock");
  if (flag === "1") localStorage.setItem(KEY, "1");
  if (flag === "0") localStorage.removeItem(KEY);

  if (localStorage.getItem(KEY) !== "1") return;
  await mockWorker.start({ onUnhandledRequest: "bypass", quiet: true });
  console.info("[mock-api] active: news, alerts, reports, votes, notifications, roads and other new tables are faked locally. See README-mock-api.md.");
}
