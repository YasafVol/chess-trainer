import "chessboard-element";
import type { BoardAdapter, BoardDropEvent, BoardOrientation } from "./BoardAdapter";

type ChessBoardElementLike = HTMLElement & {
  setPosition: (fen: string, animated?: boolean) => void;
  resize: () => void;
  _highlightSquare?: (square: string, value?: boolean) => void;
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
  private highlightedSquares = new Set<string>();

  constructor() {
    this.boardEl = document.createElement("chess-board") as unknown as ChessBoardElementLike;
    this.boardEl.setAttribute("show-notation", "true");
    this.boardEl.setAttribute("draggable-pieces", "true");
    this.boardEl.setAttribute("drop-off-board", "snapback");
    this.boardEl.setAttribute("animation-duration", "180");
    this.boardEl.style.width = "100%";
    this.boardEl.style.height = "100%";
    this.boardEl.style.maxWidth = "100%";
    this.boardEl.style.aspectRatio = "1 / 1";
    this.boardEl.style.display = "block";
    this.boardEl.style.setProperty("--highlight-color", "rgba(212, 167, 44, 0.65)");
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

  resize(): void {
    this.boardEl.resize();
  }

  setHighlightedSquares(squares: string[]): void {
    const validSquares = squares.filter(isSquare);
    const next = new Set(validSquares);

    for (const square of this.highlightedSquares) {
      if (!next.has(square)) {
        this.boardEl._highlightSquare?.(square, false);
      }
    }

    for (const square of next) {
      if (!this.highlightedSquares.has(square)) {
        this.boardEl._highlightSquare?.(square, true);
      }
    }

    this.highlightedSquares = next;
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
    this.highlightedSquares.clear();
    this.boardEl.remove();
    this.mounted = false;
  }
}
