import test from "node:test";
import assert from "node:assert/strict";
import { ANALYSIS_POLICY, computeExpectedPerPlyMs, computeForegroundBudgetMs } from "./analysisPolicy.js";

test("computeExpectedPerPlyMs derives wall-clock cost from movetime", () => {
  assert.equal(computeExpectedPerPlyMs(), 2040);
});

test("computeForegroundBudgetMs derives total budget from plies and buffer", () => {
  assert.equal(computeForegroundBudgetMs(40), 93840);
});

test("computeForegroundBudgetMs respects the emergency hard cap", () => {
  assert.equal(computeForegroundBudgetMs(200), ANALYSIS_POLICY.emergencyHardCapMs);
});
