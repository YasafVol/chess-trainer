import test from "node:test";
import assert from "node:assert/strict";
import {
  buildFitlExplorerModel,
  buildFitlRouteSearchString,
  listFitlNodeKinds,
  normalizeFitlRouteSearch
} from "./fitlGraph.js";
import { fitlGraphSnapshot } from "../generated/fitlGraphSnapshot.js";

const allKinds = listFitlNodeKinds(fitlGraphSnapshot);

test("default project summary shows only project, intents, and the seven verticals", () => {
  const model = buildFitlExplorerModel(fitlGraphSnapshot, {
    depth: "summary",
    includeDeferred: false,
    focus: undefined,
    q: undefined,
    kinds: allKinds
  });

  assert.equal(model.focusKind, "project");
  assert.equal(model.nodes.filter((node) => node.kind === "project").length, 1);
  assert.equal(model.nodes.filter((node) => node.kind === "intent").length, 7);
  assert.equal(model.nodes.filter((node) => node.kind === "vertical").length, 7);
  assert.equal(model.nodes.some((node) => node.kind === "tool"), false);
  assert.equal(model.nodes.some((node) => node.kind === "file"), false);
});

test("architecture depth on a focused vertical exposes only connected layers and tools", () => {
  const model = buildFitlExplorerModel(fitlGraphSnapshot, {
    depth: "architecture",
    includeDeferred: false,
    focus: "vertical:v3-engine-analysis-and-annotations",
    q: undefined,
    kinds: allKinds
  });

  assert.equal(model.nodes.some((node) => node.kind === "layer"), true);
  assert.equal(model.nodes.some((node) => node.label === "Stockfish"), true);
  assert.equal(model.nodes.some((node) => node.kind === "file"), false);
});

test("implementation depth without a vertical or tool focus returns a blocked-state model", () => {
  const model = buildFitlExplorerModel(fitlGraphSnapshot, {
    depth: "implementation",
    includeDeferred: false,
    focus: undefined,
    q: undefined,
    kinds: allKinds
  });

  assert.equal(model.blockedMessage, "Select a vertical or tool to inspect implementation.");
  assert.equal(model.canInspectImplementation, false);
  assert.equal(model.nodes.some((node) => node.kind === "file"), false);
});

test("search query is preserved in route state and produces focused entry-point results", () => {
  const search = normalizeFitlRouteSearch({
    q: "stockfish",
    includeDeferred: true
  });
  const model = buildFitlExplorerModel(fitlGraphSnapshot, {
    ...search,
    kinds: allKinds
  });

  assert.equal(search.q, "stockfish");
  assert.equal(model.searchResults[0]?.label, "Stockfish");
});

test("old lens and granularity URLs normalize into the new canonical route state", () => {
  const search = normalizeFitlRouteSearch("lens=tooling&granularity=implementation&focus=tool%3Astockfish");

  assert.deepEqual(search, {
    depth: "implementation",
    focus: "tool:stockfish",
    includeDeferred: false,
    q: undefined
  });
  assert.equal(buildFitlRouteSearchString(search), "focus=tool%3Astockfish&depth=implementation");
});

test("AI brief generation includes focus, docs, files, tools, constraints, and validation commands", () => {
  const model = buildFitlExplorerModel(fitlGraphSnapshot, {
    depth: "implementation",
    includeDeferred: false,
    focus: "vertical:v6-game-view-and-analysis-workbench",
    q: "stockfish",
    kinds: allKinds
  });

  assert.match(model.aiBriefMarkdown, /Focus: V6 Game View and Analysis Workbench/);
  assert.match(model.aiBriefMarkdown, /Relevant Docs/);
  assert.match(model.aiBriefMarkdown, /Relevant Files/);
  assert.match(model.aiBriefMarkdown, /Relevant Tools/);
  assert.match(model.aiBriefMarkdown, /Suggested Validation Commands/);
  assert.match(model.aiBriefMarkdown, /npm run test/);
});
