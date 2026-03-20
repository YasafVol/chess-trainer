import type {
  FitlBreadcrumb,
  FitlDossierItem,
  FitlDossierSection,
  FitlDepth,
  FitlEdge,
  FitlExplorerDossier,
  FitlExplorerModel,
  FitlExplorerState,
  FitlFocusKind,
  FitlGraphSnapshot,
  FitlNode,
  FitlNodeKind,
  FitlReference,
  FitlRouteSearch,
  FitlSearchResult
} from "./fitlGraphTypes.js";

const DEFAULT_ROUTE_SEARCH: FitlRouteSearch = {
  depth: "summary",
  includeDeferred: false
};

const NODE_KIND_ORDER: FitlNodeKind[] = [
  "project",
  "intent",
  "vertical",
  "layer",
  "tool",
  "module",
  "file",
  "test_gate",
  "risk",
  "decision"
];

const FOCUSABLE_KINDS: FitlFocusKind[] = ["project", "intent", "vertical", "tool"];
const ROOT_COMMANDS = ["npm run typecheck", "npm run test", "npm run build"];
const CONTEXT_KIND_PRIORITY: FitlNodeKind[] = ["layer", "tool", "module", "file", "test_gate"];
const PROJECT_ID = "project:web-app";
const REFERENCE_DOCS = [
  "docs/README.md",
  "docs/architecture/LAYER_X_FEATURE_MATRIX.md",
  "docs/modules/web-app.md",
  "docs/reference/fitl-visualization.md"
];

type GraphIndex = {
  nodeMap: Map<string, FitlNode>;
  adjacency: Map<string, Set<string>>;
};

export function normalizeFitlRouteSearch(
  input: Partial<Record<string, unknown>> | URLSearchParams | string
): FitlRouteSearch {
  const values =
    typeof input === "string"
      ? Object.fromEntries(new URLSearchParams(input))
      : input instanceof URLSearchParams
        ? Object.fromEntries(input.entries())
        : input;

  const focus = typeof values.focus === "string" && values.focus.trim().length > 0 ? values.focus.trim() : undefined;
  const q = typeof values.q === "string" && values.q.trim().length > 0 ? values.q.trim() : undefined;
  const includeDeferred =
    values.includeDeferred === true ||
    values.includeDeferred === "true" ||
    values.includeDeferred === "1";

  return {
    focus,
    q,
    includeDeferred,
    depth: normalizeDepth(values)
  };
}

export function buildFitlRouteSearchString(search: FitlRouteSearch): string {
  const params = new URLSearchParams();
  if (search.focus) {
    params.set("focus", search.focus);
  }
  if (search.depth !== DEFAULT_ROUTE_SEARCH.depth) {
    params.set("depth", search.depth);
  }
  if (search.q) {
    params.set("q", search.q);
  }
  if (search.includeDeferred) {
    params.set("includeDeferred", "true");
  }
  return params.toString();
}

export function listFitlNodeKinds(snapshot: FitlGraphSnapshot): FitlNodeKind[] {
  const available = new Set(snapshot.nodes.map((node) => node.kind));
  return NODE_KIND_ORDER.filter((kind) => available.has(kind));
}

