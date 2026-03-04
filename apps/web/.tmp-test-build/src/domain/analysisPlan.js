export function buildAnalysisPlan(totalPlies, movesSan, defaultDepth = 16) {
    const steps = [];
    if (totalPlies <= 200) {
        for (let ply = 0; ply <= totalPlies; ply++) {
            steps.push({ ply, depth: defaultDepth });
        }
        return steps;
    }
    if (totalPlies <= 300) {
        for (let ply = 0; ply <= totalPlies; ply++) {
            if (ply % 2 === 0 || ply === totalPlies) {
                steps.push({ ply, depth: 14 });
            }
        }
        return steps;
    }
    for (let ply = 0; ply <= totalPlies; ply++) {
        const nextMove = movesSan[ply];
        const keyPosition = !!nextMove && (nextMove.includes("x") || nextMove.includes("+") || nextMove.includes("#"));
        if (ply % 4 === 0 || keyPosition || ply === totalPlies) {
            steps.push({ ply, depth: 12 });
        }
    }
    return steps;
}
export function lowerDepthForRetry(depth) {
    return Math.max(8, depth - 2);
}
