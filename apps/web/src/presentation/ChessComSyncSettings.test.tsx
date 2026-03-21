import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { ChessComSyncSettings } from "./ChessComSyncSettings.js";

function installDomGlobals() {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { pretendToBeVisual: true });
  const { window } = dom;

  Object.assign(globalThis, {
    window,
    document: window.document,
    navigator: window.navigator,
    HTMLElement: window.HTMLElement,
    HTMLInputElement: window.HTMLInputElement,
    HTMLSelectElement: window.HTMLSelectElement,
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

test("ChessComSyncSettings renders username, cadence, and saved sync status", () => {
  const dom = installDomGlobals();
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <ChessComSyncSettings
        config={{
          username: "hikaru",
          enabled: true,
          interval: "weekly",
          lastSyncAt: "2026-03-20T09:00:00.000Z",
          lastStatus: "Imported 2 games.",
          lastSuccessfulArchive: "2026-03"
        }}
        status="Imported 2 games."
        running={false}
        saving={false}
        saveStatus={null}
        onUsernameChange={() => {}}
        onEnabledChange={() => {}}
        onIntervalChange={() => {}}
        onSave={() => {}}
      />
    );
  });

  assert.ok(container.textContent?.includes("hikaru"));
  assert.ok(container.textContent?.includes("Imported 2 games."));
  assert.ok(container.textContent?.includes("Last sync attempt"));

  act(() => {
    root.unmount();
  });
  dom.window.close();
});
