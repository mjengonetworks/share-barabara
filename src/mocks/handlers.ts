import { http, HttpResponse } from "msw";
import { store, nextId, nowIso } from "./db";

const SUPABASE_URL = (import.meta.env["VITE_SUPABASE_URL"] as string | undefined)?.replace(/\/$/, "");
const MOCKED_TABLES = new Set(Object.keys(store));

type Row = Record<string, unknown>;

function applyFilter(row: Row, column: string, raw: string): boolean {
  const [op, ...rest] = raw.split(".");
  const value = rest.join(".");
  const actual = row[column];
  switch (op) {
    case "eq":
      return String(actual) === value;
    case "neq":
      return String(actual) !== value;
    case "is":
      return value === "null" ? actual === null || actual === undefined : String(actual) === value;
    case "in": {
      const list = value.replace(/^\(|\)$/g, "").split(",");
      return list.includes(String(actual));
    }
    case "ilike":
    case "like": {
      const pattern = value.replace(/^\*|\*$/g, "").toLowerCase();
      return String(actual ?? "").toLowerCase().includes(pattern.replace(/%/g, ""));
    }
    case "gt":
      return Number(actual) > Number(value);
    case "gte":
      return Number(actual) >= Number(value);
    case "lt":
      return Number(actual) < Number(value);
    case "lte":
      return Number(actual) <= Number(value);
    default:
      return true;
  }
}

function queryTable(table: string, params: URLSearchParams): Row[] {
  let rows = [...(store[table] ?? [])];
  for (const [key, value] of params.entries()) {
    if (["select", "order", "limit", "offset"].includes(key)) continue;
    rows = rows.filter((r) => applyFilter(r, key, value));
  }
  const order = params.get("order");
  if (order) {
    const [col, dir] = order.split(".");
    rows.sort((a, b) => {
      const av = a[col as string] as string | number;
      const bv = b[col as string] as string | number;
      if (av === bv) return 0;
      const cmp = av > bv ? 1 : -1;
      return dir === "desc" ? -cmp : cmp;
    });
  }
  const limit = params.get("limit");
  if (limit) rows = rows.slice(0, Number(limit));
  return rows;
}

function wantsSingleObject(request: Request): boolean {
  return (request.headers.get("accept") ?? "").includes("vnd.pgrst.object");
}

export const handlers = SUPABASE_URL
  ? [
      http.get(`${SUPABASE_URL}/rest/v1/:table`, ({ request, params }) => {
        const table = params["table"] as string;
        if (!MOCKED_TABLES.has(table)) return undefined;
        const url = new URL(request.url);
        const rows = queryTable(table, url.searchParams);
        if (wantsSingleObject(request)) {
          return HttpResponse.json(rows[0] ?? null);
        }
        return HttpResponse.json(rows);
      }),

      http.post(`${SUPABASE_URL}/rest/v1/rpc/trending_news`, async () => {
        const rows = (store["news"] ?? []).filter((r) => r["status"] === "published");
        return HttpResponse.json(rows.slice(0, 6));
      }),

      http.post(`${SUPABASE_URL}/rest/v1/:table`, async ({ request, params }) => {
        const table = params["table"] as string;
        if (!MOCKED_TABLES.has(table)) return undefined;
        const body = (await request.json()) as Row | Row[];
        const items = Array.isArray(body) ? body : [body];
        const created = items.map((item) => {
          const row: Row = { id: nextId(), created_at: nowIso(), ...item };
          store[table]!.push(row);
          return row;
        });
        return HttpResponse.json(created, { status: 201 });
      }),

      http.patch(`${SUPABASE_URL}/rest/v1/:table`, async ({ request, params }) => {
        const table = params["table"] as string;
        if (!MOCKED_TABLES.has(table)) return undefined;
        const url = new URL(request.url);
        const patch = (await request.json()) as Row;
        const rows = store[table] ?? [];
        const updated: Row[] = [];
        for (const row of rows) {
          const matches = [...url.searchParams.entries()]
            .filter(([k]) => !["select", "order", "limit", "offset"].includes(k))
            .every(([k, v]) => applyFilter(row, k, v));
          if (matches) {
            Object.assign(row, patch, { updated_at: nowIso() });
            updated.push(row);
          }
        }
        return HttpResponse.json(updated);
      }),

      http.delete(`${SUPABASE_URL}/rest/v1/:table`, ({ request, params }) => {
        const table = params["table"] as string;
        if (!MOCKED_TABLES.has(table)) return undefined;
        const url = new URL(request.url);
        const rows = store[table] ?? [];
        const remaining = rows.filter(
          (row) =>
            ![...url.searchParams.entries()]
              .filter(([k]) => !["select", "order", "limit", "offset"].includes(k))
              .every(([k, v]) => applyFilter(row, k, v)),
        );
        store[table] = remaining;
        return HttpResponse.json({});
      }),

      // Grant the currently signed-in user admin so the review queue and
      // editor-only UI are reachable while testing, without touching the
      // real user_roles table.
      http.get(`${SUPABASE_URL}/rest/v1/user_roles`, ({ request }) => {
        const url = new URL(request.url);
        const eqUserId = url.searchParams.get("user_id");
        const userId = eqUserId?.startsWith("eq.") ? eqUserId.slice(3) : null;
        if (!userId) return undefined;
        return HttpResponse.json([{ id: nextId(), user_id: userId, role: "admin" }]);
      }),
    ]
  : [];