export function buildFitlExplorerModel(snapshot: FitlGraphSnapshot, state: FitlExplorerState): FitlExplorerModel {
  const index = indexGraph(snapshot);
  const availableKinds = listFitlNodeKinds(snapshot);
  const selectedKinds = new Set(state.kinds.length > 0 ? state.kinds : availableKinds);
  const focusNode = resolveFocusNode(index.nodeMap, state.focus, state.includeDeferred);
  const focusKind = toFocusKind(focusNode.kind);
  const canInspectImplementation = focusKind === "vertical" || focusKind === "tool";
  const blockedMessage =
    state.depth === "implementation" && !canInspectImplementation
      ? "Select a vertical or tool to inspect implementation."
      : undefined;
  const neighborhoodNodeIds = collectNeighborhoodNodeIds(snapshot, index, focusNode, state.depth, state.includeDeferred);
  const neighborhoodNodes = sortNodes(
    [...neighborhoodNodeIds]
      .map((id) => index.nodeMap.get(id))
      .filter((node): node is FitlNode => Boolean(node))
  );
  const graphNodeIds = filterGraphNodeIds(neighborhoodNodeIds, index.nodeMap, selectedKinds);
  const visibleNodes = neighborhoodNodes.filter((node) => graphNodeIds.has(node.id));
  const visibleEdges = snapshot.edges.filter((edge) => graphNodeIds.has(edge.from) && graphNodeIds.has(edge.to));
  const highlightedNodeIds = collectHighlightedNodeIds(focusNode, neighborhoodNodes, visibleEdges, state.depth);
  const dossier = buildDossier(snapshot, index, focusNode, focusKind, neighborhoodNodes, state, blockedMessage);

  return {
    nodes: visibleNodes,
    edges: visibleEdges,
    focusNode,
    focusKind,
    highlightedNodeIds,
    dossier,
    aiBriefMarkdown: buildFitlAiBrief(dossier, focusNode, focusKind, neighborhoodNodes, state),
    searchResults: buildSearchResults(snapshot, state.includeDeferred, state.q ?? ""),
    availableKinds,
    neighborhoodKindCounts: buildKindCounts(neighborhoodNodes),
    canInspectImplementation,
    blockedMessage
  };
}

function normalizeDepth(values: Partial<Record<string, unknown>>): FitlDepth {
  if (values.depth === "architecture" || values.depth === "implementation") {
    return values.depth;
  }

  if (values.granularity === "implementation") {
    return "implementation";
  }

  if (
    values.granularity === "feature" ||
    values.lens === "architecture" ||
    values.lens === "tooling"
  ) {
    return "architecture";
  }

  return DEFAULT_ROUTE_SEARCH.depth;
}

function indexGraph(snapshot: FitlGraphSnapshot): GraphIndex {
  const nodeMap = new Map(snapshot.nodes.map((node) => [node.id, node]));
  const adjacency = new Map<string, Set<string>>();
  for (const node of snapshot.nodes) {
    adjacency.set(node.id, new Set());
  }
  for (const edge of snapshot.edges) {
    adjacency.get(edge.from)?.add(edge.to);
    adjacency.get(edge.to)?.add(edge.from);
  }
  return { nodeMap, adjacency };
}

function resolveFocusNode(nodeMap: Map<string, FitlNode>, focus: string | undefined, includeDeferred: boolean) {
  const project = nodeMap.get(PROJECT_ID)!;
  if (!focus) return project;
  const candidate = nodeMap.get(focus);
  if (!candidate) return project;
  if (!includeDeferred && candidate.lifecycle === "deferred") {
    return project;
  }
  if (!FOCUSABLE_KINDS.includes(toFocusKind(candidate.kind))) {
    return project;
  }
  return candidate;
}

