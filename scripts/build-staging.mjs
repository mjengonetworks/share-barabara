import { spawnSync } from "node:child_process";
import { writeFile } from "node:fs/promises";

const nodeResult = spawnSync(process.execPath, ["node_modules/vite/bin/vite.js", "build", "--mode", "static"], {
  stdio: "inherit",
  env: { ...process.env, VITE_DEPLOYMENT_ENV: "staging", VITE_WEB_PUSH_ENABLED: "false" },
});

if (nodeResult.status !== 0) process.exit(nodeResult.status ?? 1);

await writeFile(".output/public/robots.txt", "User-agent: *\nDisallow: /\n");
