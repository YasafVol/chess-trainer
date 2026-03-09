import { ANALYSIS_POLICY } from "./analysisPolicy.js";

export type AnalysisStep = {
  ply: number;
  depth: number;
};

export function buildAnalysisPlan(
  totalPlies: number,
  movesSan: string[],
  defaultDepth: number = ANALYSIS_POLICY.defaultDepth
): AnalysisStep[] {
  const steps: AnalysisStep[] = [];

  if (totalPlies <= 200) {
    for (let ply = 0; ply <= totalPlies; ply++) {
      steps.push({ ply, depth: defaultDepth });
    }
    return steps;
  }

  if (totalPlies <= 300) {
    for (let ply = 0; ply <= totalPlies; ply++) {
      if (ply % 2 === 0 || ply === totalPlies) {
        steps.push({ ply, depth: ANALYSIS_POLICY.longGameDepth });
      }
    }
    return steps;
  }

  for (let ply = 0; ply <= totalPlies; ply++) {
    const nextMove = movesSan[ply];
    const keyPosition = !!nextMove && (nextMove.includes("x") || nextMove.includes("+") || nextMove.includes("#"));
    if (ply % 4 === 0 || keyPosition || ply === totalPlies) {
      steps.push({ ply, depth: ANALYSIS_POLICY.veryLongGameDepth });
    }
  }
  return steps;
}

export function lowerDepthForRetry(depth: number): number {
  return Math.max(ANALYSIS_POLICY.retryMinDepth, depth - ANALYSIS_POLICY.retryDepthStep);
}
