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
  const resolverName = serverFiles.find((name) => name.startsWith("__23tanstack-start-server-fn-resolver-") && name.endsWith(".mjs"));
  const serverEntryName = "index.mjs";
  assert.ok(resolverName, "the TanStack Start server-function resolver must be emitted");

  const resolver = await readFile(path.join(serverDir, resolverName), "utf8");
  const serverEntry = await readFile(path.join(serverDir, serverEntryName), "utf8");
  const serverModules = await Promise.all(
    serverFiles.filter((name) => name.endsWith(".mjs")).map((name) => readFile(path.join(serverDir, name), "utf8")),
  );
  const clientAssets = await Promise.all(
    (await readdir(publicDir)).filter((name) => name.endsWith(".js")).map((name) => readFile(path.join(publicDir, name), "utf8")),
  );

  assert.match(resolver, new RegExp(`"${quickSummaryId}":[\\s\\S]*quickAISummary_createServerFn_handler`));
  assert.ok(serverModules.some((source) => source.includes(`"${quickSummaryId}"`)), "server modules must reference the registered Quick AI ID");
  assert.match(serverEntry, /import\(\"\.\/\_ssr\/ssr\.mjs\"\)/, "the Worker entrypoint must import the TanStack Start server runtime");
  assert.ok(clientAssets.some((source) => source.includes(quickSummaryId)), "the client artifact must call the same Quick AI ID");
});
