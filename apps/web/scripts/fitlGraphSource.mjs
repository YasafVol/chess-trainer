import { readFile } from "node:fs/promises";
import { basename, dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const repoRoot = resolve(here, "..", "..", "..");
const docsRoot = resolve(repoRoot, "docs");
const webRoot = resolve(repoRoot, "apps", "web");

const CANONICAL_LAYERS = ["contracts", "domain", "application", "adapters", "presentation", "composition"];
const FEATURE_TO_VERTICAL = new Map([
  ["Import PGN and validate", "v1"],
  ["Replay, controls, and manual move flow", "v2"],
  ["Engine analysis and annotations", "v3"],
  ["Library and game lifecycle", "v4"],
  ["Puzzle generation and review", "v5"]
]);
const MODULE_BY_PREFIX = new Map([
  ["apps/web/", "module:web-app"],
  ["packages/chess-core/", "module:chess-core-package"]
]);
const VERTICAL_FILE_OVERRIDES = {
  v6: [
    ["application", "apps/web/src/routes/game.tsx"],
    ["adapters", "apps/web/src/board/ChessboardElementAdapter.ts"],
    ["adapters", "apps/web/src/engine/engineClient.ts"],
    ["adapters", "apps/web/src/engine/engine.worker.ts"],
    ["presentation", "apps/web/src/presentation/gameView.ts"],
    ["presentation", "apps/web/src/presentation/analysisView.ts"]
  ],
  v7: [
    ["application", "apps/web/src/application/runAnalysisBenchmark.ts"],
    ["adapters", "apps/web/src/lib/storage/repositories/benchmarkAnalysisRepo.ts"],
    ["presentation", "apps/web/src/routes/backoffice.tsx"],
    ["presentation", "apps/web/src/routes/analysisBenchmark.tsx"],
    ["presentation", "apps/web/src/presentation/backofficeView.ts"],
    ["presentation", "apps/web/src/presentation/analysisBenchmarkView.ts"]
  ]
};
const REQUIRED_VERTICAL_SECTIONS = ["Business/User Intent", "Impacted Layers", "Tests and Acceptance Criteria"];
const REQUIRED_LAYER_SECTIONS = ["Purpose", "Features / Responsibilities", "Key Files"];
const REQUIRED_MODULE_SECTIONS = ["Scope", "Layer Placement", "Notes"];

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function layerIdFromName(value) {
  return `layer:${slugify(value)}`;
}

function titleFromMarkdown(markdown) {
  const match = markdown.match(/^#\s+(.+)$/m);
  if (!match) {
    throw new Error("Missing top-level markdown title.");
  }
  return match[1].trim();
}

function splitSections(markdown) {
  const sections = new Map();
  const matches = [...markdown.matchAll(/^##\s+(.+)$/gm)];
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const title = match[1].trim();
    const start = match.index + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index : markdown.length;
    sections.set(title, markdown.slice(start, end).trim());
  }
  return sections;
}

function assertSections(docPath, sections, requiredSections) {
  for (const title of requiredSections) {
    if (!sections.has(title)) {
      throw new Error(`${docPath} is missing required section "${title}".`);
    }
  }
}

function firstParagraph(section) {
  const [paragraph] = section
    .split(/\n\s*\n/g)
    .map((entry) => normalizeWhitespace(entry))
    .filter(Boolean);
  return paragraph ?? "";
}

function extractInlineCode(section) {
  const codes = [];
  for (const match of section.matchAll(/`([^`]+)`/g)) {
    codes.push(match[1]);
  }
  return codes;
}

function extractBulletLines(section) {
  return section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, "").trim());
}

function extractNumberedLines(section) {
  return section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^\d+\.\s+/.test(line))
    .map((line) => line.replace(/^\d+\.\s+/, "").trim());
}

function looksLikeRepoPath(value) {
  return /^(apps|packages|docs|Spec|assets)\//.test(value);
}

function looksLikeTestPath(value) {
  return /\.(test|spec)\.[jt]sx?$/.test(value);
}

function looksLikeCommand(value) {
  return /^npm run /.test(value);
}

function dedupeEntries(values) {
  return [...new Set(values.filter(Boolean))];
}

function repoPathFromAbsolute(absolutePath) {
  return relative(repoRoot, absolutePath).replace(/\\/g, "/");
}

function shortLabelFromPath(path) {
  if (looksLikeCommand(path)) {
    return path;
  }
  return basename(path);
}

function summarizeLayerName(layerId) {
  return layerId.replace("layer:", "").replace(/(^\w|-\w)/g, (token) => token.replace("-", " ").toUpperCase());
}

function determineModuleId(path) {
  for (const [prefix, moduleId] of MODULE_BY_PREFIX.entries()) {
    if (path.startsWith(prefix)) {
      return moduleId;
    }
  }
  return null;
}

function keywordToVerticals(text) {
  const normalized = text.toLowerCase();
  const matches = new Set();
  if (normalized.includes("import")) matches.add("vertical:v1-import-and-persist-pgn");
  if (normalized.includes("replay") || normalized.includes("move pane")) {
    matches.add("vertical:v2-replay-and-navigation");
    matches.add("vertical:v6-game-view-and-analysis-workbench");
  }
  if (normalized.includes("analysis")) {
    matches.add("vertical:v3-engine-analysis-and-annotations");
    matches.add("vertical:v6-game-view-and-analysis-workbench");
    matches.add("vertical:v7-backoffice-and-benchmarking");
  }
  if (normalized.includes("library") || normalized.includes("game")) {
    matches.add("vertical:v4-library-and-game-lifecycle");
    matches.add("vertical:v6-game-view-and-analysis-workbench");
  }
  if (normalized.includes("puzzle")) {
    matches.add("vertical:v5-puzzle-generation-and-review");
    matches.add("vertical:v7-backoffice-and-benchmarking");
  }
  if (normalized.includes("backoffice")) {
    matches.add("vertical:v7-backoffice-and-benchmarking");
  }
  if (normalized.includes("deployment") || normalized.includes("release") || normalized.includes("vercel")) {
    matches.add("vertical:v7-backoffice-and-benchmarking");
  }
  return [...matches];
}

class GraphBuilder {
  constructor(projectSummary) {
    this.nodes = new Map();
    this.edges = new Map();
    this.projectId = "project:web-app";
    this.addNode({
      id: this.projectId,
      kind: "project",
      label: "Chess Trainer Web App",
      summary: projectSummary,
      lifecycle: "active",
      system: "internal",
      references: [
        { type: "doc", label: "docs/README.md", path: "docs/README.md" },
        { type: "doc", label: "apps/web/README.md", path: "apps/web/README.md" }
      ],
      tags: ["local-first", "fitl", "web"]
    });
  }

  addNode(node) {
    const existing = this.nodes.get(node.id);
    if (!existing) {
      this.nodes.set(node.id, {
        references: [],
        tags: [],
        ...node
      });
      return;
    }

    this.nodes.set(node.id, {
      ...existing,
      ...node,
      summary: node.summary || existing.summary,
      description: node.description || existing.description,
      lifecycle: node.lifecycle || existing.lifecycle,
      system: node.system || existing.system,
      references: dedupeByKey([...(existing.references ?? []), ...(node.references ?? [])], (reference) => `${reference.type}:${reference.path}:${reference.label}`),
      tags: dedupeEntries([...(existing.tags ?? []), ...(node.tags ?? [])])
    });
  }

  addReference(nodeId, reference) {
    const existing = this.nodes.get(nodeId);
    if (!existing) return;
    this.nodes.set(nodeId, {
      ...existing,
      references: dedupeByKey([...(existing.references ?? []), reference], (entry) => `${entry.type}:${entry.path}:${entry.label}`)
    });
  }

  addEdge(edge) {
    const id = edge.id ?? `${edge.from}->${edge.kind}->${edge.to}`;
    if (this.edges.has(id)) return;
    this.edges.set(id, { id, ...edge });
  }

  ensureLayerNode(layerName, summary, referencePath) {
    const layerId = layerIdFromName(layerName);
    this.addNode({
      id: layerId,
      kind: "layer",
      label: summarizeLayerName(layerId),
      summary,
      lifecycle: "active",
      system: "internal",
      references: referencePath ? [{ type: "doc", label: referencePath, path: referencePath }] : [],
      tags: [layerId.replace("layer:", "")]
    });
    this.addEdge({ from: this.projectId, to: layerId, kind: "touches" });
    return layerId;
  }

  ensureModuleNode(moduleId, label, summary, docPath) {
    this.addNode({
      id: moduleId,
      kind: "module",
      label,
      summary,
      lifecycle: "active",
      system: "internal",
      references: docPath ? [{ type: "doc", label: docPath, path: docPath }] : [],
      tags: [moduleId.replace("module:", "")]
    });
    this.addEdge({ from: this.projectId, to: moduleId, kind: "implemented_by" });
    return moduleId;
  }

  ensureFileNode(path) {
    const id = `file:${path}`;
    this.addNode({
      id,
      kind: "file",
      label: shortLabelFromPath(path),
      summary: path,
      lifecycle: "active",
      system: determineModuleId(path)?.startsWith("module:") ? "internal" : undefined,
      references: [{ type: "file", label: path, path }],
      tags: [extname(path).replace(".", "")]
    });
    return id;
  }

  ensureTestNode(pathOrCommand) {
    const id = `test:${slugify(pathOrCommand)}`;
    this.addNode({
      id,
      kind: "test_gate",
      label: shortLabelFromPath(pathOrCommand),
      summary: pathOrCommand,
      lifecycle: "active",
      system: "internal",
      references: [
        looksLikeCommand(pathOrCommand)
          ? { type: "command", label: pathOrCommand, path: pathOrCommand }
          : { type: "test", label: pathOrCommand, path: pathOrCommand }
      ],
      tags: [looksLikeCommand(pathOrCommand) ? "command" : "test"]
    });
    this.addEdge({ from: this.projectId, to: id, kind: "validated_by" });
    return id;
  }

  ensureRiskNode({ id, label, summary, references = [], lifecycle = "active" }) {
    const nodeId = `risk:${id}`;
    this.addNode({
      id: nodeId,
      kind: "risk",
      label,
      summary,
      lifecycle,
      system: "internal",
      references,
      tags: ["risk"]
    });
    this.addEdge({ from: this.projectId, to: nodeId, kind: "constrained_by" });
    return nodeId;
  }

  ensureDecisionNode({ id, label, summary, references = [], lifecycle = "active" }) {
    const nodeId = `decision:${id}`;
    this.addNode({
      id: nodeId,
      kind: "decision",
      label,
      summary,
      lifecycle,
      system: "internal",
      references,
      tags: ["decision"]
    });
    this.addEdge({ from: this.projectId, to: nodeId, kind: "constrained_by" });
    return nodeId;
  }

  finalize(sourceDocs) {
    return {
      version: 1,
      generatedAt: new Date().toISOString(),
      sourceDocs: dedupeEntries(sourceDocs).sort(),
      nodes: [...this.nodes.values()].sort(sortNodes),
      edges: [...this.edges.values()].sort(sortEdges)
    };
  }
}

function dedupeByKey(values, selectKey) {
  const map = new Map();
  for (const value of values) {
    map.set(selectKey(value), value);
  }
  return [...map.values()];
}

function sortNodes(left, right) {
  return left.id.localeCompare(right.id);
}

function sortEdges(left, right) {
  return left.id.localeCompare(right.id);
}

export function parseVerticalDoc(docPath, markdown) {
  const title = titleFromMarkdown(markdown);
  const sections = splitSections(markdown);
  assertSections(docPath, sections, REQUIRED_VERTICAL_SECTIONS);
  const featureTitle = title.replace(/^V\d+:\s*/, "");
  const impactedLayers = extractBulletLines(sections.get("Impacted Layers"))
    .map((line) => line.match(/^([^:]+):/)?.[1]?.trim())
    .filter(Boolean)
    .map((layerName) => layerName.toLowerCase());
  return {
    id: `vertical:${basename(docPath, ".md")}`,
    docPath,
    title,
    featureTitle,
    intent: firstParagraph(sections.get("Business/User Intent")),
    impactedLayers,
    testRefs: dedupeEntries(extractInlineCode(sections.get("Tests and Acceptance Criteria"))),
    fileRefs: dedupeEntries(extractInlineCode(markdown).filter(looksLikeRepoPath)),
    notes: firstParagraph(sections.get("Flow Narrative") ?? sections.get("Benchmark Notes") ?? sections.get("Risk/Deferment References") ?? ""),
    references: dedupeEntries([
      ...extractInlineCode(sections.get("Risk/Deferment References") ?? ""),
      ...extractInlineCode(sections.get("Tests and Acceptance Criteria"))
    ])
  };
}

function parseLayerDoc(docPath, markdown) {
  const title = titleFromMarkdown(markdown);
  const sections = splitSections(markdown);
  assertSections(docPath, sections, REQUIRED_LAYER_SECTIONS);
  return {
    id: layerIdFromName(title.replace(/\s+Layer$/, "")),
    title: title.replace(/\s+Layer$/, ""),
    summary: firstParagraph(sections.get("Purpose")),
    fileRefs: dedupeEntries(extractInlineCode(sections.get("Key Files")).filter(looksLikeRepoPath)),
    docPath
  };
}

function parseModuleDoc(docPath, markdown) {
  const title = titleFromMarkdown(markdown).replace(/^Module:\s*/, "");
  const sections = splitSections(markdown);
  assertSections(docPath, sections, REQUIRED_MODULE_SECTIONS);
  const layerPlacement = sections.get("Layer Placement");
  const lines = layerPlacement.split("\n");
  let currentLayer = null;
  const entries = [];
  for (const rawLine of lines) {
    const line = rawLine.trim();
    const layerMatch = line.match(/^-\s+([^:]+):/);
    if (layerMatch) {
      currentLayer = layerMatch[1].trim().toLowerCase();
      continue;
    }
    if (!currentLayer) continue;
    for (const code of extractInlineCode(line)) {
      if (!looksLikeRepoPath(code)) continue;
      entries.push([currentLayer, code]);
    }
  }

  return {
    id: title === "Web App" ? "module:web-app" : "module:chess-core-package",
    label: title,
    summary: firstParagraph(sections.get("Scope")) || firstParagraph(sections.get("Notes")),
    fileEntries: entries,
    docPath
  };
}

function parseFeatureMatrix(markdown) {
  const sections = [...markdown.matchAll(/^###\s+(.+)$/gm)];
  const output = [];
  for (let index = 0; index < sections.length; index += 1) {
    const section = sections[index];
    const title = section[1].trim();
    const start = section.index + section[0].length;
    const end = index + 1 < sections.length ? sections[index + 1].index : markdown.length;
    const body = markdown.slice(start, end);
    let currentLayer = null;
    const fileEntries = [];
    for (const rawLine of body.split("\n")) {
      const line = rawLine.trim();
      const layerMatch = line.match(/^-\s+([^:]+):/);
      if (layerMatch) {
        currentLayer = layerMatch[1].trim().toLowerCase();
        continue;
      }
      if (!currentLayer) continue;
      for (const code of extractInlineCode(line)) {
        if (!looksLikeRepoPath(code)) continue;
        fileEntries.push([currentLayer, code]);
      }
    }
    output.push({ title, fileEntries });
  }
  return output;
}

function parseDecisionProfile(docPath, markdown) {
  const sections = splitSections(markdown);
  const locked = extractNumberedLines(sections.get("Locked Decisions") ?? "");
  const deferred = extractNumberedLines(sections.get("Deferred Items") ?? "");
  return {
    locked: locked.map((item, index) => ({
      id: `locked-${index + 1}`,
      label: item.split(".")[0] || item,
      summary: item,
      references: [{ type: "doc", label: docPath, path: docPath }]
    })),
    deferred: deferred.map((item, index) => ({
      id: `deferred-${index + 1}`,
      label: `Deferred: ${item}`,
      summary: item,
      lifecycle: "deferred",
      references: [{ type: "doc", label: docPath, path: docPath }]
    }))
  };
}

function parseKnownIssues(docPath, markdown) {
  const chunks = [...markdown.matchAll(/^###\s+\d+\.\s+(.+)$/gm)];
  const issues = [];
  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];
    const title = chunk[1].trim();
    const start = chunk.index + chunk[0].length;
    const end = index + 1 < chunks.length ? chunks[index + 1].index : markdown.length;
    const body = markdown.slice(start, end);
    const scopeLine = body.match(/-\s+Scope:\s+(.+)$/m)?.[1]?.trim() ?? "";
    const summaryLine = body.match(/-\s+Summary:\s+(.+)$/m)?.[1]?.trim() ?? firstParagraph(body);
    issues.push({
      id: slugify(title),
      label: title,
      summary: summaryLine,
      scope: scopeLine,
      references: [{ type: "doc", label: docPath, path: docPath }]
    });
  }
  return issues;
}

function parseOpenIssues(docPath, markdown) {
  const sections = splitSections(markdown);
  return extractNumberedLines(sections.get("Open Issues") ?? "").map((entry) => ({
    id: slugify(entry),
    label: entry,
    summary: entry,
    references: [{ type: "doc", label: docPath, path: docPath }]
  }));
}

function connectFile(builder, filePath, layerName, verticalId = null) {
  const fileId = builder.ensureFileNode(filePath);
  const moduleId = determineModuleId(filePath);
  if (moduleId) {
    builder.addEdge({ from: moduleId, to: fileId, kind: "implemented_by" });
  }
  if (layerName) {
    const layerId = layerIdFromName(layerName);
    builder.addEdge({ from: fileId, to: layerId, kind: "touches" });
  }
  if (verticalId) {
    builder.addEdge({ from: verticalId, to: fileId, kind: "implemented_by" });
  }
}

function mergeManifest(builder, manifest) {
  for (const tool of manifest.tools) {
    const nodeId = `tool:${tool.id}`;
    builder.addNode({
      id: nodeId,
      kind: "tool",
      label: tool.label,
      summary: tool.summary,
      lifecycle: tool.lifecycle,
      system: tool.system,
      references: tool.references ?? [],
      tags: [tool.lifecycle, tool.system]
    });

    builder.addEdge({ from: builder.projectId, to: nodeId, kind: tool.relationship });

    for (const layer of tool.layers ?? []) {
      builder.addEdge({ from: layerIdFromName(layer), to: nodeId, kind: tool.relationship === "deploys" ? "deploys" : "uses" });
    }

    for (const vertical of tool.verticals ?? []) {
      const verticalId = `vertical:${verticalToFilename(vertical)}`;
      builder.addEdge({ from: verticalId, to: nodeId, kind: tool.relationship });
    }
  }
}

function verticalToFilename(shortId) {
  const map = {
    v1: "v1-import-and-persist-pgn",
    v2: "v2-replay-and-navigation",
    v3: "v3-engine-analysis-and-annotations",
    v4: "v4-library-and-game-lifecycle",
    v5: "v5-puzzle-generation-and-review",
    v6: "v6-game-view-and-analysis-workbench",
    v7: "v7-backoffice-and-benchmarking"
  };
  return map[shortId];
}

async function readRepoFile(path) {
  return readFile(resolve(repoRoot, path), "utf8");
}

export async function buildFitlGraphSnapshot() {
  const sourceDocs = [];
  const appReadme = await readRepoFile("apps/web/README.md");
  sourceDocs.push("apps/web/README.md");
  const projectSummary = firstParagraph(appReadme);
  const builder = new GraphBuilder(projectSummary);

  const layerDocPaths = CANONICAL_LAYERS.map((layer) => `docs/architecture/layers/${layer}.md`);
  for (const docPath of layerDocPaths) {
    const markdown = await readRepoFile(docPath);
    sourceDocs.push(docPath);
    const layer = parseLayerDoc(docPath, markdown);
    builder.ensureLayerNode(layer.title, layer.summary, docPath);
    for (const fileRef of layer.fileRefs) {
      connectFile(builder, fileRef, layer.title.toLowerCase());
      builder.addReference(layer.id, { type: "file", label: fileRef, path: fileRef });
    }
  }

  const moduleDocPaths = ["docs/modules/web-app.md", "docs/modules/chess-core-package.md"];
  for (const docPath of moduleDocPaths) {
    const markdown = await readRepoFile(docPath);
    sourceDocs.push(docPath);
    const module = parseModuleDoc(docPath, markdown);
    builder.ensureModuleNode(module.id, module.label, module.summary, docPath);
    for (const [layerName, filePath] of module.fileEntries) {
      builder.addEdge({ from: module.id, to: layerIdFromName(layerName), kind: "touches" });
      connectFile(builder, filePath, layerName);
    }
  }

  const verticalDocPaths = [
    "docs/architecture/verticals/v1-import-and-persist-pgn.md",
    "docs/architecture/verticals/v2-replay-and-navigation.md",
    "docs/architecture/verticals/v3-engine-analysis-and-annotations.md",
    "docs/architecture/verticals/v4-library-and-game-lifecycle.md",
    "docs/architecture/verticals/v5-puzzle-generation-and-review.md",
    "docs/architecture/verticals/v6-game-view-and-analysis-workbench.md",
    "docs/architecture/verticals/v7-backoffice-and-benchmarking.md"
  ];

  for (const docPath of verticalDocPaths) {
    const markdown = await readRepoFile(docPath);
    sourceDocs.push(docPath);
    const vertical = parseVerticalDoc(docPath, markdown);
    const shortCode = vertical.title.match(/^V\d+/)?.[0] ?? vertical.featureTitle;
    const intentId = `intent:${basename(docPath, ".md")}`;

    builder.addNode({
      id: intentId,
      kind: "intent",
      label: vertical.featureTitle,
      summary: vertical.intent,
      lifecycle: "active",
      system: "internal",
      references: [{ type: "doc", label: docPath, path: docPath }],
      tags: [shortCode.toLowerCase()]
    });
    builder.addNode({
      id: vertical.id,
      kind: "vertical",
      label: `${shortCode} ${vertical.featureTitle}`,
      summary: vertical.intent,
      description: vertical.notes,
      lifecycle: "active",
      system: "internal",
      references: [{ type: "doc", label: docPath, path: docPath }],
      tags: [shortCode.toLowerCase()]
    });

    builder.addEdge({ from: builder.projectId, to: intentId, kind: "realizes" });
    builder.addEdge({ from: intentId, to: vertical.id, kind: "realizes" });

    for (const layerName of vertical.impactedLayers) {
      builder.addEdge({ from: vertical.id, to: layerIdFromName(layerName), kind: "touches" });
    }

    for (const reference of vertical.references) {
      if (looksLikeRepoPath(reference)) {
        builder.addReference(vertical.id, { type: "file", label: reference, path: reference });
      }
    }

    for (const ref of vertical.testRefs) {
      if (looksLikeCommand(ref) || looksLikeTestPath(ref)) {
        const testId = builder.ensureTestNode(ref);
        builder.addEdge({ from: vertical.id, to: testId, kind: "validated_by" });
      }
    }
  }

  const matrixPath = "docs/architecture/LAYER_X_FEATURE_MATRIX.md";
  sourceDocs.push(matrixPath);
  const matrixMarkdown = await readRepoFile(matrixPath);
  const matrixEntries = parseFeatureMatrix(matrixMarkdown);
  for (const entry of matrixEntries) {
    const verticalShortId = FEATURE_TO_VERTICAL.get(entry.title);
    if (!verticalShortId) continue;
    const verticalId = `vertical:${verticalToFilename(verticalShortId)}`;
    for (const [layerName, filePath] of entry.fileEntries) {
      connectFile(builder, filePath, layerName, verticalId);
      const moduleId = determineModuleId(filePath);
      if (moduleId) {
        builder.addEdge({ from: verticalId, to: moduleId, kind: "implemented_by" });
      }
    }
  }

  for (const [verticalShortId, entries] of Object.entries(VERTICAL_FILE_OVERRIDES)) {
    const verticalId = `vertical:${verticalToFilename(verticalShortId)}`;
    for (const [layerName, filePath] of entries) {
      connectFile(builder, filePath, layerName, verticalId);
      const moduleId = determineModuleId(filePath);
      if (moduleId) {
        builder.addEdge({ from: verticalId, to: moduleId, kind: "implemented_by" });
      }
    }
  }

  const decisionProfilePath = "docs/decisions/DECISION_PROFILE_2026-03-03.md";
  sourceDocs.push(decisionProfilePath);
  const decisionProfile = parseDecisionProfile(decisionProfilePath, await readRepoFile(decisionProfilePath));
  for (const decision of decisionProfile.locked) {
    const decisionId = builder.ensureDecisionNode(decision);
    for (const verticalId of keywordToVerticals(decision.summary)) {
      builder.addEdge({ from: verticalId, to: decisionId, kind: "constrained_by" });
    }
  }
  for (const decision of decisionProfile.deferred) {
    const decisionId = builder.ensureDecisionNode(decision);
    for (const verticalId of keywordToVerticals(decision.summary)) {
      builder.addEdge({ from: verticalId, to: decisionId, kind: "constrained_by" });
    }
  }

  const knownIssuesPath = "docs/decisions/known-issues.md";
  sourceDocs.push(knownIssuesPath);
  const knownIssues = parseKnownIssues(knownIssuesPath, await readRepoFile(knownIssuesPath));
  for (const issue of knownIssues) {
    const riskId = builder.ensureRiskNode(issue);
    for (const verticalId of keywordToVerticals(`${issue.scope} ${issue.summary}`)) {
      builder.addEdge({ from: verticalId, to: riskId, kind: "constrained_by" });
    }
  }

  const openIssuesPath = "docs/decisions/OPEN_ISSUES_AND_COMPROMISES.md";
  sourceDocs.push(openIssuesPath);
  const openIssues = parseOpenIssues(openIssuesPath, await readRepoFile(openIssuesPath));
  for (const issue of openIssues) {
    const riskId = builder.ensureRiskNode(issue);
    for (const verticalId of keywordToVerticals(issue.summary)) {
      builder.addEdge({ from: verticalId, to: riskId, kind: "constrained_by" });
    }
  }

  const manifestPath = "apps/web/fitl-tooling.manifest.json";
  sourceDocs.push(manifestPath);
  const manifest = JSON.parse(await readRepoFile(manifestPath));
  mergeManifest(builder, manifest);

  return builder.finalize(sourceDocs);
}

export function resolveGeneratedSnapshotPath() {
  return resolve(webRoot, "src", "generated", "fitlGraphSnapshot.json");
}

export function formatSnapshot(snapshot) {
  return `${JSON.stringify(snapshot, null, 2)}\n`;
}

export function resolveGeneratedModulePath() {
  return resolve(webRoot, "src", "generated", "fitlGraphSnapshot.ts");
}

export function formatSnapshotModule(snapshot) {
  return `import type { FitlGraphSnapshot } from "../domain/fitlGraphTypes.js";

export const fitlGraphSnapshot: FitlGraphSnapshot = ${JSON.stringify(snapshot, null, 2)};\n`;
}
