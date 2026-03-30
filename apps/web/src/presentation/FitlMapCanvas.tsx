import { cn } from "../lib/utils.js";
import type { FitlCanvasModel } from "./fitlMapView.js";

export function FitlMapCanvas(props: { canvas: FitlCanvasModel; onFocusNode: (nodeId: string) => void }) {
  if (props.canvas.nodes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-muted-foreground/30 bg-card/50 p-6">
        <strong className="text-sm">No FITL nodes match the current search and filter set.</strong>
        <p className="text-sm text-muted-foreground">Clear the search term or re-enable more node kinds to expand the map again.</p>
      </div>
    );
  }

  const laneTemplate = props.canvas.lanes.map((lane) => `${lane.width}px`).join(" ");

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-5" style={{ gridTemplateColumns: laneTemplate }}>
        {props.canvas.lanes.map((lane) => (
          <div key={lane.id} className="rounded-full bg-foreground/5 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{lane.label}</div>
        ))}
      </div>

      <div className="overflow-auto rounded-2xl border border-border/20 bg-gradient-to-b from-white to-slate-50/90">
        <div className="fitl-canvas-surface" style={{ width: props.canvas.width, height: props.canvas.height }}>
          {props.canvas.lanes.map((lane) => (
            <div
              key={lane.id}
              className="fitl-canvas-lane"
              style={{ left: lane.x, width: lane.width, height: props.canvas.height }}
            />
          ))}

          <svg className="fitl-canvas-edges" width={props.canvas.width} height={props.canvas.height} aria-hidden="true">
            {props.canvas.edges.map((edge) => (
              <path
                key={edge.id}
                d={edge.path}
                className={cn("fitl-canvas-edge", edge.isHighlighted && "highlighted")}
                data-kind={edge.kind}
              />
            ))}
          </svg>

          {props.canvas.nodes.map((node) => (
            <button
              key={node.id}
              type="button"
              className={cn(
                "fitl-node-card",
                node.isSelected && "selected",
                node.isConnected && "connected",
                node.isMuted && "opacity-50"
              )}
              style={{ left: node.x, top: node.y, width: node.width, height: node.height }}
              onClick={() => props.onFocusNode(node.id)}
              data-fitl-node-id={node.id}
              data-fitl-kind={node.kind}
            >
              <span className="flex flex-wrap gap-2 text-[0.69rem] font-extrabold uppercase tracking-wider text-muted-foreground">
                <span>{node.kind.replace("_", " ")}</span>
                {node.lifecycle ? <span>{node.lifecycle}</span> : null}
              </span>
              <strong className="text-sm">{node.label}</strong>
              <span className="line-clamp-2 text-xs text-muted-foreground">{node.summary}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
