import "chessboard-element";
function isSquare(value) {
    return typeof value === "string" && /^[a-h][1-8]$/.test(value);
}
export class ChessboardElementAdapter {
    constructor() {
        this.mounted = false;
        this.boardEl = document.createElement("chess-board");
        this.boardEl.setAttribute("show-notation", "true");
        this.boardEl.setAttribute("draggable-pieces", "true");
        this.boardEl.setAttribute("drop-off-board", "snapback");
        this.boardEl.setAttribute("animation-duration", "180");
        this.boardEl.style.width = "100%";
        this.boardEl.style.maxWidth = "560px";
        this.boardEl.style.aspectRatio = "1 / 1";
        this.boardEl.style.display = "block";
    }
    mount(container) {
        if (this.mounted)
            return;
        container.replaceChildren(this.boardEl);
        this.mounted = true;
    }
    setPosition(fen, animated = true) {
        this.boardEl.setPosition(fen, animated);
    }
    setOrientation(orientation) {
        this.boardEl.setAttribute("orientation", orientation);
    }
    onDrop(handler) {
        const listener = (event) => {
            const customEvent = event;
            const detail = customEvent.detail;
            if (!detail || typeof detail.setAction !== "function")
                return;
            if (!isSquare(detail.source) || !isSquare(detail.target) || typeof detail.piece !== "string") {
                detail.setAction("snapback");
                return;
            }
            const payload = {
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
    destroy() {
        this.boardEl.remove();
        this.mounted = false;
    }
}
