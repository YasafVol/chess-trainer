import type { BoardAdapter } from "./BoardAdapter";

type WindowLike = Pick<Window, "requestAnimationFrame" | "cancelAnimationFrame" | "addEventListener" | "removeEventListener">;

type ResizeObserverLike = {
  observe: (target: Element) => void;
  disconnect: () => void;
};

type ResizeObserverCtorLike = new (callback: ResizeObserverCallback) => ResizeObserverLike;

export function startBoardResizeSync(
  host: HTMLElement,
  board: BoardAdapter,
  windowObject: WindowLike = window,
  ResizeObserverCtor: ResizeObserverCtorLike | undefined = typeof ResizeObserver === "undefined" ? undefined : ResizeObserver
): () => void {
  let frameId: number | null = null;
  let resizeObserver: ResizeObserverLike | null = null;

  const flushResize = () => {
    frameId = null;
    board.resize();
  };

  const scheduleResize = () => {
    if (frameId !== null) {
      windowObject.cancelAnimationFrame(frameId);
    }
    frameId = windowObject.requestAnimationFrame(flushResize);
  };

  scheduleResize();

  if (ResizeObserverCtor) {
    resizeObserver = new ResizeObserverCtor(() => {
      scheduleResize();
    });
    resizeObserver.observe(host);
  } else {
    windowObject.addEventListener("resize", scheduleResize);
  }

  return () => {
    if (frameId !== null) {
      windowObject.cancelAnimationFrame(frameId);
    }

    resizeObserver?.disconnect();
    if (!resizeObserver) {
      windowObject.removeEventListener("resize", scheduleResize);
    }
  };
}
