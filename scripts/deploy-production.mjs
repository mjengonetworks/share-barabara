import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { prepareProductionWranglerConfig } from "./production-deploy-config.mjs";

const configPath = ".output/server/wrangler.json";
const config = JSON.parse(await readFile(configPath, "utf8"));
await writeFile(configPath, `${JSON.stringify(prepareProductionWranglerConfig(config), null, 2)}\n`);

const wranglerCommand = process.platform === "win32" ? process.env.ComSpec : "npx";
const wranglerArgs = process.platform === "win32"
  ? ["/d", "/s", "/c", `npx wrangler deploy --config ${configPath} --message production-release`]
  : ["wrangler", "deploy", "--config", configPath, "--message", "production-release"];
const deploy = spawnSync(wranglerCommand, wranglerArgs, {
  stdio: "inherit",
  shell: false,
});
process.exit(deploy.status ?? 1);
