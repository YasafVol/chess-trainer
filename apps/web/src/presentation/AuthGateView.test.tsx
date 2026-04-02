import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { AuthGateView } from "./AuthGateView.js";
import { buildAuthGateViewModel } from "./authGateModel.js";

function installDomGlobals() {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    pretendToBeVisual: true
  });
  const { window } = dom;

  Object.assign(globalThis, {
    window,
    document: window.document,
    navigator: window.navigator,
    HTMLElement: window.HTMLElement,
    HTMLButtonElement: window.HTMLButtonElement,
    Node: window.Node,
    Event: window.Event,
    MouseEvent: window.MouseEvent,
    getComputedStyle: window.getComputedStyle.bind(window),
    requestAnimationFrame: window.requestAnimationFrame.bind(window),
    cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
    IS_REACT_ACT_ENVIRONMENT: true
  });

  return dom;
}

test("buildAuthGateViewModel maps known deep links to route-specific copy", () => {
  const libraryModel = buildAuthGateViewModel("/library");
  assert.equal(libraryModel.routeLabel, "Library");
  assert.match(libraryModel.title, /saved training library/i);

  const gameModel = buildAuthGateViewModel("/game/demo-game");
  assert.equal(gameModel.routeLabel, "Game Workbench");
  assert.match(gameModel.summary, /replay the stored line/i);
});

test("AuthGateView renders route-aware copy and forwards sign-in clicks", () => {
  const dom = installDomGlobals();
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  let signInCalls = 0;

  act(() => {
    root.render(
      <AuthGateView
        model={buildAuthGateViewModel("/backoffice")}
        signingIn={false}
        signInError={null}
        onSignIn={() => {
          signInCalls += 1;
        }}
      />
    );
  });

  assert.ok(container.textContent?.includes("Backoffice"));
  assert.ok(container.textContent?.includes("runtime controls and import settings"));
  assert.ok(container.textContent?.includes("What unlocks after sign-in"));

  const button = container.querySelector("button") as HTMLButtonElement;
  act(() => {
    button.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  });

  assert.equal(signInCalls, 1);

  act(() => {
    root.unmount();
  });
  dom.window.close();
});
