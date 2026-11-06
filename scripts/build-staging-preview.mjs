import { spawnSync } from "node:child_process";

const env = { ...process.env };
for (const key of ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_PROJECT_ID", "SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SERVICE_ROLE_KEY"]) env[key] = "";
env.VITE_DEPLOYMENT_ENV = "staging-preview";
env.VITE_WEB_PUSH_ENABLED = "false";
const result = spawnSync(process.execPath, ["node_modules/vite/bin/vite.js", "build", "--mode", "static"], { stdio: "inherit", env });
if (result.status !== 0) process.exit(result.status ?? 1);
