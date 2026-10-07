import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const buildResult = spawnSync(process.execPath, ["scripts/build-staging.mjs"], { stdio: "inherit" });
if (buildResult.status !== 0) process.exit(buildResult.status ?? 1);

const generatedConfig = ".output/server/wrangler.json";
const config = JSON.parse(await readFile(generatedConfig, "utf8"));

config.name = "share-barabara-staging";
config.vars = { ...(config.vars ?? {}), DEPLOYMENT_ENV: "staging", WEB_PUSH_ENABLED: "false" };
delete config.triggers;
config.routes = [{
  pattern: "staging.sharebarabara.co.ke",
  zone_name: "sharebarabara.co.ke",
  custom_domain: true,
  enabled: true,
  previews_enabled: false,
}];

await writeFile(generatedConfig, `${JSON.stringify(config, null, 2)}\n`);

const nitroCommand = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(nitroCommand, ["nitro", "deploy", "--prebuilt"], { stdio: "inherit" });
if (result.status !== 0) process.exit(result.status ?? 1);