function collectNeighborhoodNodeIds(
  snapshot: FitlGraphSnapshot,
  index: GraphIndex,
  focusNode: FitlNode,
  depth: FitlDepth,
  includeDeferred: boolean
) {
  const nodeIds = new Set<string>([PROJECT_ID]);
  const focusKind = toFocusKind(focusNode.kind);
  const allIntents = sortNodes(snapshot.nodes.filter((node) => node.kind === "intent"));
  const allVerticals = sortNodes(snapshot.nodes.filter((node) => node.kind === "vertical"));
  const allLayers = sortNodes(snapshot.nodes.filter((node) => node.kind === "layer"));

  const verticalsFromFocus =
    focusKind === "project"
      ? allVerticals
      : focusKind === "intent"
        ? getNeighborsByKind(index, focusNode.id, "vertical")
        : focusKind === "vertical"
          ? [focusNode]
          : getNeighborsByKind(index, focusNode.id, "vertical");
  const intentIds = new Set<string>();
  for (const vertical of verticalsFromFocus) {
    for (const intent of getNeighborsByKind(index, vertical.id, "intent")) {
      intentIds.add(intent.id);
    }
  }

  if (focusKind === "project") {
    addNodes(nodeIds, allIntents, includeDeferred);
    addNodes(nodeIds, allVerticals, includeDeferred);
    if (depth === "architecture") {
      addNodes(nodeIds, allLayers, includeDeferred);
    }
    return nodeIds;
  }

  addNodeId(nodeIds, focusNode.id, index.nodeMap, includeDeferred);
  addNodes(
    nodeIds,
    focusKind === "tool"
      ? sortNodes([...intentIds].map((id) => index.nodeMap.get(id)).filter((node): node is FitlNode => Boolean(node)))
      : sortNodes([...intentIds].map((id) => index.nodeMap.get(id)).filter((node): node is FitlNode => Boolean(node))),
    includeDeferred
  );
  addNodes(nodeIds, verticalsFromFocus, includeDeferred);

  if (focusKind === "tool") {
    addNodeId(nodeIds, focusNode.id, index.nodeMap, includeDeferred);
  }

  if (depth === "summary") {
    if (focusKind === "tool") {
      addNodeId(nodeIds, focusNode.id, index.nodeMap, includeDeferred);
    }
    return nodeIds;
  }

  const contextKinds =
    depth === "architecture"
      ? new Set<FitlNodeKind>(["layer", ...(focusKind === "tool" ? [] : (["tool"] as FitlNodeKind[]))])
      : new Set<FitlNodeKind>(CONTEXT_KIND_PRIORITY);

  if (focusKind === "tool") {
    contextKinds.delete("tool");
  }

  for (const vertical of verticalsFromFocus) {
    for (const neighborId of index.adjacency.get(vertical.id) ?? []) {
      const neighbor = index.nodeMap.get(neighborId);
      if (!neighbor || !contextKinds.has(neighbor.kind)) continue;
      addNodeId(nodeIds, neighbor.id, index.nodeMap, includeDeferred);
    }
  }

  if (focusKind === "tool") {
    addNodeId(nodeIds, focusNode.id, index.nodeMap, includeDeferred);
  }

  return nodeIds;
}

function addNodes(target: Set<string>, nodes: FitlNode[], includeDeferred: boolean) {
  for (const node of nodes) {
    if (!includeDeferred && node.lifecycle === "deferred") continue;
    target.add(node.id);
  }
}

function addNodeId(
  target: Set<string>,
  nodeId: string,
  nodeMap: Map<string, FitlNode>,
  includeDeferred: boolean
) {
  const node = nodeMap.get(nodeId);
  if (!node) return;
  if (!includeDeferred && node.lifecycle === "deferred") return;
  target.add(node.id);
}

function filterGraphNodeIds(
  nodeIds: Set<string>,
  nodeMap: Map<string, FitlNode>,
  selectedKinds: Set<FitlNodeKind>
) {
  return new Set<string>(
    [...nodeIds].filter((id) => {
      const node = nodeMap.get(id);
      return node ? selectedKinds.has(node.kind) : false;
    })
  );
}

