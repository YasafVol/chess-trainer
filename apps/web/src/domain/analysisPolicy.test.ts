import test from "node:test";
import assert from "node:assert/strict";
import { ANALYSIS_POLICY, computeForegroundBudgetMs } from "./analysisPolicy.js";

test("computeForegroundBudgetMs keeps the base budget for short games", () => {
  assert.equal(computeForegroundBudgetMs(40), ANALYSIS_POLICY.baseForegroundBudgetMs);
});

test("computeForegroundBudgetMs scales budget with game length when that exceeds the base", () => {
  assert.equal(computeForegroundBudgetMs(200), 120000);
});
