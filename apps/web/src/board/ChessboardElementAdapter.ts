import "chessboard-element";
import type { BoardAdapter, BoardDropEvent, BoardOrientation } from "./BoardAdapter";

type ChessBoardElementLike = HTMLElement & {
  setPosition: (fen: string, animated?: boolean) => void;
};

type ChessboardDropDetail = {
  source: unknown;
  target: unknown;
  piece: unknown;
  setAction: (action: "drop" | "snapback" | "trash") => void;
};

function isSquare(value: unknown): value is string {
  return typeof value === "string" && /^[a-h][1-8]$/.test(value);
}

export class ChessboardElementAdapter implements BoardAdapter {
  private boardEl: ChessBoardElementLike;
  private mounted = false;

  constructor() {
    this.boardEl = document.createElement("chess-board") as ChessBoardElementLike;
    this.boardEl.setAttribute("show-notation", "true");
    this.boardEl.setAttribute("draggable-pieces", "true");
    this.boardEl.setAttribute("drop-off-board", "snapback");
    this.boardEl.setAttribute("animation-duration", "180");
    this.boardEl.style.width = "100%";
    this.boardEl.style.maxWidth = "560px";
    this.boardEl.style.aspectRatio = "1 / 1";
    this.boardEl.style.display = "block";
  }

  mount(container: HTMLElement): void {
    if (this.mounted) return;
    container.replaceChildren(this.boardEl);
    this.mounted = true;
  }

  setPosition(fen: string, animated: boolean = true): void {
    this.boardEl.setPosition(fen, animated);
  }

  setOrientation(orientation: BoardOrientation): void {
    this.boardEl.setAttribute("orientation", orientation);
  }

  onDrop(handler: (event: BoardDropEvent) => void | Promise<void>): () => void {
    const listener = (event: Event) => {
      const customEvent = event as CustomEvent<ChessboardDropDetail>;
      const detail = customEvent.detail;
      if (!detail || typeof detail.setAction !== "function") return;

      if (!isSquare(detail.source) || !isSquare(detail.target) || typeof detail.piece !== "string") {
        detail.setAction("snapback");
        return;
      }

      const payload: BoardDropEvent = {
        from: detail.source,
        to: detail.target,
        piece: detail.piece,
        setAction: detail.setAction
      };

      void Promise.resolve(handler(payload)).catch(() => {
        detail.setAction("snapback");
      });
    };

    this.boardEl.addEventListener("drop", listener);
    return () => {
      this.boardEl.removeEventListener("drop", listener);
    };
  }

  destroy(): void {
    this.boardEl.remove();
    this.mounted = false;
  }
}
