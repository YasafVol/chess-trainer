export type EngineFlavor = "stockfish-18-lite-single" | "stockfish-18-single" | "stockfish-18";

type PendingResolver = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

function newRequestId(): string {
  return crypto.randomUUID();
}

export class EngineClient {
  private worker: Worker;
  private pending = new Map<string, PendingResolver>();

  constructor() {
    this.worker = new Worker(new URL("./engine.worker.ts", import.meta.url), { type: "module" });
    this.worker.onmessage = (event) => {
      const message = event.data as { type: string; requestId: string; payload?: unknown };
      const resolver = this.pending.get(message.requestId);
      if (!resolver) return;
      this.pending.delete(message.requestId);

      if (message.type === "engine:error") {
        const payload = message.payload as { message?: string } | undefined;
        resolver.reject(new Error(payload?.message ?? "Engine error"));
        return;
      }
      resolver.resolve(message);
    };
  }

  init(flavor: EngineFlavor): Promise<void> {
    const requestId = newRequestId();
    return this.awaitMessage(requestId, {
      type: "engine:init",
      requestId,
      payload: { flavor }
    }).then(() => undefined);
  }

  analyzePosition(input: {
    fen: string;
    movesUci: string[];
    depth: number;
    multiPV: number;
    movetimeMs?: number;
  }): Promise<unknown> {
    const requestId = newRequestId();
    return this.awaitMessage(requestId, {
      type: "engine:analyzePosition",
      requestId,
      payload: input
    });
  }

  cancel(): Promise<void> {
    const requestId = newRequestId();
    return this.awaitMessage(requestId, { type: "engine:cancel", requestId }).then(() => undefined);
  }

  terminate(): void {
    const requestId = newRequestId();
    this.worker.postMessage({ type: "engine:terminate", requestId });
    this.worker.terminate();
    this.pending.clear();
  }

  private awaitMessage(requestId: string, outbound: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject });
      this.worker.postMessage(outbound);
    });
  }
}
