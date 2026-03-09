export const ANALYSIS_POLICY = {
  defaultDepth: 16,
  longGameDepth: 14,
  veryLongGameDepth: 12,
  retryDepthStep: 2,
  retryMinDepth: 8,
  defaultMultiPV: 1,
  defaultThreadsMobile: 1,
  defaultHashMbMobile: 16,
  longGameMinPlies: 201,
  veryLongGameMinPlies: 301,
  softPerPositionMaxMs: 1200,
  foregroundBudgetMs: 60_000
} as const;

export function classifyGameLength(totalPlies: number): "normal" | "long" | "very-long" {
  if (totalPlies >= ANALYSIS_POLICY.veryLongGameMinPlies) return "very-long";
  if (totalPlies >= ANALYSIS_POLICY.longGameMinPlies) return "long";
  return "normal";
}
