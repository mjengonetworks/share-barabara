import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = async (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("subscription product prices use the locked annual Profile/Page prices", async () => {
  const text = await source("src/lib/subscriptions.ts");
  for (const expected of ["amountKes: 100", "amountKes: 500", "amountKes: 2000"]) {
    assert.match(text, new RegExp(expected));
  }
  assert.match(text, /SUBSCRIPTION_BILLING_PERIOD = "annual"/);
  assert.match(text, /subject: "profile"/);
  assert.match(text, /subject: "page"/);
});

test("subscription presentation does not equate paid badges with earned reputation", async () => {
  const text = await source("src/routes/subscribe.tsx");
  assert.match(text, /paid subscription badges/);
  assert.match(text, /earned reputation level/);
  assert.doesNotMatch(text, /1 USD a year/);
  assert.doesNotMatch(text, /10 USD per year/);
});

test("subscription helpers keep price, tier, status, and ownership server-authoritative", async () => {
  const text = await source("src/lib/subscriptions.ts");
  assert.match(text, /getSubscriptionProduct/);
  assert.match(text, /isSubscriptionTier/);
  assert.match(text, /subscriptionStatus/);
  assert.match(text, /canManagePageSubscription/);
  assert.match(text, /value === "blue" \|\| value === "gold"/);
  assert.match(text, /row\.active/);
  assert.match(text, /expires_at/);
  assert.match(text, /actorId === pageOwnerId/);
});

test("subscription states include the required lifecycle vocabulary without faking persistence", async () => {
  const text = await source("src/lib/subscriptions.ts");
  for (const status of ["free", "pending", "active", "expired", "cancelled", "failed"]) {
    assert.match(text, new RegExp(`\\"${status}\\"`));
  }
  assert.match(text, /existing table has no status column/);
});

test("paid entitlement requires active and unexpired state, never reputation level", async () => {
  const text = await source("src/lib/subscriptions.ts");
  assert.match(text, /subscriptionStatus\(row, now\) === "active"/);
  assert.doesNotMatch(text, /levelForPoints|badgeForPoints/);
});
