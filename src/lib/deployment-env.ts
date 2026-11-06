export type DeploymentEnvironment = "production" | "staging" | "staging-preview";

const configuredEnvironment = import.meta.env.VITE_DEPLOYMENT_ENV;

export const deploymentEnvironment: DeploymentEnvironment =
  configuredEnvironment === "staging-preview"
    ? "staging-preview"
    : configuredEnvironment === "staging"
      ? "staging"
      : "production";

export const isStaging = deploymentEnvironment === "staging";
export const isIsolatedStagingPreview = deploymentEnvironment === "staging-preview";
