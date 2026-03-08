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
