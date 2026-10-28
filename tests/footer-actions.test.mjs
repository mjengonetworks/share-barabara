import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return fs.readFile(path, "utf8");
}

test("newsletter Subscribe uses the existing light-blue hover color by default", async () => {
  const newsletter = await source("src/components/site/newsletter-form.tsx");
  const button = await source("src/components/ui/button.tsx");
  assert.match(newsletter, /variant === "gold" \? "w-full bg-brand-blue text-white hover:bg-brand-navy"/);
  assert.match(newsletter, /<Button[\s\S]*type="submit"/);
  assert.match(button, /focus-visible:ring/);
  assert.match(newsletter, /newsletter_subscribers/);
  assert.match(newsletter, /setValidationError\("Enter a valid email address\."\)/);
  assert.match(newsletter, /subscribe\.mutate\(\)/);
});

test("footer keeps one premium action and places submission actions under emergency numbers", async () => {
  const footer = await source("src/components/site/site-footer.tsx");
  assert.equal((footer.match(/Subscribe to Premium/g) ?? []).length, 1);
  assert.match(footer, /Emergency numbers[\s\S]*Subscribe to Premium[\s\S]*Submit an Alert[\s\S]*Submit a Report/);
  assert.match(footer, /w-full justify-start bg-accent text-accent-foreground/);
  assert.match(footer, /w-full justify-start border border-caution\/60/);
  assert.match(footer, /w-full justify-start border border-brand-blue\/60/);
  assert.match(footer, /alreadySubscribed/);
});

test("footer submission actions reuse public forms and preserve signed-out return targets", async () => {
  const footer = await source("src/components/site/site-footer.tsx");
  const alerts = await source("src/routes/alerts.index.tsx");
  const reports = await source("src/routes/reports.index.tsx");
  const auth = await source("src/routes/auth.index.tsx");

  assert.match(footer, /<Link to="\/alerts" hash="alert-form">/);
  assert.match(footer, /<Link to="\/reports" hash="report-form">/);
  assert.match(footer, /to="\/auth" search=\{\{ returnTo: "\/alerts#alert-form" \}\}/);
  assert.match(footer, /to="\/auth" search=\{\{ returnTo: "\/reports#report-form" \}\}/);
  assert.match(alerts, /id="alert-form"/);
  assert.match(reports, /id="report-form"/);
  assert.match(alerts, /user \? \(/);
  assert.match(reports, /user \? \(/);
  assert.match(auth, /const returnTo = safeInternalReturnTo\(search\["returnTo"\]\)/);
  assert.match(auth, /if \(returnTo\) window\.location\.assign\(returnTo\)/);
});

test("footer actions remain touch-friendly and contained on narrow layouts", async () => {
  const footer = await source("src/components/site/site-footer.tsx");
  assert.match(footer, /grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-5/);
  assert.equal((footer.match(/w-full justify-start/g) ?? []).length, 3);
  assert.match(footer, /space-y-2/);
});
