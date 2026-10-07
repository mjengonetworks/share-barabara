export type DeploymentEnvironment = "production" | "staging";

const configuredEnvironment = import.meta.env.VITE_DEPLOYMENT_ENV;

export const deploymentEnvironment: DeploymentEnvironment =
  configuredEnvironment === "staging" ? "staging" : "production";

export const isStaging = deploymentEnvironment === "staging";
