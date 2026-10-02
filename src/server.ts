import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { handleRssFeedRequest } from "./lib/rss-feed";
import { serverEnv } from "./lib/runtime-env.server";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      // Cloudflare exposes secrets and bindings on the request handler's env
      // argument. Keep the existing server-only runtimeEnv seam supplied for
      // every request, not only scheduled push dispatches.
      (globalThis as typeof globalThis & { __env__?: unknown }).__env__ = env;
      const rssResponse = await handleRssFeedRequest(request);
      if (rssResponse) return rssResponse;

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
  async scheduled(_controller: unknown, env: unknown, ctx: { waitUntil?: (promise: Promise<unknown>) => void }) {
    (globalThis as typeof globalThis & { __env__?: unknown }).__env__ = env;
    if (serverEnv("WEB_PUSH_ENABLED") !== "true") return;
    const { dispatchPendingPushJobs } = await import("./lib/push-dispatcher.server");
    const work = dispatchPendingPushJobs(25).catch((error) => console.error("Web Push dispatch failed", error));
    if (ctx.waitUntil) ctx.waitUntil(work);
    else await work;
  },
};
