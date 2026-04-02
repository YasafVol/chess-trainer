import { startTransition, useMemo, useState, useTransition } from "react";
import { buildFitlExplorerModel, buildFitlRouteSearchString, listFitlNodeKinds, normalizeFitlRouteSearch } from "../domain/fitlGraph.js";
import type {
  FitlDepth,
  FitlDossierItem,
  FitlGraphSnapshot,
  FitlNodeKind,
  FitlRouteSearch
} from "../domain/fitlGraphTypes.js";
import { FitlMapCanvas } from "./FitlMapCanvas.js";
import { buildFitlCanvasModel } from "./fitlMapView.js";

type Pane = "map" | "details";

export function FitlMapExplorer(props: {
  snapshot: FitlGraphSnapshot;
  routeState: FitlRouteSearch;
  onRouteStateChange: (next: Partial<FitlRouteSearch>) => void;
}) {
  const allKinds = useMemo(() => listFitlNodeKinds(props.snapshot), [props.snapshot]);
  const [selectedKinds, setSelectedKinds] = useState<FitlNodeKind[]>(() => allKinds);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [activePane, setActivePane] = useState<Pane>("map");
  const [, startNavigationTransition] = useTransition();

  const explorerModel = useMemo(
    () =>
      buildFitlExplorerModel(props.snapshot, {
        ...props.routeState,
        kinds: selectedKinds
      }),
    [allKinds, props.routeState, props.snapshot, selectedKinds]
  );
  const canvas = useMemo(
    () => buildFitlCanvasModel(explorerModel, { depth: props.routeState.depth }),
    [explorerModel, props.routeState.depth]
  );

  function updateRouteState(next: Partial<FitlRouteSearch>) {
    startNavigationTransition(() => {
      props.onRouteStateChange(next);
    });
  }

  function applyFocus(nextFocus?: string) {
    const nextNode = nextFocus ? props.snapshot.nodes.find((node) => node.id === nextFocus) : undefined;
    const nextDepth =
      props.routeState.depth === "implementation" &&
      nextNode &&
      nextNode.kind !== "vertical" &&
      nextNode.kind !== "tool"
        ? "architecture"
        : props.routeState.depth === "implementation" && !nextNode
          ? "summary"
          : props.routeState.depth;

    updateRouteState({
      focus: nextFocus,
      depth: nextDepth
    });
  }

  function resetView() {
    setSelectedKinds(allKinds);
    setActivePane("map");
    setCopyStatus(null);
    updateRouteState({
      focus: undefined,
      depth: "summary",
      q: undefined,
      includeDeferred: false
    });
  }

  function setDepth(depth: FitlDepth) {
    updateRouteState({ depth });
  }

  function toggleKind(kind: FitlNodeKind) {
    setSelectedKinds((current) =>
      current.includes(kind) ? current.filter((value) => value !== kind) : [...current, kind]
    );
  }

  async function copyAiBrief() {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard access is not available in this browser.");
      }
      await navigator.clipboard.writeText(explorerModel.aiBriefMarkdown);
      setCopyStatus("AI change brief copied.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Copy failed.";
      setCopyStatus(message);
    }
  }

  return (
    <section className="page stack-gap">
      <div className="stack-gap">
        <div className="inline-actions">
          <a href="/backoffice" className="action-button">Back to backoffice</a>
        </div>

        <div>
          <h2>FITL Explorer</h2>
          <p className="muted">Start from a feature or tool, then deepen into architecture or implementation only when the current focus justifies it.</p>
        </div>
      </div>

      <div className="fitl-toolbar fitl-toolbar-primary">
        <div className="fitl-search-group">
          <label className="fitl-search-field">
            <span className="fitl-toolbar-label">Search</span>
            <input
              className="config-input"
              type="search"
              value={props.routeState.q ?? ""}
              onChange={(event) => updateRouteState({ q: event.target.value || undefined })}
              placeholder="Search features, intents, tools..."
            />
          </label>
          {(props.routeState.q ?? "").length > 0 ? (
            <div className="fitl-search-results">
              {explorerModel.searchResults.length > 0 ? (
                explorerModel.searchResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    className="fitl-search-result"
                    onClick={() => {
                      applyFocus(result.id);
                      setActivePane("details");
                    }}
                  >
                    <span className="fitl-search-result-kind">{result.kind}</span>
                    <strong>{result.label}</strong>
                    <span className="muted">{result.summary}</span>
                  </button>
                ))
              ) : (
                <div className="fitl-search-empty">
                  <strong>No focused entry points match this query.</strong>
                  <span className="muted">Search targets project, intent, vertical, and tool nodes.</span>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="fitl-toolbar-group">
          <span className="fitl-toolbar-label">Depth</span>
          {(["summary", "architecture", "implementation"] as const).map((depth) => {
            const disabled =
              depth === "implementation" &&
              !explorerModel.canInspectImplementation &&
              props.routeState.depth !== "implementation";
            return (
              <button
                key={depth}
                type="button"
                className={`fitl-toggle${props.routeState.depth === depth ? " selected" : ""}`}
                onClick={() => setDepth(depth)}
                disabled={disabled}
                title={disabled ? "Select a vertical or tool first." : undefined}
              >
                {depth}
              </button>
            );
          })}
        </div>

        <label className="fitl-inline-field">
          <input
            type="checkbox"
            checked={props.routeState.includeDeferred}
            onChange={(event) => updateRouteState({ includeDeferred: event.target.checked })}
          />
          <span>Include deferred surfaces</span>
        </label>

        <button type="button" className="action-button" onClick={resetView}>
          Reset view
        </button>
      </div>

      <div className="fitl-pane-tabs" role="tablist" aria-label="FITL explorer panes">
        <button
          type="button"
          className={`fitl-pane-tab${activePane === "map" ? " selected" : ""}`}
          onClick={() => setActivePane("map")}
        >
          Map
        </button>
        <button
          type="button"
          className={`fitl-pane-tab${activePane === "details" ? " selected" : ""}`}
          onClick={() => setActivePane("details")}
        >
          Details
        </button>
      </div>

      <div className="fitl-layout">
        <section className={`fitl-pane fitl-graph-column${activePane === "details" ? " mobile-hidden" : ""}`}>
          {explorerModel.blockedMessage ? (
            <div className="fitl-blocked-state">
              <strong>{explorerModel.blockedMessage}</strong>
              <p className="muted">Stay in summary or architecture until you pick a vertical or tool.</p>
            </div>
          ) : null}

          <FitlMapCanvas
            canvas={canvas}
            onFocusNode={(nodeId) => {
              const nextFocus = props.routeState.focus === nodeId ? undefined : nodeId;
              startTransition(() => {
                applyFocus(nextFocus);
                setActivePane("details");
              });
            }}
          />

          <details className="fitl-advanced-filters">
            <summary>Advanced filters</summary>
            <div className="fitl-advanced-body">
              <p className="muted">These filters only affect the map. The dossier keeps the full FITL neighborhood for the current focus.</p>
              <div className="chip-row">
                {allKinds.map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    className={`fitl-chip-button${selectedKinds.includes(kind) ? " selected" : ""}`}
                    onClick={() => toggleKind(kind)}
                  >
                    {kind.replace("_", " ")} ({explorerModel.neighborhoodKindCounts.get(kind) ?? 0})
                  </button>
                ))}
              </div>
            </div>
          </details>
        </section>

        <aside className={`fitl-details${activePane === "map" ? " mobile-hidden-details" : ""}`}>
          <div className="fitl-details-header fitl-details-sticky">
            <div className="stack-gap-sm">
              <nav className="fitl-breadcrumbs" aria-label="FITL breadcrumbs">
                {explorerModel.dossier.breadcrumbs.map((crumb) => (
                  <button
                    key={crumb.id}
                    type="button"
                    className="fitl-breadcrumb"
                    onClick={() => {
                      if (crumb.nodeId) {
                        applyFocus(crumb.nodeId === "project:web-app" ? undefined : crumb.nodeId);
                      }
                    }}
                  >
                    {crumb.label}
                  </button>
                ))}
              </nav>
              <div>
                <h3 className="fitl-selection-title">{explorerModel.dossier.title}</h3>
                <p className="muted">{explorerModel.dossier.subtitle}</p>
              </div>
            </div>

            <button type="button" className="action-button" onClick={() => void copyAiBrief()}>
              Copy AI change brief
            </button>
          </div>

          <p>{explorerModel.dossier.description}</p>
          {copyStatus ? <p className="muted">{copyStatus}</p> : null}

          {explorerModel.dossier.sections.map((section) => (
            <section key={section.id} className="fitl-details-section">
              <strong>{section.title}</strong>
              {section.items.length > 0 ? (
                <ul className="list fitl-details-list">
                  {section.items.map((item) => (
                    <li key={item.id}>
                      {renderItem(item)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">{section.emptyMessage}</p>
              )}
            </section>
          ))}

          <section className="fitl-details-section">
            <strong>References</strong>
            <ul className="list fitl-details-list">
              {explorerModel.dossier.references.map((reference) => (
                <li key={`${reference.type}:${reference.path}`}>
                  <span className="fitl-item-label">{reference.label}</span>
                  <div className="fitl-target">
                    <span className="fitl-target-label">{reference.type}</span>
                    <code>{reference.path}</code>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="fitl-details-section">
            <strong>Shareable URL</strong>
            <div className="fitl-target">
              <span className="fitl-target-label">Route</span>
              <code>/backoffice/fitl-map{buildFitlRouteSearchString(props.routeState) ? `?${buildFitlRouteSearchString(props.routeState)}` : ""}</code>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

function renderItem(item: FitlDossierItem) {
  return (
    <>
      <span className="fitl-item-label">{item.label}</span>
      {item.description ? <span className="muted">{item.description}</span> : null}
      {item.target ? (
        <div className="fitl-target">
          <span className="fitl-target-label">{item.target.type}</span>
          <code>{item.target.path}</code>
        </div>
      ) : null}
    </>
  );
}

export function mergeRouteState(current: FitlRouteSearch, next: Partial<FitlRouteSearch>) {
  return normalizeFitlRouteSearch({
    ...current,
    ...next
  });
}
