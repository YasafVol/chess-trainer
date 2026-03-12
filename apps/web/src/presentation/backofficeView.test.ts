import test from "node:test";
import assert from "node:assert/strict";
import { buildBackofficeConfigSections } from "./backofficeView.js";

test("buildBackofficeConfigSections exposes the hardcoded analysis and definition values", () => {
  const sections = buildBackofficeConfigSections();

  assert.deepEqual(
    sections.map((section) => section.title),
    ["Depths", "Lines and Limits", "Definitions"]
  );

  const depths = sections[0];
  const limits = sections[1];
  const definitions = sections[2];

  assert.equal(depths?.fields.find((field) => field.key === "defaultDepth")?.value, "16");
  assert.equal(depths?.fields.find((field) => field.key === "longGameDepth")?.value, "14");
  assert.equal(depths?.fields.find((field) => field.key === "retryMinDepth")?.value, "8");

  assert.equal(limits?.fields.find((field) => field.key === "defaultMultiPV")?.value, "1");
  assert.equal(limits?.fields.find((field) => field.key === "softPerPositionMaxMs")?.value, "1200");
  assert.equal(limits?.fields.find((field) => field.key === "perPlyTimeMultiplier")?.value, "1.7");
  assert.equal(limits?.fields.find((field) => field.key === "totalBudgetBuffer")?.value, "1.15");
  assert.equal(limits?.fields.find((field) => field.key === "emergencyHardCapMs")?.value, "300000");

  assert.equal(definitions?.fields.find((field) => field.key === "inaccuracy")?.value, ">= 50 cp");
  assert.equal(definitions?.fields.find((field) => field.key === "mistake")?.value, ">= 100 cp");
  assert.equal(definitions?.fields.find((field) => field.key === "blunder")?.value, ">= 200 cp");
});
