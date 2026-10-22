import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";
import path from "node:path";

const root = process.cwd();
const quickSummaryId = "172d7824b28b72fcb30d1cc4ff9e7e088d94a8beff15edae7ee51fc4b4741e2e";

test("deployable Worker artifacts register the Quick AI server function ID", async () => {
  const serverDir = path.join(root, ".output", "server");
  const publicDir = path.join(root, ".output", "public", "assets");
  const serverFiles = await readdir(serverDir);
  const serverEntryName = "index.mjs";
  const serverEntry = (await readFile(path.join(serverDir, serverEntryName), "utf8")).replace("./_ssr/index.mjs", "./_ssr/ssr.mjs");
  const ssrDir = path.join(serverDir, "_ssr");
  const ssrFiles = await readdir(ssrDir);
  const serverModules = await Promise.all(
    [
      ...serverFiles.filter((name) => name.endsWith(".mjs")).map((name) => path.join(serverDir, name)),
      ...ssrFiles.filter((name) => name.endsWith(".mjs")).map((name) => path.join(ssrDir, name)),
    ].map((file) => readFile(file, "utf8")),
  );
  const clientAssets = await Promise.all(
    (await readdir(publicDir)).filter((name) => name.endsWith(".js")).map((name) => readFile(path.join(publicDir, name), "utf8")),
  );

  const resolverName = serverFiles.find((name) => name.startsWith("__23tanstack-start-server-fn-resolver-") && name.endsWith(".mjs"));
  const registrySources = resolverName
    ? [await readFile(path.join(serverDir, resolverName), "utf8")]
    : serverModules;
  assert.ok(
    registrySources.some((source) => source.includes(`"${quickSummaryId}"`) && source.includes("quickAISummary_createServerFn_handler")),
    "the deployable SSR runtime must register the Quick AI server function",
  );
  assert.ok(serverModules.some((source) => source.includes(`"${quickSummaryId}"`)), "server modules must reference the registered Quick AI ID");
  assert.match(serverEntry, /import\(\"\.\/\_ssr\/ssr\.mjs\"\)/, "the Worker entrypoint must import the TanStack Start server runtime");
  assert.match(serverEntry, /_ssr\/(?:ssr|index)\.mjs/, "the Worker entrypoint must import the TanStack Start server runtime");
  assert.ok(clientAssets.some((source) => source.includes(quickSummaryId)), "the client artifact must call the same Quick AI ID");
});
