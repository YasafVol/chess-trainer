export type BoardOrientation = "white" | "black";
export type BoardHighlightTone = "default" | "error";

export type BoardDropAction = "drop" | "snapback" | "trash";

export type BoardDropEvent = {
  from: string;
  to: string;
  piece: string;
  setAction: (action: BoardDropAction) => void;
};

export interface BoardAdapter {
  mount(container: HTMLElement): void;
  setPosition(fen: string, animated?: boolean): void;
  setOrientation(orientation: BoardOrientation): void;
  resize(): void;
  setHighlightedSquares(squares: string[], tone?: BoardHighlightTone): void;
  onDrop(handler: (event: BoardDropEvent) => void | Promise<void>): () => void;
  destroy(): void;
}
