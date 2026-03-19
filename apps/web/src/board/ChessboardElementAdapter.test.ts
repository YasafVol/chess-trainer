import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

function installDomGlobals() {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { pretendToBeVisual: true });
  const { window } = dom;

  Object.assign(globalThis, {
    window,
    document: window.document,
    customElements: window.customElements,
    HTMLElement: window.HTMLElement,
    Element: window.Element,
    Event: window.Event,
    CustomEvent: window.CustomEvent,
    ErrorEvent: window.ErrorEvent,
    Document: window.Document,
    ShadowRoot: window.ShadowRoot,
    CSSStyleSheet: window.CSSStyleSheet
  });

  return dom;
}

test("ChessboardElementAdapter delegates resize to the mounted chess-board element", async () => {
  const dom = installDomGlobals();
  const { ChessboardElementAdapter } = await import("./ChessboardElementAdapter.js");

  const adapter = new ChessboardElementAdapter();
  const host = document.createElement("div");
  document.body.appendChild(host);
  adapter.mount(host);

  let resizeCalls = 0;
  const boardEl = adapter as unknown as { boardEl: { resize: () => void } };
  boardEl.boardEl.resize = () => {
    resizeCalls += 1;
  };

  adapter.resize();

  assert.equal(resizeCalls, 1);
  dom.window.close();
});

test("ChessboardElementAdapter rejects same-square drops before calling the handler", async () => {
  const dom = installDomGlobals();
  const { ChessboardElementAdapter } = await import("./ChessboardElementAdapter.js");

  const adapter = new ChessboardElementAdapter();
  const host = document.createElement("div");
  document.body.appendChild(host);
  adapter.mount(host);

  let handlerCalls = 0;
  adapter.onDrop(() => {
    handlerCalls += 1;
  });

  let action: "drop" | "snapback" | "trash" = "drop";
  const boardEl = adapter as unknown as { boardEl: HTMLElement };
  boardEl.boardEl.dispatchEvent(new CustomEvent("drop", {
    detail: {
      source: "b1",
      target: "b1",
      piece: "wN",
      setAction(nextAction: "drop" | "snapback" | "trash") {
        action = nextAction;
      }
    }
  }));

  assert.equal(handlerCalls, 0);
  assert.equal(action, "snapback");
  dom.window.close();
});

test("ChessboardElementAdapter switches to the error highlight color when requested", async () => {
  const dom = installDomGlobals();
  const { ChessboardElementAdapter } = await import("./ChessboardElementAdapter.js");

  const adapter = new ChessboardElementAdapter();
  const host = document.createElement("div");
  document.body.appendChild(host);
  adapter.mount(host);

  adapter.setHighlightedSquares(["f3"], "error");

  const boardEl = adapter as unknown as { boardEl: HTMLElement };
  assert.equal(boardEl.boardEl.style.getPropertyValue("--highlight-color"), "rgba(220, 38, 38, 0.92)");

  adapter.setHighlightedSquares([], "default");
  assert.equal(boardEl.boardEl.style.getPropertyValue("--highlight-color"), "rgba(0, 173, 181, 0.92)");
  dom.window.close();
});
