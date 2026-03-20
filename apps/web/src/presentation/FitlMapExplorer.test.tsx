import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { useState } from "react";
import { fitlGraphSnapshot } from "../generated/fitlGraphSnapshot.js";
import { normalizeFitlRouteSearch } from "../domain/fitlGraph.js";
import type { FitlRouteSearch } from "../domain/fitlGraphTypes.js";
import { FitlMapExplorer } from "./FitlMapExplorer.js";

function installDomGlobals() {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    pretendToBeVisual: true
  });
  const { window } = dom;
  let copied = "";

  Object.assign(globalThis, {
    window,
    document: window.document,
    navigator: {
      ...window.navigator,
      clipboard: {
        async writeText(value: string) {
          copied = value;
        }
      }
    },
    HTMLElement: window.HTMLElement,
    SVGElement: window.SVGElement,
    HTMLButtonElement: window.HTMLButtonElement,
    HTMLInputElement: window.HTMLInputElement,
    Node: window.Node,
    Event: window.Event,
    MouseEvent: window.MouseEvent,
    KeyboardEvent: window.KeyboardEvent,
    getComputedStyle: window.getComputedStyle.bind(window),
    requestAnimationFrame: window.requestAnimationFrame.bind(window),
    cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
    IS_REACT_ACT_ENVIRONMENT: true
  });

  return { dom, getCopiedText: () => copied };
}

function renderExplorer(initial: Partial<FitlRouteSearch> = {}) {
  const { dom, getCopiedText } = installDomGlobals();
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  function Harness() {
    const [routeState, setRouteState] = useState(() =>
      normalizeFitlRouteSearch({
        ...initial
      })
    );

    return (
      <FitlMapExplorer
        snapshot={fitlGraphSnapshot}
        routeState={routeState}
        onRouteStateChange={(next) =>
          setRouteState((current) =>
            normalizeFitlRouteSearch({
              ...current,
              ...next
            })
          )
        }
      />
    );
  }

  act(() => {
    root.render(<Harness />);
  });

  return {
    dom,
    root,
    container,
    getCopiedText
  };
}

test("FitlMapExplorer lands in project summary without global tooling clutter", () => {
  const { dom, root, container } = renderExplorer();

  assert.ok(container.textContent?.includes("FITL Explorer"));
  assert.ok(container.textContent?.includes("Project overview"));
  assert.equal(container.querySelector('[data-fitl-node-id="tool:stockfish"]'), null);
  assert.equal(container.querySelector('[data-fitl-node-id="tool:convex-auth"]'), null);
  assert.ok(!container.textContent?.includes("Node Kinds"));

  act(() => {
    root.unmount();
  });
  dom.window.close();
});

test("FitlMapExplorer shows deferred tooling, search results, and focused tool details", () => {
  const { dom, root, container } = renderExplorer({
    includeDeferred: true,
    q: "stockfish"
  });

  assert.ok(container.textContent?.includes("Stockfish"));

  const searchResult = Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes("Stockfish")
  );
  act(() => {
    searchResult?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  });

  assert.equal(container.querySelector(".fitl-selection-title")?.textContent, "Stockfish");
  assert.ok(container.textContent?.includes("Tool impact"));

  act(() => {
    root.unmount();
  });
  dom.window.close();
});

test("FitlMapExplorer disables implementation depth until a vertical or tool is selected", () => {
  const { dom, root, container } = renderExplorer();
  const implementationButton = Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes("implementation")
  ) as HTMLButtonElement;

  assert.equal(implementationButton.disabled, true);

  act(() => {
    root.unmount();
  });
  dom.window.close();
});

test("FitlMapExplorer updates selection details and copies the AI change brief", async () => {
  const { dom, root, container, getCopiedText } = renderExplorer({
    depth: "implementation",
    focus: "vertical:v6-game-view-and-analysis-workbench"
  });

  const stockfishButton = container.querySelector('[data-fitl-node-id="tool:stockfish"]') as HTMLButtonElement;
  act(() => {
    stockfishButton.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  });

  assert.equal(container.querySelector(".fitl-selection-title")?.textContent, "Stockfish");

  const copyButton = Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes("Copy AI change brief")
  );
  await act(async () => {
    copyButton?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  });

  assert.match(getCopiedText(), /FITL Change Brief/);
  assert.match(getCopiedText(), /Stockfish/);

  act(() => {
    root.unmount();
  });
  dom.window.close();
});
