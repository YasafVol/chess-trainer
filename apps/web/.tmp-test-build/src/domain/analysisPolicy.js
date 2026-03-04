export const ANALYSIS_POLICY = {
    defaultDepth: 16,
    defaultMultiPV: 1,
    defaultThreadsMobile: 1,
    defaultHashMbMobile: 16,
    longGameMinPlies: 201,
    veryLongGameMinPlies: 301,
    softPerPositionMaxMs: 1200,
    foregroundBudgetMs: 60000
};
export function classifyGameLength(totalPlies) {
    if (totalPlies >= ANALYSIS_POLICY.veryLongGameMinPlies)
        return "very-long";
    if (totalPlies >= ANALYSIS_POLICY.longGameMinPlies)
        return "long";
    return "normal";
}
