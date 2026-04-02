import type { FitlCanvasModel } from "./fitlMapView.js";

export function FitlMapCanvas(props: { canvas: FitlCanvasModel; onFocusNode: (nodeId: string) => void }) {
  if (props.canvas.nodes.length === 0) {
    return (
      <div className="empty-state">
        <strong>No FITL nodes match the current search and filter set.</strong>
        <p className="muted">Clear the search term or re-enable more node kinds to expand the map again.</p>
      </div>
    );
  }

  const laneTemplate = props.canvas.lanes.map((lane) => `${lane.width}px`).join(" ");

  return (
    <div className="fitl-canvas-shell">
      <div className="fitl-lane-strip" style={{ gridTemplateColumns: laneTemplate }}>
        {props.canvas.lanes.map((lane) => (
          <div key={lane.id} className="fitl-lane-chip">{lane.label}</div>
        ))}
      </div>

      <div className="fitl-canvas-scroll">
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
                className={`fitl-canvas-edge${edge.isHighlighted ? " highlighted" : ""}`}
                data-kind={edge.kind}
              />
            ))}
          </svg>

          {props.canvas.nodes.map((node) => (
            <button
              key={node.id}
              type="button"
              className={`fitl-node-card${node.isSelected ? " selected" : ""}${node.isConnected ? " connected" : ""}${node.isMuted ? " muted" : ""}`}
              style={{ left: node.x, top: node.y, width: node.width, height: node.height }}
              onClick={() => props.onFocusNode(node.id)}
              data-fitl-node-id={node.id}
              data-fitl-kind={node.kind}
            >
              <span className="fitl-node-meta">
                <span>{node.kind.replace("_", " ")}</span>
                {node.lifecycle ? <span>{node.lifecycle}</span> : null}
              </span>
              <strong>{node.label}</strong>
              <span className="muted fitl-node-summary">{node.summary}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
