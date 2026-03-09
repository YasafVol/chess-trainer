export type EngineFlavor = "stockfish-18-lite-single" | "stockfish-18-single" | "stockfish-18";

type PendingResolver = {
  resolve: (value: EngineMessage) => void;
  reject: (error: Error) => void;
  timeoutId: number;
};

export type EngineReadyMessage = {
  type: "engine:ready";
  requestId: string;
};

export type EngineCancelledMessage = {
  type: "engine:cancelled";
  requestId: string;
};

export type EngineResultMessage = {
  type: "engine:result";
  requestId: string;
  payload: {
    bestMoveUci?: string;
    evaluationType: "cp" | "mate";
    evaluation: number;
    depth: number;
    nodes?: number;
    nps?: number;
    pvUci: string[];
  };
};

export type EngineErrorMessage = {
  type: "engine:error";
  requestId: string;
  payload?: { message?: string };
};

export type EngineMessage =
  | EngineReadyMessage
  | EngineCancelledMessage
  | EngineResultMessage
  | EngineErrorMessage;

function newRequestId(): string {
  return crypto.randomUUID();
}

function formatWorkerError(event: Event | ErrorEvent): string {
  if (!(event instanceof ErrorEvent)) {
    return "Engine worker error";
  }

  return [
    event.message,
    event.filename,
    event.lineno ? `line ${event.lineno}` : "",
    event.colno ? `col ${event.colno}` : ""
  ].filter(Boolean).join(" | ") || "Engine worker error";
}

export class EngineClient {
  private worker: Worker;
  private pending = new Map<string, PendingResolver>();

  constructor() {
    this.worker = new Worker(new URL("./engine.worker.ts", import.meta.url), { type: "module" });
    this.worker.onmessage = (event) => {
      const message = event.data as EngineMessage;
      const resolver = this.pending.get(message.requestId);
      if (!resolver) return;
      this.pending.delete(message.requestId);
      window.clearTimeout(resolver.timeoutId);

      if (message.type === "engine:error") {
        resolver.reject(new Error(message.payload?.message ?? "Engine error"));
        return;
      }
      resolver.resolve(message);
    };
    this.worker.onerror = (event: Event | ErrorEvent) => {
      this.rejectAllPending(new Error(formatWorkerError(event)));
    };
  }

  init(flavor: EngineFlavor): Promise<void> {
    const requestId = newRequestId();
    return this.awaitMessage(requestId, {
      type: "engine:init",
      requestId,
      payload: { flavor }
    }, 45_000).then(() => undefined);
  }

  analyzePosition(input: {
    fen: string;
    movesUci: string[];
    depth: number;
    multiPV: number;
    movetimeMs?: number;
    searchMovesUci?: string[];
  }): Promise<EngineResultMessage | EngineCancelledMessage> {
    const requestId = newRequestId();
    return this.awaitMessage(requestId, {
      type: "engine:analyzePosition",
      requestId,
      payload: input
    }, 45_000).then((message) => {
      if (message.type === "engine:result" || message.type === "engine:cancelled") {
        return message;
      }
      throw new Error(`Unexpected engine response: ${message.type}`);
    });
  }

  cancel(): Promise<void> {
    const requestId = newRequestId();
    return this.awaitMessage(requestId, { type: "engine:cancel", requestId }, 10_000).then(() => undefined);
  }

  terminate(): void {
    const requestId = newRequestId();
    this.worker.postMessage({ type: "engine:terminate", requestId });
    this.worker.terminate();
    this.rejectAllPending(new Error("Engine terminated"));
  }

  private awaitMessage(requestId: string, outbound: unknown, timeoutMs: number): Promise<EngineMessage> {
    return new Promise((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        const pending = this.pending.get(requestId);
        if (!pending) {
          return;
        }
        this.pending.delete(requestId);
        pending.reject(new Error("Timed out waiting for engine response"));
      }, timeoutMs);

      this.pending.set(requestId, { resolve, reject, timeoutId });
      this.worker.postMessage(outbound);
    });
  }

  private rejectAllPending(error: Error): void {
    for (const [requestId, pending] of this.pending.entries()) {
      window.clearTimeout(pending.timeoutId);
      pending.reject(error);
      this.pending.delete(requestId);
    }
  }
}
