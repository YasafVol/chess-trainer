import test from "node:test";
import assert from "node:assert/strict";
import { buildFitlExplorerModel, listFitlNodeKinds } from "../domain/fitlGraph.js";
import { fitlGraphSnapshot } from "../generated/fitlGraphSnapshot.js";
import { buildFitlCanvasModel } from "./fitlMapView.js";

test("buildFitlCanvasModel lays out the landing view into project, intent, and vertical lanes", () => {
  const model = buildFitlExplorerModel(fitlGraphSnapshot, {
    depth: "summary",
    includeDeferred: false,
    focus: undefined,
    q: undefined,
    kinds: listFitlNodeKinds(fitlGraphSnapshot)
  });

  const canvas = buildFitlCanvasModel(model, {
    depth: "summary"
  });

  assert.deepEqual(canvas.lanes.map((lane) => lane.label), ["Project", "Intent", "Vertical"]);
  assert.equal(canvas.nodes.some((node) => node.kind === "vertical"), true);
});

test("buildFitlCanvasModel adds a context lane and highlighted relationships for focused implementation", () => {
  const model = buildFitlExplorerModel(fitlGraphSnapshot, {
    depth: "implementation",
    includeDeferred: false,
    focus: "vertical:v3-engine-analysis-and-annotations",
    q: undefined,
    kinds: listFitlNodeKinds(fitlGraphSnapshot)
  });

  const canvas = buildFitlCanvasModel(model, {
    depth: "implementation"
  });

  assert.equal(canvas.lanes.some((lane) => lane.id === "context"), true);
  assert.equal(canvas.nodes.some((node) => node.label === "Stockfish" && node.isConnected), true);
  assert.equal(canvas.edges.some((edge) => edge.isHighlighted), true);
});
