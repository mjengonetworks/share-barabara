import { spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { prepareProductionWranglerConfig } from "./production-deploy-config.mjs";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const build = spawnSync(npmCommand, ["run", "build"], { stdio: "inherit", shell: false });
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
