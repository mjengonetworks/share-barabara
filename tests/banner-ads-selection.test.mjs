import assert from "node:assert/strict";
import test from "node:test";
import { selectEligibleBannerAds } from "../src/lib/banner-ads.ts";

const now = Date.parse("2026-10-29T09:00:00.000Z");

test("advertising selection excludes inactive and expired ads", () => {
  const selected = selectEligibleBannerAds(
    [
      { link_url: "https://expired.example", placement: "home", ends_at: "2026-10-28T23:59:00Z" },
      { link_url: "https://inactive.example", placement: "home", active: false },
      { link_url: "https://live.example", placement: "home" },
    ],
    "home",
    now,
  );
  assert.deepEqual(selected.map((ad) => ad.link_url), ["https://live.example"]);
});

test("exact placement wins, then priority orders valid fallback inventory", () => {
  const selected = selectEligibleBannerAds(
    [
      { link_url: "https://default-high.example", placement: "site-default", priority: 100 },
      { link_url: "https://exact-low.example", placement: "home", priority: 1 },
      { link_url: "https://other.example", placement: "reports", priority: 999 },
    ],
    "home",
    now,
  );
  assert.deepEqual(selected.map((ad) => ad.link_url), ["https://exact-low.example", "https://default-high.example"]);
});

test("unsafe destinations are excluded so the caller can render the Partner fallback", () => {
  const selected = selectEligibleBannerAds(
    [{ link_url: "javascript:alert(1)", placement: "home" }],
    "home",
    now,
  );
  assert.equal(selected.length, 0);
});
