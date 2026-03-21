import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { ChessComImportPanel } from "./ChessComImportPanel.js";

function installDomGlobals() {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { pretendToBeVisual: true });
  const { window } = dom;

  Object.assign(globalThis, {
    window,
    document: window.document,
    navigator: window.navigator,
    HTMLElement: window.HTMLElement,
    HTMLAnchorElement: window.HTMLAnchorElement,
    HTMLButtonElement: window.HTMLButtonElement,
    HTMLSelectElement: window.HTMLSelectElement,
    Node: window.Node,
    Event: window.Event,
    getComputedStyle: window.getComputedStyle.bind(window),
    requestAnimationFrame: window.requestAnimationFrame.bind(window),
    cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
    IS_REACT_ACT_ENVIRONMENT: true
  });

  return dom;
}

test("ChessComImportPanel blocks import until a Backoffice username is configured", () => {
  const dom = installDomGlobals();
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <ChessComImportPanel
        username=""
        archives={[]}
        loadingArchives={false}
        importing={false}
        status="Configure Chess.com settings first."
        startMonthId=""
        endMonthId=""
        backofficeHref="/backoffice"
        onDiscoverArchives={() => {}}
        onStartMonthChange={() => {}}
        onEndMonthChange={() => {}}
        onImport={() => {}}
      />
    );
  });

  assert.ok(container.textContent?.includes("Configure a Chess.com username"));
  assert.equal(container.querySelector("button"), null);

  act(() => {
    root.unmount();
  });
  dom.window.close();
});

test("ChessComImportPanel renders archive range controls once archives are loaded", () => {
  const dom = installDomGlobals();
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <ChessComImportPanel
        username="hikaru"
        archives={[
          { id: "2026-02", year: 2026, month: 2, url: "https://api.chess.com/pub/player/hikaru/games/2026/02", label: "Feb 2026" },
          { id: "2026-03", year: 2026, month: 3, url: "https://api.chess.com/pub/player/hikaru/games/2026/03", label: "Mar 2026" }
        ]}
        loadingArchives={false}
        importing={false}
        status="Ready to import."
        startMonthId="2026-02"
        endMonthId="2026-03"
        backofficeHref="/backoffice"
        onDiscoverArchives={() => {}}
        onStartMonthChange={() => {}}
        onEndMonthChange={() => {}}
        onImport={() => {}}
      />
    );
  });

  assert.equal(container.querySelectorAll("select").length, 2);
  assert.ok(container.textContent?.includes("Saved username:"));
  assert.ok(container.textContent?.includes("Import selected archive range"));

  act(() => {
    root.unmount();
  });
  dom.window.close();
});
