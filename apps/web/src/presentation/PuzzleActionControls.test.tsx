import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { PuzzleActionControls } from "./PuzzleActionControls.js";

function installDomGlobals() {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { pretendToBeVisual: true });
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

function renderControls(props: {
  hintDisabled: boolean;
  revealDisabled: boolean;
}) {
  const dom = installDomGlobals();
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <PuzzleActionControls
        hintDisabled={props.hintDisabled}
        revealDisabled={props.revealDisabled}
        onHint={() => {}}
        onReveal={() => {}}
        onReset={() => {}}
        onTryAgain={() => {}}
      />
    );
  });

  return {
    dom,
    root,
    buttons: Array.from(container.querySelectorAll("button"))
  };
}

test("PuzzleActionControls renders reset and try again actions alongside hint and reveal", () => {
  const { dom, root, buttons } = renderControls({
    hintDisabled: false,
    revealDisabled: false
  });

  assert.deepEqual(
    buttons.map((button) => button.textContent?.trim()),
    ["Hint", "Reveal", "Reset", "Try again"]
  );

  act(() => {
    root.unmount();
  });
  dom.window.close();
});

test("PuzzleActionControls keeps reset and try again available while hint and reveal are locked", () => {
  const { dom, root, buttons } = renderControls({
    hintDisabled: true,
    revealDisabled: true
  });

  assert.equal(buttons[0]?.disabled, true);
  assert.equal(buttons[1]?.disabled, true);
  assert.equal(buttons[2]?.disabled, false);
  assert.equal(buttons[3]?.disabled, false);

  act(() => {
    root.unmount();
  });
  dom.window.close();
});
