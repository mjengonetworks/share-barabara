import { spawnSync } from "node:child_process";

const env = {
  ...process.env,
  VITE_DEPLOYMENT_ENV: "production",
  VITE_WEB_PUSH_ENABLED: "true",
};
const result = spawnSync(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "build", "--mode", "static"],
  {
    stdio: "inherit",
    env,
  },
);
process.exit(result.status ?? 1);
