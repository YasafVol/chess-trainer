export type FitlNodeKind =
  | "project"
  | "intent"
  | "vertical"
  | "layer"
  | "module"
  | "file"
  | "tool"
  | "decision"
  | "risk"
  | "test_gate";

export type FitlEdgeKind =
  | "realizes"
  | "touches"
  | "implemented_by"
  | "uses"
  | "constrained_by"
  | "validated_by"
  | "deferred_by"
  | "deploys";

export type FitlDepth = "summary" | "architecture" | "implementation";
export type FitlFocusKind = "project" | "intent" | "vertical" | "tool";
export type FitlLifecycle = "active" | "deferred" | "build" | "deploy";
export type FitlSystem = "internal" | "external" | "browser-platform";
export type FitlReferenceType = "doc" | "file" | "test" | "command" | "manifest";

export type FitlReference = {
  type: FitlReferenceType;
  label: string;
  path: string;
};

export type FitlNode = {
  id: string;
  kind: FitlNodeKind;
  label: string;
  summary: string;
  description?: string;
  lifecycle?: FitlLifecycle;
  system?: FitlSystem;
  references: FitlReference[];
  tags: string[];
};

export type FitlEdge = {
  id: string;
  from: string;
  to: string;
  kind: FitlEdgeKind;
};

export type FitlGraphSnapshot = {
  version: number;
  generatedAt: string;
  sourceDocs: string[];
  nodes: FitlNode[];
  edges: FitlEdge[];
};

export type FitlRouteSearch = {
  focus?: string;
  depth: FitlDepth;
  q?: string;
  includeDeferred: boolean;
};

export type FitlExplorerState = FitlRouteSearch & {
  kinds: FitlNodeKind[];
};

export type FitlDossierItem = {
  id: string;
  kind: FitlNodeKind | FitlReferenceType | "command";
  label: string;
  description?: string;
  target?: {
    type: FitlReferenceType | "command";
    label: string;
    path: string;
  };
};

export type FitlDossierSection = {
  id: string;
  title: string;
  items: FitlDossierItem[];
  emptyMessage?: string;
};

export type FitlBreadcrumb = {
  id: string;
  label: string;
  nodeId?: string;
};

export type FitlSearchResult = {
  id: string;
  label: string;
  kind: FitlFocusKind;
  summary: string;
};

export type FitlExplorerDossier = {
  title: string;
  subtitle: string;
  description: string;
  breadcrumbs: FitlBreadcrumb[];
  sections: FitlDossierSection[];
  references: FitlReference[];
};

export type FitlExplorerModel = {
  nodes: FitlNode[];
  edges: FitlEdge[];
  focusNode: FitlNode;
  focusKind: FitlFocusKind;
  highlightedNodeIds: Set<string>;
  dossier: FitlExplorerDossier;
  aiBriefMarkdown: string;
  searchResults: FitlSearchResult[];
  availableKinds: FitlNodeKind[];
  neighborhoodKindCounts: Map<FitlNodeKind, number>;
  canInspectImplementation: boolean;
  blockedMessage?: string;
};