function buildDossier(
  snapshot: FitlGraphSnapshot,
  index: GraphIndex,
  focusNode: FitlNode,
  focusKind: FitlFocusKind,
  neighborhoodNodes: FitlNode[],
  state: FitlExplorerState,
  blockedMessage?: string
): FitlExplorerDossier {
  const connectedVerticals = collectRelevantVerticals(index, focusNode, focusKind);
  const connectedIntents = sortNodes(
    connectedVerticals.flatMap((vertical) => getNeighborsByKind(index, vertical.id, "intent"))
  );
  const connectedTools = uniqueNodes(
    connectedVerticals.flatMap((vertical) => getNeighborsByKind(index, vertical.id, "tool"))
  );
  const connectedLayers = uniqueNodes(
    connectedVerticals.flatMap((vertical) => getNeighborsByKind(index, vertical.id, "layer"))
  );
  const connectedModules = uniqueNodes(
    connectedVerticals.flatMap((vertical) => getNeighborsByKind(index, vertical.id, "module"))
  );
  const connectedFiles = uniqueNodes(
    connectedVerticals.flatMap((vertical) => getNeighborsByKind(index, vertical.id, "file"))
  );
  const connectedTests = uniqueNodes(
    connectedVerticals.flatMap((vertical) => getNeighborsByKind(index, vertical.id, "test_gate"))
  );
  const connectedRisks = uniqueNodes(
    connectedVerticals.flatMap((vertical) => getNeighborsByKind(index, vertical.id, "risk"))
  );
  const connectedDecisions = uniqueNodes(
    connectedVerticals.flatMap((vertical) => getNeighborsByKind(index, vertical.id, "decision"))
  );
  const breadcrumbs = buildBreadcrumbs(index, focusNode, focusKind);
  const sections: FitlDossierSection[] = [];
  let references: FitlReference[] = [];
  let subtitle = `Depth: ${state.depth}`;
  let description = focusNode.description || focusNode.summary;

  if (blockedMessage) {
    sections.push({
      id: "blocked",
      title: "Implementation Access",
      items: [
        {
          id: "blocked-message",
          kind: "command",
          label: blockedMessage,
          description: "Implementation depth opens only from a selected vertical or tool."
        }
      ]
    });
  }

  if (focusKind === "project") {
    subtitle = "Global overview";
    description =
      "Start from a vertical to understand intent, architecture, tooling, tests, and constraints before asking the AI to change anything.";
    sections.push({
      id: "patterns",
      title: "Usage Patterns",
      items: [
        makeItem("usage:overview", "command", "Project overview", "Survey the seven shipped feature verticals and the canonical FITL structure."),
        makeItem("usage:intent", "command", "Intent cluster", "Click an intent to isolate the product goal it serves and the connected vertical."),
        makeItem("usage:vertical", "command", "Vertical briefing", "Click a vertical, then deepen into architecture or implementation for change planning."),
        makeItem("usage:tool", "command", "Tool impact", "Search for a tool such as Stockfish or Vercel to trace where it matters.")
      ]
    });
    pushSection(sections, "intents", "Intent List", sortNodes(snapshot.nodes.filter((node) => node.kind === "intent")));
    pushSection(sections, "verticals", "Vertical List", sortNodes(snapshot.nodes.filter((node) => node.kind === "vertical")));
    references = dedupeReferences([
      ...focusNode.references,
      ...REFERENCE_DOCS.filter((path) => snapshot.sourceDocs.includes(path)).map((path) => makeReference("doc", path))
    ]);
  } else if (focusKind === "intent") {
    subtitle = "Intent briefing";
    pushSection(sections, "verticals", "Connected Verticals", connectedVerticals);
    sections.push({
      id: "themes",
      title: "Shared Architecture and Tooling",
      items: [
        ...nodesToItems(connectedLayers),
        ...nodesToItems(connectedTools)
      ],
      emptyMessage: "No shared architecture or tooling themes are linked from this intent."
    });
    references = dedupeReferences([
      ...focusNode.references,
      ...connectedVerticals.flatMap((node) => node.references)
    ]);
  } else if (focusKind === "vertical") {
    subtitle = "Vertical briefing";
    pushSection(sections, "intent", "Intent Served", connectedIntents);
    pushSection(sections, "layers", "Layers Touched", connectedLayers);
    pushSection(sections, "tools", "Tools Used", connectedTools);
    pushSection(sections, "implementation", "Implementation Surfaces", [...connectedModules, ...connectedFiles]);
    sections.push({
      id: "validation",
      title: "Tests and Commands",
      items: [
        ...nodesToItems(connectedTests),
        ...ROOT_COMMANDS.map((command) => makeCommandItem(command))
      ]
    });
    sections.push({
      id: "constraints",
      title: "Risks and Decisions",
      items: [
        ...nodesToItems(connectedRisks),
        ...nodesToItems(connectedDecisions)
      ],
      emptyMessage: "No linked risks or decision records were found for this vertical."
    });
    references = dedupeReferences([
      ...focusNode.references,
      ...connectedLayers.flatMap((node) => node.references),
      ...connectedTools.flatMap((node) => node.references),
      ...connectedFiles.flatMap((node) => node.references),
      ...connectedTests.flatMap((node) => node.references),
      ...connectedDecisions.flatMap((node) => node.references),
      ...connectedRisks.flatMap((node) => node.references)
    ]);
  } else {
    subtitle = `Tool impact · ${focusNode.lifecycle ?? "active"}`;
    description = focusNode.summary;
    pushSection(sections, "verticals", "Connected Verticals", connectedVerticals);
    pushSection(sections, "implementation", "Implementation Surfaces", [...connectedModules, ...connectedFiles]);
    sections.push({
      id: "constraints",
      title: "Constraints and Risks",
      items: [
        ...nodesToItems(connectedRisks),
        ...nodesToItems(connectedDecisions)
      ],
      emptyMessage: "No linked constraints were found for this tool."
    });
    references = dedupeReferences([
      ...focusNode.references,
      ...connectedVerticals.flatMap((node) => node.references),
      ...connectedFiles.flatMap((node) => node.references),
      ...connectedDecisions.flatMap((node) => node.references),
      ...connectedRisks.flatMap((node) => node.references)
    ]);
  }

  if (state.depth === "architecture" && focusKind !== "project") {
    description = `${focusNode.summary} Architecture depth expands the connected layers and runtime boundaries for the current focus.`;
  }
  if (state.depth === "implementation" && !blockedMessage && (focusKind === "vertical" || focusKind === "tool")) {
    description = `${focusNode.summary} Implementation depth exposes the immediate modules, files, and tests needed to make changes safely.`;
  }

  return {
    title: focusNode.label,
    subtitle,
    description,
    breadcrumbs,
    sections,
    references
  };
}

