import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("all five editorial listing edit actions use dedicated full-page routes", async () => {
  const files = [
    "src/routes/_authenticated/admin/articles.tsx",
    "src/routes/_authenticated/admin/alerts.tsx",
    "src/routes/_authenticated/admin/reports.tsx",
    "src/routes/_authenticated/admin/campaigns.tsx",
    "src/routes/_authenticated/admin/infrastructure-issues.tsx",
  ];
  for (const file of files) {
    const source = await read(file);
    assert.match(source, /href=\{`\/admin\/[^`]+\/edit`\}/, file);
  }
});

test("the shared editor preserves media metadata for every editable record type", async () => {
  const editor = await read("src/components/admin/editorial-record-editor.tsx");
  for (const field of ["image_url", "image_alt", "image_caption", "image_credit"]) assert.match(editor, new RegExp(field), field);
  assert.match(editor, /Existing values and media remain intact/);
  assert.match(await read("src/components/site/image-upload-field.tsx"), /Replace image/);
});

test("admin workspace exposes role-aware header, search, logout and owned content", async () => {
  const route = await read("src/routes/_authenticated/admin/route.tsx");
  assert.match(route, /AdminGlobalSearch/);
  assert.match(route, /supabase\.auth\.signOut/);
  assert.match(route, /primaryRoleLabel/);
  assert.match(route, /\/admin\/my-content/);
  const search = await read("src/components/admin/admin-global-search.tsx");
  assert.match(search, /No authorised matches/);
  const content = await read("src/routes/_authenticated/admin/my-content.tsx");
  assert.match(content, /author_id/);
  assert.match(content, /user_id/);
  assert.match(content, /feed_posts/);
  assert.match(content, /videos/);
});

test("editorial listing rows expose separated management-table columns", async () => {
  const expectations = [
    ["articles.tsx", ["Title", "Category", "Status", "Author", "Views", "Created"]],
    ["alerts.tsx", ["Image", "Alert", "County", "Severity", "Status", "Reported by", "Views", "Posted"]],
    ["reports.tsx", ["Title", "Location", "Severity", "Status", "Author", "Created"]],
    ["campaigns.tsx", ["Title", "Location", "Status", "Dates", "Actions"]],
    ["infrastructure-issues.tsx", ["Title", "Issue type", "Location", "Status", "Author", "Created"]],
  ];
  for (const [file, labels] of expectations) {
    const source = await read(`src/routes/_authenticated/admin/${file}`);
    for (const label of labels) assert.match(source, new RegExp(label), `${file}: ${label}`);
  }
  const surface = await read("src/components/admin/admin-listing-surface.tsx");
  assert.match(surface, /xl:grid/);
});

test("global admin search includes authorised editorial sources and admin destinations", async () => {
  const source = await read("src/components/admin/admin-global-search.tsx");
  for (const value of ["news", "accident_reports", "alerts", "campaigns", "infrastructure_issues", "feed_posts", "profiles", "Taxonomy"]) assert.match(source, new RegExp(value), value);
});

test("Alerts listing has all rendered action imports and controls", async () => {
  const source = await read("src/routes/_authenticated/admin/alerts.tsx");
  assert.match(source, /import \{[^}]*Pencil[^}]*\} from "lucide-react"/);
  assert.match(source, /aria-label="More actions"/);
  assert.match(source, /\/admin\/alerts\/\$\{a\.id\}\/edit/);
});

test("custom listing layouts keep direct Edit and Options controls visible", async () => {
  for (const file of ["articles.tsx", "reports.tsx", "campaigns.tsx", "infrastructure-issues.tsx"]) {
    const source = await read(`src/routes/_authenticated/admin/${file}`);
    assert.match(source, /aria-label="More actions"/, file);
    assert.match(source, /\/admin\/[^`]+\/\$\{[^}]+\}\/edit/, file);
    assert.match(source, /xl:grid-cols-\[auto_56px/, file);
  }
});

test("My Content remains an ownership-aware admin route", async () => {
  const route = await read("src/routes/_authenticated/admin/my-content.tsx");
  assert.match(route, /createFileRoute\("\/_authenticated\/admin\/my-content"\)/);
  assert.match(route, /AdminPageHeader/);
  assert.match(route, /\.eq\(source\.owner, user!\.id\)/);
  assert.doesNotMatch(route, /\/profile/);
});

test("the actual Add Accident Report form exposes AI outside collapsed details", async () => {
  const reportForm = await read("src/components/site/report-form.tsx");
  const aiPanel = reportForm.indexOf('aria-label="Accident report Editorial AI"');
  const details = reportForm.indexOf("<Collapsible>");
  assert.ok(aiPanel >= 0);
  assert.ok(aiPanel < details);
  assert.match(reportForm, /mode: "generate", provider: "grok"/);
  assert.match(reportForm, /mode: "autopopulate", provider: "groq"/);
  assert.match(reportForm, /mode: "autopopulate", provider: "grok"/);
});

test("report editor owns structured accident fields and same-record update", async () => {
  const editor = await read("src/components/admin/editorial-record-editor.tsx");
  for (const field of ["incident_type", "occurred_at", "latitude", "longitude", "vehicles_involved", "casualties", "fatalities", "parties_involved", "casualty_breakdown", "attachments"]) assert.match(editor, new RegExp(field), field);
  assert.match(editor, /type === "report"/);
  assert.match(editor, /\.update\(payload\).*eq\("id", id\)/s);
});

test("all editorial listing parents delegate edit URLs to the child editor", async () => {
  const routes = [
    ["articles.tsx", "articles"],
    ["alerts.tsx", "alerts"],
    ["reports.tsx", "reports"],
    ["campaigns.tsx", "campaigns"],
    ["infrastructure-issues.tsx", "infrastructure-issues"],
  ];
  for (const [file, segment] of routes) {
    const source = await read(`src/routes/_authenticated/admin/${file}`);
    assert.match(source, /Outlet/ , file);
    assert.match(source, new RegExp(`admin\\/${segment}\\/`), file);
    assert.match(source, /return <Outlet \/>/, file);
    assert.match(source, /useRouterState/, file);
  }
  const editor = await read("src/components/admin/editorial-record-editor.tsx");
  assert.match(editor, /recordQuery\.error/);
  assert.match(editor, /Unable to load this/);
});
