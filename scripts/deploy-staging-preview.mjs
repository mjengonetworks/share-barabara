import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

if (process.env.STAGING_PREVIEW_DEPLOY !== "1") throw new Error("Refusing staging preview deployment. Set STAGING_PREVIEW_DEPLOY=1 after owner approval.");
const generatedConfig = ".output/server/wrangler.json";
const config = JSON.parse(await readFile(generatedConfig, "utf8"));
config.name = "share-barabara-staging";
config.vars = { ...(config.vars ?? {}), DEPLOYMENT_ENV: "staging-preview", WEB_PUSH_ENABLED: "false" };
delete config.triggers;
config.routes = [{ pattern: "staging.sharebarabara.co.ke", zone_name: "sharebarabara.co.ke", custom_domain: true, enabled: true, previews_enabled: false }];
await writeFile(generatedConfig, `${JSON.stringify(config, null, 2)}\n`);
const wranglerCommand = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(wranglerCommand, ["wrangler", "deploy", "--config", generatedConfig, "--message", "synthetic-media-feed-preview"], { stdio: "inherit", shell: process.platform === "win32" });
if (result.status !== 0) process.exit(result.status ?? 1);
