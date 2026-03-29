import test from "node:test";
import assert from "node:assert/strict";
import { buildFitlGraphSnapshot, parseVerticalDoc } from "./fitlGraphSource.mjs";

test("buildFitlGraphSnapshot emits the expected verticals, layers, and manifest tools", async () => {
  const snapshot = await buildFitlGraphSnapshot();
  const verticals = snapshot.nodes.filter((node) => node.kind === "vertical");
  const layers = snapshot.nodes.filter((node) => node.kind === "layer");
  const tools = snapshot.nodes.filter((node) => node.kind === "tool");

  assert.equal(verticals.length, 7);
  assert.equal(layers.length, 6);
  assert.ok(tools.some((node) => node.label === "Stockfish"));
  assert.ok(tools.some((node) => node.label === "Convex/Auth" && node.lifecycle === "active"));
});

test("parseVerticalDoc fails when a required FITL section is missing", () => {
  assert.throws(
    () =>
      parseVerticalDoc(
        "docs/architecture/verticals/example.md",
        `# V8: Example

## Business/User Intent

Example intent only.

## Tests and Acceptance Criteria

- \`npm run test\`
`
      ),
    /missing required section "Impacted Layers"/i
  );
});