function buildBreadcrumbs(index: GraphIndex, focusNode: FitlNode, focusKind: FitlFocusKind): FitlBreadcrumb[] {
  const breadcrumbs: FitlBreadcrumb[] = [{ id: PROJECT_ID, label: "Project", nodeId: PROJECT_ID }];
  if (focusKind === "project") return breadcrumbs;

  if (focusKind === "intent") {
    breadcrumbs.push({ id: focusNode.id, label: focusNode.label, nodeId: focusNode.id });
    return breadcrumbs;
  }

  if (focusKind === "vertical") {
    const intent = getNeighborsByKind(index, focusNode.id, "intent")[0];
    if (intent) {
      breadcrumbs.push({ id: intent.id, label: intent.label, nodeId: intent.id });
    }
    breadcrumbs.push({ id: focusNode.id, label: focusNode.label, nodeId: focusNode.id });
    return breadcrumbs;
  }

  breadcrumbs.push({ id: focusNode.id, label: focusNode.label, nodeId: focusNode.id });
  return breadcrumbs;
}

function buildSearchResults(snapshot: FitlGraphSnapshot, includeDeferred: boolean, query: string): FitlSearchResult[] {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length === 0) return [];

  return snapshot.nodes
    .filter((node) => FOCUSABLE_KINDS.includes(toFocusKind(node.kind)))
    .filter((node) => includeDeferred || node.lifecycle !== "deferred")
    .map((node) => ({
      node,
      score: scoreNode(node, trimmed)
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      const kindOrder = focusKindOrder(toFocusKind(left.node.kind)) - focusKindOrder(toFocusKind(right.node.kind));
      if (kindOrder !== 0) return kindOrder;
      return left.node.label.localeCompare(right.node.label);
    })
    .slice(0, 8)
    .map(({ node }) => ({
      id: node.id,
      label: node.label,
      kind: toFocusKind(node.kind),
      summary: node.summary
    }));
}

function scoreNode(node: FitlNode, query: string) {
  const label = node.label.toLowerCase();
  const summary = node.summary.toLowerCase();
  const refs = node.references.map((reference) => `${reference.label} ${reference.path}`.toLowerCase()).join(" ");
  const tags = node.tags.join(" ").toLowerCase();

  if (label === query) return 120;
  if (label.startsWith(query)) return 100;
  if (label.includes(query)) return 80;
  if (summary.includes(query)) return 48;
  if (refs.includes(query)) return 40;
  if (tags.includes(query)) return 32;
  return 0;
}

