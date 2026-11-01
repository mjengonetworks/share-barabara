import test from "node:test";
import assert from "node:assert/strict";
import { prepareProductionWranglerConfig } from "../scripts/production-deploy-config.mjs";

test("production Wrangler config removes staging environment only", () => {
  const result = prepareProductionWranglerConfig({
    name: "share-barabara",
    env: { staging: { name: "share-barabara-staging" } },
    vars: { DEPLOYMENT_ENV: "production" },
    routes: [{ pattern: "sharebarabara.co.ke" }],
    assets: { binding: "ASSETS", directory: "../public" },
  });

  assert.equal(result.env, undefined);
  assert.deepEqual(result.vars, { DEPLOYMENT_ENV: "production" });
  assert.deepEqual(result.routes, [{ pattern: "sharebarabara.co.ke" }]);
  assert.deepEqual(result.assets, { binding: "ASSETS", directory: "../public" });
});
