export function prepareProductionWranglerConfig(config) {
  const productionConfig = { ...config };
  delete productionConfig.env;
  return productionConfig;
}