function collectRelevantVerticals(index: GraphIndex, focusNode: FitlNode, focusKind: FitlFocusKind) {
  if (focusKind === "project") {
    return [];
  }
  if (focusKind === "intent") {
    return getNeighborsByKind(index, focusNode.id, "vertical");
  }
  if (focusKind === "vertical") {
    return [focusNode];
  }
  return getNeighborsByKind(index, focusNode.id, "vertical");
}

function getNeighborsByKind(index: GraphIndex, nodeId: string, kind: FitlNodeKind) {
  return sortNodes(
    [...(index.adjacency.get(nodeId) ?? [])]
      .map((id) => index.nodeMap.get(id))
      .filter((node): node is FitlNode => node !== undefined && node.kind === kind)
  );
}

function collectHighlightedNodeIds(
  focusNode: FitlNode,
  neighborhoodNodes: FitlNode[],
  edges: FitlEdge[],
  depth: FitlDepth
) {
  const ids = new Set<string>([focusNode.id]);
  const neighborhoodIds = new Set(neighborhoodNodes.map((node) => node.id));
  for (const edge of edges) {
    if (edge.from === focusNode.id || edge.to === focusNode.id) {
      ids.add(edge.from);
      ids.add(edge.to);
    }
  }
  if (depth !== "summary") {
    for (const edge of edges) {
      if (ids.has(edge.from) || ids.has(edge.to)) {
        ids.add(edge.from);
        ids.add(edge.to);
      }
    }
  }
  return new Set([...ids].filter((id) => neighborhoodIds.has(id)));
}

function buildFitlAiBrief(
  dossier: FitlExplorerDossier,
  focusNode: FitlNode,
  focusKind: FitlFocusKind,
  neighborhoodNodes: FitlNode[],
  state: FitlExplorerState
) {
  const lines = [
    "# FITL Change Brief",
    "",
    `- Focus: ${focusNode.label}`,
    `- Focus kind: ${focusKind}`,
    `- Depth: ${state.depth}`,
    `- Search query: ${state.q ?? "none"}`,
    `- Deferred surfaces included: ${state.includeDeferred ? "yes" : "no"}`,
    "",
    "## Why It Exists",
    dossier.description
  ];

  for (const section of dossier.sections) {
    if (section.items.length === 0) continue;
    lines.push("", `## ${section.title}`);
    for (const item of section.items) {
      lines.push(`- ${item.label}${item.target ? ` (${item.target.path})` : ""}`);
    }
  }

  const relevantDocs = dedupeReferences(
    neighborhoodNodes.flatMap((node) => node.references.filter((reference) => reference.type === "doc"))
  );
  const relevantFiles = dedupeReferences(
    neighborhoodNodes.flatMap((node) =>
      node.references.filter((reference) => reference.type === "file" || reference.type === "test")
    )
  );
  const relevantTools = neighborhoodNodes.filter((node) => node.kind === "tool");

  if (relevantDocs.length > 0) {
    lines.push("", "## Relevant Docs");
    for (const reference of relevantDocs.slice(0, 10)) {
      lines.push(`- ${reference.path}`);
    }
  }

  if (relevantFiles.length > 0) {
    lines.push("", "## Relevant Files");
    for (const reference of relevantFiles.slice(0, 12)) {
      lines.push(`- ${reference.path}`);
    }
  }

  if (relevantTools.length > 0) {
    lines.push("", "## Relevant Tools");
    for (const tool of sortNodes(relevantTools).slice(0, 8)) {
      lines.push(`- ${tool.label}${tool.lifecycle ? ` (${tool.lifecycle})` : ""}`);
    }
  }

  lines.push("", "## Suggested Validation Commands");
  for (const command of ROOT_COMMANDS) {
    lines.push(`- ${command}`);
  }

  return `${lines.join("\n")}\n`;
}

