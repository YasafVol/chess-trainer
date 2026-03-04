function newRequestId() {
    return crypto.randomUUID();
}
export class EngineClient {
    constructor() {
        this.pending = new Map();
        this.worker = new Worker(new URL("./engine.worker.ts", import.meta.url), { type: "module" });
        this.worker.onmessage = (event) => {
            const message = event.data;
            const resolver = this.pending.get(message.requestId);
            if (!resolver)
                return;
            this.pending.delete(message.requestId);
            window.clearTimeout(resolver.timeoutId);
            if (message.type === "engine:error") {
                resolver.reject(new Error(message.payload?.message ?? "Engine error"));
                return;
            }
            resolver.resolve(message);
        };
        this.worker.onerror = (event) => {
            const message = event instanceof ErrorEvent ? event.message : "Engine worker error";
            this.rejectAllPending(new Error(message || "Engine worker error"));
        };
    }
    init(flavor) {
        const requestId = newRequestId();
        return this.awaitMessage(requestId, {
            type: "engine:init",
            requestId,
            payload: { flavor }
        }, 20000).then(() => undefined);
    }
    analyzePosition(input) {
        const requestId = newRequestId();
        return this.awaitMessage(requestId, {
            type: "engine:analyzePosition",
            requestId,
            payload: input
        }, 45000).then((message) => {
            if (message.type === "engine:result" || message.type === "engine:cancelled") {
                return message;
            }
            throw new Error(`Unexpected engine response: ${message.type}`);
        });
    }
    cancel() {
        const requestId = newRequestId();
        return this.awaitMessage(requestId, { type: "engine:cancel", requestId }, 10000).then(() => undefined);
    }
    terminate() {
        const requestId = newRequestId();
        this.worker.postMessage({ type: "engine:terminate", requestId });
        this.worker.terminate();
        this.rejectAllPending(new Error("Engine terminated"));
    }
    awaitMessage(requestId, outbound, timeoutMs) {
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
    rejectAllPending(error) {
        for (const [requestId, pending] of this.pending.entries()) {
            window.clearTimeout(pending.timeoutId);
            pending.reject(error);
            this.pending.delete(requestId);
        }
    }
}
