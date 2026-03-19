import type { AnalysisCoordinatorConfig } from "./types.js";

export const ANALYSIS_COORDINATOR_INTERVAL_MIN_MS = 5_000;
export const ANALYSIS_COORDINATOR_INTERVAL_MAX_MS = 300_000;
export const ANALYSIS_COORDINATOR_CONFIG_DEFAULTS: AnalysisCoordinatorConfig = {
  enabled: true,
  intervalMs: 30_000
};

export function normalizeAnalysisCoordinatorConfig(
  input: Partial<AnalysisCoordinatorConfig> | null | undefined
): AnalysisCoordinatorConfig {
  const enabled = typeof input?.enabled === "boolean"
    ? input.enabled
    : ANALYSIS_COORDINATOR_CONFIG_DEFAULTS.enabled;
  const rawInterval = typeof input?.intervalMs === "number"
    ? input.intervalMs
    : ANALYSIS_COORDINATOR_CONFIG_DEFAULTS.intervalMs;
  const intervalMs = Math.min(
    ANALYSIS_COORDINATOR_INTERVAL_MAX_MS,
    Math.max(ANALYSIS_COORDINATOR_INTERVAL_MIN_MS, Math.round(rawInterval))
  );

  return {
    enabled,
    intervalMs
  };
}
