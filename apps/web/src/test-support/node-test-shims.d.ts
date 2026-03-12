declare module "node:test" {
  type TestFn = () => void | Promise<void>;

  export default function test(name: string, fn: TestFn): void;
}

declare module "node:assert/strict" {
  interface AssertStrict {
    equal(actual: unknown, expected: unknown, message?: string): void;
    deepEqual(actual: unknown, expected: unknown, message?: string): void;
    ok(value: unknown, message?: string): void;
    throws(fn: () => unknown, error?: RegExp | { message?: string }, message?: string): void;
  }

  const assert: AssertStrict;
  export default assert;
}

declare module "jsdom" {
  export class JSDOM {
    window: Window & typeof globalThis & { close(): void };
    constructor(html?: string, options?: { pretendToBeVisual?: boolean });
  }
}
