import test from "node:test";
import assert from "node:assert/strict";
import { formatUnknownError } from "./formatUnknownError.js";

test("formatUnknownError handles Error and object-shaped browser errors", () => {
  assert.equal(formatUnknownError(new Error("boom")), "boom");
  assert.equal(formatUnknownError({ name: "QuotaExceededError", message: "DB full" }), "QuotaExceededError: DB full");
  assert.equal(formatUnknownError({ message: "worker init failed" }), "worker init failed");
});

test("formatUnknownError falls back cleanly for empty objects and unknown values", () => {
  assert.equal(formatUnknownError({}, "Fallback failure"), "Fallback failure");
  assert.equal(formatUnknownError("", "Fallback failure"), "Fallback failure");
  assert.equal(formatUnknownError(undefined, "Fallback failure"), "Fallback failure");
});