function buildKindCounts(nodes: FitlNode[]) {
  const counts = new Map<FitlNodeKind, number>();
  for (const node of nodes) {
    counts.set(node.kind, (counts.get(node.kind) ?? 0) + 1);
  }
  return counts;
}

function pushSection(sections: FitlDossierSection[], id: string, title: string, nodes: FitlNode[]) {
  sections.push({
    id,
    title,
    items: nodesToItems(nodes),
    emptyMessage: nodes.length === 0 ? `No ${title.toLowerCase()} are linked in the current FITL neighborhood.` : undefined
  });
}

function nodesToItems(nodes: FitlNode[]): FitlDossierItem[] {
  return sortNodes(uniqueNodes(nodes)).map((node) => ({
    id: node.id,
    kind: node.kind,
    label: node.label,
    description: node.summary,
    target: node.references[0]
      ? {
          type: node.references[0].type,
          label: node.references[0].label,
          path: node.references[0].path
        }
      : undefined
  }));
}

function makeItem(id: string, kind: FitlDossierItem["kind"], label: string, description?: string): FitlDossierItem {
  return {
    id,
    kind,
    label,
    description
  };
}

function makeCommandItem(command: string): FitlDossierItem {
  return {
    id: `command:${command}`,
    kind: "command",
    label: command,
    description: "Suggested validation command for the current focus.",
    target: {
      type: "command",
      label: command,
      path: command
    }
  };
}

function uniqueNodes(nodes: FitlNode[]) {
  const seen = new Set<string>();
  return nodes.filter((node) => {
    if (seen.has(node.id)) return false;
    seen.add(node.id);
    return true;
  });
}

function dedupeReferences(references: FitlReference[]) {
  const seen = new Set<string>();
  return references.filter((reference) => {
    const key = `${reference.type}:${reference.path}:${reference.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function makeReference(type: FitlReference["type"], path: string): FitlReference {
  return {
    type,
    label: path,
    path
  };
}

function focusKindOrder(kind: FitlFocusKind) {
  switch (kind) {
    case "vertical":
      return 0;
    case "intent":
      return 1;
    case "tool":
      return 2;
    case "project":
      return 3;
  }
}

function toFocusKind(kind: FitlNodeKind): FitlFocusKind {
  switch (kind) {
    case "intent":
      return "intent";
    case "vertical":
      return "vertical";
    case "tool":
      return "tool";
    default:
      return "project";
  }
}

function sortNodes(nodes: FitlNode[]) {
  return [...nodes].sort((left, right) => {
    const kindOrder = NODE_KIND_ORDER.indexOf(left.kind) - NODE_KIND_ORDER.indexOf(right.kind);
    if (kindOrder !== 0) return kindOrder;

    if (left.kind === "vertical" && right.kind === "vertical") {
      return parseVerticalOrder(left.id) - parseVerticalOrder(right.id);
    }

    if (left.kind === "intent" && right.kind === "intent") {
      return parseIntentOrder(left.id, left.label) - parseIntentOrder(right.id, right.label);
    }

    if (left.kind === "layer" && right.kind === "layer") {
      const layerOrder = ["contracts", "domain", "application", "adapters", "presentation", "composition"];
      return layerOrder.indexOf(left.id.replace("layer:", "").toLowerCase()) - layerOrder.indexOf(right.id.replace("layer:", "").toLowerCase());
    }

    if (left.kind === "tool" && right.kind === "tool") {
      const lifecycleOrder = ["active", "build", "deploy", "deferred"];
      const leftLifecycle = lifecycleOrder.indexOf(left.lifecycle ?? "active");
      const rightLifecycle = lifecycleOrder.indexOf(right.lifecycle ?? "active");
      if (leftLifecycle !== rightLifecycle) return leftLifecycle - rightLifecycle;
    }

    return left.label.localeCompare(right.label);
  });
}

function parseVerticalOrder(id: string) {
  const match = id.match(/vertical:v(\d+)/i);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

function parseIntentOrder(id: string, label: string) {
  const match = id.match(/intent:v(\d+)/i) ?? label.match(/^V(\d+)/i);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}
