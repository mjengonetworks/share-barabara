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
      const requestUrl = new URL(request.url);
      if (requestUrl.pathname === "/api/web-push-config" && request.method === "GET") {
        const enabled = serverEnv("WEB_PUSH_ENABLED") === "true";
        const publicKey = serverEnv("WEB_PUSH_VAPID_PUBLIC_KEY") ?? "";
        const subject = serverEnv("WEB_PUSH_VAPID_SUBJECT") ?? "";
        const subjectValid = /^(https:|mailto:)/i.test(subject);
        return Response.json(
          { enabled: enabled && Boolean(publicKey) && subjectValid, publicKey: enabled && publicKey ? publicKey : null, subjectValid },
          { headers: { "cache-control": "no-store" } },
        );
      }
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
    const work = Promise.allSettled([
      ...(serverEnv("WEB_PUSH_ENABLED") === "true" ? [import("./lib/push-dispatcher.server").then(({ dispatchPendingPushJobs }) => dispatchPendingPushJobs(25))] : []),
      import("./lib/incident-monitor.server").then(({ runDueIncidentMonitorSources }) => runDueIncidentMonitorSources(3)),
    ]).then((results) => { for (const result of results) if (result.status === "rejected") console.error("Scheduled operations failed", result.reason); });
    if (ctx.waitUntil) ctx.waitUntil(work);
    else await work;
  },
};
