import test from "node:test";
import assert from "node:assert/strict";
import { buildAnalysisPlan, lowerDepthForRetry } from "./analysisPlan.js";
test("buildAnalysisPlan analyzes every ply up to 200 plies at default depth", () => {
    const totalPlies = 4;
    const plan = buildAnalysisPlan(totalPlies, []);
    assert.equal(plan.length, 5);
    assert.deepEqual(plan.map((step) => step.ply), [0, 1, 2, 3, 4]);
    assert.ok(plan.every((step) => step.depth === 16));
});
test("buildAnalysisPlan samples every second ply for games between 201 and 300 plies", () => {
    const totalPlies = 250;
    const plan = buildAnalysisPlan(totalPlies, Array(totalPlies).fill("Nf3"));
    assert.ok(plan.length > 0);
    assert.ok(plan.every((step) => step.depth === 14));
    assert.ok(plan.every((step) => step.ply % 2 === 0 || step.ply === totalPlies));
});
test("buildAnalysisPlan samples every fourth ply but keeps tactical and final positions for long games", () => {
    const totalPlies = 301;
    const movesSan = Array(totalPlies).fill("Nf3");
    movesSan[7] = "Qxe5+";
    const plan = buildAnalysisPlan(totalPlies, movesSan);
    const plies = plan.map((step) => step.ply);
    assert.ok(plies.includes(7), "tactical ply must be included");
    assert.ok(plies.includes(totalPlies), "final ply must be included");
    assert.ok(plan.every((step) => step.depth === 12), "all sampled plies in long games should use depth 12");
    assert.ok(plan.every((step) => step.ply % 4 === 0 || step.ply === 7 || step.ply === totalPlies), "non-tactical long-game plies should follow every-fourth sampling");
});
test("lowerDepthForRetry reduces depth by two with floor at 8", () => {
    assert.equal(lowerDepthForRetry(16), 14);
    assert.equal(lowerDepthForRetry(9), 8);
    assert.equal(lowerDepthForRetry(8), 8);
});
