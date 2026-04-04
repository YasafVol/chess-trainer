import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { ImportPage } from "./import.js";
import { runtimeGateway } from "../lib/runtimeGateway.js";

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
    HTMLInputElement: window.HTMLInputElement,
    HTMLTextAreaElement: window.HTMLTextAreaElement,
    Node: window.Node,
    Event: window.Event,
    MouseEvent: window.MouseEvent,
    KeyboardEvent: window.KeyboardEvent,
    getComputedStyle: window.getComputedStyle.bind(window),
    requestAnimationFrame: window.requestAnimationFrame.bind(window),
    cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
    IS_REACT_ACT_ENVIRONMENT: true
  });

  return dom;
}

function setSignedOutSession() {
  runtimeGateway.updateSession({
    isConfigured: true,
    isLoading: false,
    isAuthenticated: false,
    user: null,
    browserOnline: true,
    backendConnected: true
  });
}

async function flushUpdates() {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

test("ImportPage shows the signed-out import guard and Chess.com setup guidance", async () => {
  const dom = installDomGlobals();
  setSignedOutSession();
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(<ImportPage />);
  });
  await flushUpdates();

  assert.match(container.textContent ?? "", /Import PGN/i);
  assert.match(container.textContent ?? "", /Import is disabled while signed out or offline/i);
  assert.match(container.textContent ?? "", /Configure a Chess\.com username in Backoffice/i);

  const importButton = Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes("Import selected games")
  ) as HTMLButtonElement | undefined;
  assert.equal(importButton?.disabled, true);

  act(() => {
    root.unmount();
  });
  dom.window.close();
});
