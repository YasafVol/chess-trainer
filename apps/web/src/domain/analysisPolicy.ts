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
  perPlyTimeMultiplier: 1.7,
  totalBudgetBuffer: 1.15,
  emergencyHardCapMs: 300_000
} as const;

export type AnalysisBudgetPolicy = {
  softPerPositionMaxMs: number;
  perPlyTimeMultiplier: number;
  totalBudgetBuffer: number;
  emergencyHardCapMs: number;
};

export function classifyGameLength(totalPlies: number): "normal" | "long" | "very-long" {
  if (totalPlies >= ANALYSIS_POLICY.veryLongGameMinPlies) return "very-long";
  if (totalPlies >= ANALYSIS_POLICY.longGameMinPlies) return "long";
  return "normal";
}

export function computeExpectedPerPlyMs(
  policy: AnalysisBudgetPolicy = ANALYSIS_POLICY
): number {
  return Math.ceil(policy.softPerPositionMaxMs * policy.perPlyTimeMultiplier);
}

export function computeForegroundBudgetMs(
  totalPlies: number,
  policy: AnalysisBudgetPolicy = ANALYSIS_POLICY
): number {
  const effectivePlies = Math.max(1, totalPlies);
  const expectedPerPlyMs = computeExpectedPerPlyMs(policy);
  const derivedBudgetMs = Math.ceil(effectivePlies * expectedPerPlyMs * policy.totalBudgetBuffer);

  return Math.min(derivedBudgetMs, policy.emergencyHardCapMs);
}
