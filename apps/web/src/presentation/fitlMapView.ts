import type { FitlDepth, FitlExplorerModel, FitlNode, FitlNodeKind } from "../domain/fitlGraphTypes.js";

export type FitlCanvasLane = {
  id: string;
  label: string;
  x: number;
  width: number;
};

export type FitlCanvasNode = {
  id: string;
  label: string;
  kind: FitlNodeKind;
  lifecycle?: string;
  summary: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isSelected: boolean;
  isConnected: boolean;
  isMuted: boolean;
};

export type FitlCanvasEdge = {
  id: string;
  kind: string;
  path: string;
  isHighlighted: boolean;
};

export type FitlCanvasModel = {
  lanes: FitlCanvasLane[];
  nodes: FitlCanvasNode[];
  edges: FitlCanvasEdge[];
  width: number;
  height: number;
};

const LANE_WIDTH = 260;
const LANE_GAP = 22;
const NODE_GAP = 18;
const NODE_HEIGHT = 88;

export function buildFitlCanvasModel(model: FitlExplorerModel, options: { depth: FitlDepth }): FitlCanvasModel {
  const nodesByLane = new Map<string, FitlNode[]>();
  const laneOrder: Array<[string, string]> = [
    ["project", "Project"],
    ["intent", "Intent"],
    ["vertical", "Vertical"],
    ["context", resolveContextLabel(options.depth, model)]
  ];

  for (const [laneId] of laneOrder) {
    nodesByLane.set(laneId, []);
  }

  for (const node of model.nodes) {
    const laneId = resolveLaneId(node);
    nodesByLane.get(laneId)?.push(node);
  }

  const lanes = laneOrder
    .filter(([laneId]) => (nodesByLane.get(laneId)?.length ?? 0) > 0)
    .map(([laneId, label], index) => ({
      id: laneId,
      label,
      x: 24 + index * (LANE_WIDTH + LANE_GAP),
      width: LANE_WIDTH
    }));

  const renderedNodes: FitlCanvasNode[] = [];
  for (const lane of lanes) {
    const ordered = sortLaneNodes(nodesByLane.get(lane.id) ?? [], model);
    ordered.forEach((node, index) => {
      const width = node.kind === "file" || node.kind === "test_gate" ? 236 : 220;
      const interactiveFocus = model.focusKind !== "project";
      renderedNodes.push({
        id: node.id,
        label: node.label,
        kind: node.kind,
        lifecycle: node.lifecycle,
        summary: node.summary,
        x: lane.x + (lane.width - width) / 2,
        y: 28 + index * (NODE_HEIGHT + NODE_GAP),
        width,
        height: NODE_HEIGHT,
        isSelected: node.id === model.focusNode.id,
        isConnected: model.highlightedNodeIds.has(node.id),
        isMuted: interactiveFocus && node.id !== model.focusNode.id && !model.highlightedNodeIds.has(node.id)
      });
    });
  }

  const renderedNodeMap = new Map(renderedNodes.map((node) => [node.id, node]));
  const edges = model.edges
    .filter((edge) => renderedNodeMap.has(edge.from) && renderedNodeMap.has(edge.to))
    .map((edge) => {
      const from = renderedNodeMap.get(edge.from)!;
      const to = renderedNodeMap.get(edge.to)!;
      const leftToRight = from.x <= to.x;
      const startX = leftToRight ? from.x + from.width : from.x;
      const endX = leftToRight ? to.x : to.x + to.width;
      const startY = from.y + from.height / 2;
      const endY = to.y + to.height / 2;
      const distance = Math.max(54, Math.abs(endX - startX) / 2);
      return {
        id: edge.id,
        kind: edge.kind,
        path: `M ${startX} ${startY} C ${startX + (leftToRight ? distance : -distance)} ${startY}, ${endX + (leftToRight ? -distance : distance)} ${endY}, ${endX} ${endY}`,
        isHighlighted: model.highlightedNodeIds.has(edge.from) && model.highlightedNodeIds.has(edge.to)
      };
    });

  const height = Math.max(240, ...renderedNodes.map((node) => node.y + node.height + 24));
  const width = Math.max(420, ...lanes.map((lane) => lane.x + lane.width + 24));

  return {
    lanes,
    nodes: renderedNodes,
    edges,
    width,
    height
  };
}

function resolveContextLabel(depth: FitlDepth, model: FitlExplorerModel) {
  if (depth === "summary" && model.focusKind === "tool") return "Tool";
  if (depth === "architecture") return "Architecture Context";
  if (depth === "implementation") return "Implementation Context";
  return "Context";
}

function resolveLaneId(node: FitlNode) {
  if (node.kind === "project") return "project";
  if (node.kind === "intent") return "intent";
  if (node.kind === "vertical") return "vertical";
  return "context";
}

function sortLaneNodes(nodes: FitlNode[], model: FitlExplorerModel) {
  return [...nodes].sort((left, right) => {
    if (left.kind === "project" && right.kind === "project") return 0;

    if (left.kind === "intent" && right.kind === "intent") {
      return connectedVerticalOrder(left, model) - connectedVerticalOrder(right, model);
    }

    if (left.kind === "vertical" && right.kind === "vertical") {
      return parseVerticalOrder(left.id) - parseVerticalOrder(right.id);
    }

    const contextOrder = contextKindOrder(left.kind) - contextKindOrder(right.kind);
    if (contextOrder !== 0) return contextOrder;

    if (left.kind === "tool" && right.kind === "tool") {
      const lifecycleOrder = ["active", "build", "deploy", "deferred"];
      const leftLifecycle = lifecycleOrder.indexOf(left.lifecycle ?? "active");
      const rightLifecycle = lifecycleOrder.indexOf(right.lifecycle ?? "active");
      if (leftLifecycle !== rightLifecycle) return leftLifecycle - rightLifecycle;
    }

    return left.label.localeCompare(right.label);
  });
}

function connectedVerticalOrder(intent: FitlNode, model: FitlExplorerModel) {
  const verticalIds = model.edges.flatMap((edge) => {
    if (edge.from === intent.id) return [edge.to];
    if (edge.to === intent.id) return [edge.from];
    return [];
  });
  const match = verticalIds.find((id) => id.startsWith("vertical:"));
  return match ? parseVerticalOrder(match) : Number.MAX_SAFE_INTEGER;
}

function parseVerticalOrder(id: string) {
  const match = id.match(/vertical:v(\d+)/i);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

function contextKindOrder(kind: FitlNodeKind) {
  const priority: FitlNodeKind[] = ["layer", "tool", "module", "file", "test_gate", "risk", "decision"];
  const index = priority.indexOf(kind);
  return index >= 0 ? index : priority.length;
}
