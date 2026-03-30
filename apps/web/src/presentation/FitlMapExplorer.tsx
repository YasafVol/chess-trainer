import { startTransition, useMemo, useState, useTransition } from "react";
import { Button } from "../components/ui/button.js";
import { Badge } from "../components/ui/badge.js";
import { Card, CardContent } from "../components/ui/card.js";
import { Input } from "../components/ui/input.js";
import { Checkbox } from "../components/ui/checkbox.js";
import { cn } from "../lib/utils.js";
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
    <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm space-y-5">
      <div className="space-y-3">
        <Button variant="outline" size="sm" asChild>
          <a href="/backoffice">Back to backoffice</a>
        </Button>

        <div>
          <h2 className="text-lg font-semibold">FITL Explorer</h2>
          <p className="text-sm text-muted-foreground">Start from a feature or tool, then deepen into architecture or implementation only when the current focus justifies it.</p>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3.5">
          <div className="relative flex min-w-[min(100%,360px)] flex-col gap-2.5">
            <label className="flex flex-col gap-2">
              <span className="text-[0.74rem] font-extrabold uppercase tracking-wider text-muted-foreground">Search</span>
              <Input
                type="search"
                value={props.routeState.q ?? ""}
                onChange={(event) => updateRouteState({ q: event.target.value || undefined })}
                placeholder="Search features, intents, tools..."
              />
            </label>
            {(props.routeState.q ?? "").length > 0 ? (
              <div className="absolute top-full left-0 z-10 mt-2 flex w-full max-w-[420px] flex-col gap-2 rounded-2xl border border-border/30 bg-card p-2.5 shadow-xl">
                {explorerModel.searchResults.length > 0 ? (
                  explorerModel.searchResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      className="flex flex-col items-start gap-1 rounded-xl border border-border/20 bg-muted/40 p-3 text-left transition-colors hover:border-accent/30 hover:bg-accent/5 cursor-pointer"
                      onClick={() => {
                        applyFocus(result.id);
                        setActivePane("details");
                      }}
                    >
                      <Badge variant="outline" className="text-[0.7rem]">{result.kind}</Badge>
                      <strong className="text-sm">{result.label}</strong>
                      <span className="text-xs text-muted-foreground">{result.summary}</span>
                    </button>
                  ))
                ) : (
                  <div className="flex flex-col gap-1 rounded-xl border border-border/20 bg-muted/40 p-3">
                    <strong className="text-sm">No focused entry points match this query.</strong>
                    <span className="text-xs text-muted-foreground">Search targets project, intent, vertical, and tool nodes.</span>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[0.74rem] font-extrabold uppercase tracking-wider text-muted-foreground">Depth</span>
            {(["summary", "architecture", "implementation"] as const).map((depth) => {
              const disabled =
                depth === "implementation" &&
                !explorerModel.canInspectImplementation &&
                props.routeState.depth !== "implementation";
              return (
                <button
                  key={depth}
                  type="button"
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm font-medium transition-all cursor-pointer",
                    props.routeState.depth === depth
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border bg-card text-foreground hover:bg-muted",
                    disabled && "opacity-45 cursor-not-allowed"
                  )}
                  onClick={() => setDepth(depth)}
                  disabled={disabled}
                  title={disabled ? "Select a vertical or tool first." : undefined}
                >
                  {depth}
                </button>
              );
            })}
          </div>

          <label className="inline-flex min-h-[44px] items-center gap-2.5">
            <Checkbox
              checked={props.routeState.includeDeferred}
              onCheckedChange={(checked) => updateRouteState({ includeDeferred: checked === true })}
            />
            <span className="text-sm">Include deferred surfaces</span>
          </label>

          <Button variant="outline" size="sm" onClick={resetView}>
            Reset view
          </Button>
        </div>
      </Card>

      <div className="hidden gap-2.5 max-[900px]:flex" role="tablist" aria-label="FITL explorer panes">
        {(["map", "details"] as const).map((pane) => (
          <button
            key={pane}
            type="button"
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition-all cursor-pointer",
              activePane === pane
                ? "border-accent bg-accent text-accent-foreground"
                : "border-border bg-card text-foreground hover:bg-muted"
            )}
            onClick={() => setActivePane(pane)}
          >
            {pane.charAt(0).toUpperCase() + pane.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.95fr)]">
        <section className={cn("min-w-0", activePane === "details" && "hidden lg:block")}>
          {explorerModel.blockedMessage ? (
            <Card className="mb-3.5 border-amber-300/30 bg-amber-50/50 p-3.5">
              <strong className="text-sm">{explorerModel.blockedMessage}</strong>
              <p className="text-sm text-muted-foreground">Stay in summary or architecture until you pick a vertical or tool.</p>
            </Card>
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

          <details className="mt-3.5 rounded-2xl border border-border/20 bg-card/80">
            <summary className="cursor-pointer p-3.5 font-bold text-sm">Advanced filters</summary>
            <div className="flex flex-col gap-3 px-4 pb-4">
              <p className="text-sm text-muted-foreground">These filters only affect the map. The dossier keeps the full FITL neighborhood for the current focus.</p>
              <div className="flex flex-wrap gap-2">
                {allKinds.map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-medium transition-all cursor-pointer",
                      selectedKinds.includes(kind)
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-border bg-card text-foreground hover:bg-muted"
                    )}
                    onClick={() => toggleKind(kind)}
                  >
                    {kind.replace("_", " ")} ({explorerModel.neighborhoodKindCounts.get(kind) ?? 0})
                  </button>
                ))}
              </div>
            </div>
          </details>
        </section>

        <aside className={cn("min-w-0 flex flex-col gap-4 rounded-2xl border border-border/20 bg-card p-4.5", activePane === "map" && "hidden lg:flex")}>
          <div className="sticky top-4 z-10 bg-card/95 pb-2">
            <div className="flex items-start justify-between gap-3.5">
              <div className="space-y-2">
                <nav className="flex flex-wrap gap-2" aria-label="FITL breadcrumbs">
                  {explorerModel.dossier.breadcrumbs.map((crumb) => (
                    <button
                      key={crumb.id}
                      type="button"
                      className="rounded-full border border-border/40 bg-card px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted cursor-pointer"
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
                  <h3 className="fitl-selection-title text-base font-semibold">{explorerModel.dossier.title}</h3>
                  <p className="text-sm text-muted-foreground">{explorerModel.dossier.subtitle}</p>
                </div>
              </div>

              <Button variant="outline" size="sm" onClick={() => void copyAiBrief()}>
                Copy AI change brief
              </Button>
            </div>
          </div>

          <p className="text-sm">{explorerModel.dossier.description}</p>
          {copyStatus ? <p className="text-sm text-muted-foreground">{copyStatus}</p> : null}

          {explorerModel.dossier.sections.map((section) => (
            <section key={section.id} className="flex flex-col gap-2">
              <strong className="text-sm">{section.title}</strong>
              {section.items.length > 0 ? (
                <ul className="space-y-2.5">
                  {section.items.map((item) => (
                    <li key={item.id} className="flex flex-col gap-1.5 rounded-xl border border-border/40 bg-muted/30 p-3">
                      {renderItem(item)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">{section.emptyMessage}</p>
              )}
            </section>
          ))}

          <section className="flex flex-col gap-2">
            <strong className="text-sm">References</strong>
            <ul className="space-y-2.5">
              {explorerModel.dossier.references.map((reference) => (
                <li key={`${reference.type}:${reference.path}`} className="flex flex-col gap-1.5 rounded-xl border border-border/40 bg-muted/30 p-3">
                  <span className="text-sm font-bold">{reference.label}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-[0.7rem]">{reference.type}</Badge>
                    <code className="text-xs text-muted-foreground">{reference.path}</code>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <strong className="text-sm">Shareable URL</strong>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-[0.7rem]">Route</Badge>
              <code className="text-xs text-muted-foreground">/backoffice/fitl-map{buildFitlRouteSearchString(props.routeState) ? `?${buildFitlRouteSearchString(props.routeState)}` : ""}</code>
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
      <span className="text-sm font-bold">{item.label}</span>
      {item.description ? <span className="text-xs text-muted-foreground">{item.description}</span> : null}
      {item.target ? (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-[0.7rem]">{item.target.type}</Badge>
          <code className="text-xs text-muted-foreground">{item.target.path}</code>
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
