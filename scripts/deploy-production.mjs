import { spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { prepareProductionWranglerConfig } from "./production-deploy-config.mjs";

const buildCommand = process.platform === "win32" ? process.env.ComSpec : "npm";
const buildArgs = process.platform === "win32" ? ["/d", "/s", "/c", "npm run build"] : ["run", "build"];
const build = spawnSync(buildCommand, buildArgs, { stdio: "inherit", shell: false });
if (build.status !== 0) process.exit(build.status ?? 1);

const configPath = ".output/server/wrangler.json";
const config = JSON.parse(await readFile(configPath, "utf8"));
await writeFile(configPath, `${JSON.stringify(prepareProductionWranglerConfig(config), null, 2)}\n`);

const wrangler = process.platform === "win32" ? "npx.cmd" : "npx";
const deploy = spawnSync(wrangler, ["wrangler", "deploy", "--config", configPath, "--message", "production-release"], {
  stdio: "inherit",
  shell: false,
});
process.exit(deploy.status ?? 1);
