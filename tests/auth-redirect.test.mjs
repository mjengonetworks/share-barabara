import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const moduleUrl = (source) => `data:text/javascript;base64,${Buffer.from(ts.transpile(source, { module: ts.ModuleKind.ESNext })).toString("base64")}`;
const safeUrl = moduleUrl(readFileSync("src/lib/ai/return-to-ai.ts", "utf8"));
const source = readFileSync("src/lib/auth-redirect.ts", "utf8").replace('"./ai/return-to-ai"', JSON.stringify(safeUrl));
const { authCallbackUrl, rememberAuthReturnTo, consumeAuthReturnTo } = await import(moduleUrl(source));
const { safeInternalReturnTo } = await import(safeUrl);
const storage = () => {
  const items = new Map();
  return { getItem: (key) => items.get(key) ?? null, setItem: (key, value) => items.set(key, value), removeItem: (key) => items.delete(key) };
};

for (const origin of ["https://staging.sharebarabara.co.ke", "https://sharebarabara.co.ke"]) {
  test(`${origin}: login and restored sessions remain on their deployment`, () => {
    assert.equal(new URL(consumeAuthReturnTo(storage()), origin).origin, origin);
  });
  test(`${origin}: Google OAuth and signup use exact allowlisted callback`, () => {
    assert.equal(authCallbackUrl(origin), `${origin}/auth`);
    assert.equal(new URL(authCallbackUrl(origin)).search, "");
  });
  test(`${origin}: password recovery uses exact reset callback`, () => {
    assert.equal(authCallbackUrl(origin, true), `${origin}/auth/reset`);
  });
  test(`${origin}: protected return survives OAuth and is consumed once`, () => {
    const store = storage();
    const destination = "/settings?tab=alerts#preferences";
    rememberAuthReturnTo(store, destination);
    const result = consumeAuthReturnTo(store);
    assert.equal(result, destination);
    assert.equal(new URL(result, origin).origin, origin);
    assert.equal(consumeAuthReturnTo(store), "/dashboard");
  });
}

test("reject open redirects in both search parameters and stored destinations", () => {
  for (const value of ["https://evil.example", "https://sharebarabara.co.ke", "//evil.example", "/\\evil.example", "/%2Fevil.example", "/%5Cevil.example", "/\nevil.example", "/auth", "/auth/reset", "/bad%escape"]) {
    assert.equal(safeInternalReturnTo(value), undefined, value);
    const store = storage();
    store.setItem("sb_auth_return_to", value);
    assert.equal(consumeAuthReturnTo(store, value), "/dashboard", value);
  }
});

test("current validated return takes precedence and new default login clears stale returns", () => {
  const store = storage();
  rememberAuthReturnTo(store, "/settings");
  assert.equal(consumeAuthReturnTo(store, "/feed#chat"), "/feed#chat");
  rememberAuthReturnTo(store, "/settings");
  rememberAuthReturnTo(store, undefined);
  assert.equal(consumeAuthReturnTo(store), "/dashboard");
});

test("auth flows and protected routes are wired to the safe helpers", () => {
  const auth = readFileSync("src/routes/auth.index.tsx", "utf8");
  assert.match(auth, /emailRedirectTo: confirmation/);
  assert.match(auth, /provider: "google",\s+options: \{ redirectTo: callback \}/);
  assert.match(auth, /redirectTo: authCallbackUrl\(window.location.origin, true\)/);
  assert.match(auth, /window.location.replace\(consumeAuthReturnTo\(sessionStorage, returnTo\)\)/);
  assert.doesNotMatch(auth, /searchParams.set/);
  const guard = readFileSync("src/routes/_authenticated/route.tsx", "utf8");
  assert.match(guard, /returnTo: safeInternalReturnTo\(location.href\)/);
});
