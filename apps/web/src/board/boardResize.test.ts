import test from "node:test";
import assert from "node:assert/strict";
import { startBoardResizeSync } from "./boardResize.js";
import type { BoardAdapter } from "./BoardAdapter.js";

function createWindowStub() {
  let nextFrameId = 1;
  const frames = new Map<number, FrameRequestCallback>();
  const listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();

  return {
    windowObject: {
      requestAnimationFrame(callback: FrameRequestCallback) {
        const id = nextFrameId++;
        frames.set(id, callback);
        return id;
      },
      cancelAnimationFrame(id: number) {
        frames.delete(id);
      },
      addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
        if (!listeners.has(type)) {
          listeners.set(type, new Set());
        }
        listeners.get(type)!.add(listener);
      },
      removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
        listeners.get(type)?.delete(listener);
      }
    },
    flushNextFrame() {
      const entry = frames.entries().next().value as [number, FrameRequestCallback] | undefined;
      if (!entry) {
        return;
      }
      frames.delete(entry[0]);
      entry[1](16);
    },
    dispatch(type: string) {
      for (const listener of listeners.get(type) ?? []) {
        if (typeof listener === "function") {
          listener(new Event(type));
        } else {
          listener.handleEvent(new Event(type));
        }
      }
    },
    listenerCount(type: string) {
      return listeners.get(type)?.size ?? 0;
    }
  };
}

test("startBoardResizeSync schedules an initial resize and resizes again on observer updates", () => {
  const host = {} as HTMLElement;
  let resizeCalls = 0;
  const board: BoardAdapter = {
    mount: () => undefined,
    setPosition: () => undefined,
    setOrientation: () => undefined,
    resize: () => {
      resizeCalls += 1;
    },
    setHighlightedSquares: () => undefined,
    onDrop: () => () => undefined,
    destroy: () => undefined
  };
  const windowStub = createWindowStub();
  type FakeResizeObserverInstance = {
    disconnected: boolean;
    trigger: () => void;
  };
  let observerInstance: FakeResizeObserverInstance | null = null;

  class FakeResizeObserver {
    private readonly callback: ResizeObserverCallback;
    disconnected = false;

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
      observerInstance = this;
    }

    observe(target: Element) {
      assert.equal(target, host);
    }

    disconnect() {
      this.disconnected = true;
    }

    trigger() {
      this.callback([], this as unknown as ResizeObserver);
    }
  }

  const stop = startBoardResizeSync(host, board, windowStub.windowObject as Window, FakeResizeObserver as unknown as typeof ResizeObserver);

  windowStub.flushNextFrame();
  assert.equal(resizeCalls, 1);

  assert.ok(observerInstance);
  observerInstance!.trigger();
  windowStub.flushNextFrame();
  assert.equal(resizeCalls, 2);

  stop();
  assert.equal(observerInstance!.disconnected, true);
});

test("startBoardResizeSync falls back to window resize events when ResizeObserver is unavailable", () => {
  const host = {} as HTMLElement;
  let resizeCalls = 0;
  const board: BoardAdapter = {
    mount: () => undefined,
    setPosition: () => undefined,
    setOrientation: () => undefined,
    resize: () => {
      resizeCalls += 1;
    },
    setHighlightedSquares: () => undefined,
    onDrop: () => () => undefined,
    destroy: () => undefined
  };
  const windowStub = createWindowStub();

  const stop = startBoardResizeSync(host, board, windowStub.windowObject as Window, undefined);

  assert.equal(windowStub.listenerCount("resize"), 1);
  windowStub.flushNextFrame();
  assert.equal(resizeCalls, 1);

  windowStub.dispatch("resize");
  windowStub.flushNextFrame();
  assert.equal(resizeCalls, 2);

  stop();
  assert.equal(windowStub.listenerCount("resize"), 0);
});
