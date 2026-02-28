type EngineInitMessage = {
  type: "engine:init";
  requestId: string;
  payload: {
    flavor: "stockfish-18-lite-single" | "stockfish-18-single" | "stockfish-18";
  };
};

type AnalyzePositionMessage = {
  type: "engine:analyzePosition";
  requestId: string;
  payload: {
    fen: string;
    movesUci: string[];
    depth: number;
    multiPV: number;
    movetimeMs?: number;
  };
};

type CancelMessage = {
  type: "engine:cancel";
  requestId: string;
};

type TerminateMessage = {
  type: "engine:terminate";
  requestId: string;
};

type WorkerInbound = EngineInitMessage | AnalyzePositionMessage | CancelMessage | TerminateMessage;

type WorkerOutbound =
  | {
      type: "engine:ready" | "engine:cancelled";
      requestId: string;
    }
  | {
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
    }
  | {
      type: "engine:error";
      requestId: string;
      payload: { message: string };
    };

let cancelled = false;

function postMessageSafe(msg: WorkerOutbound) {
  self.postMessage(msg);
}

self.onmessage = async (event: MessageEvent<WorkerInbound>) => {
  const message = event.data;

  if (message.type === "engine:cancel") {
    cancelled = true;
    postMessageSafe({ type: "engine:cancelled", requestId: message.requestId });
    return;
  }

  if (message.type === "engine:terminate") {
    close();
    return;
  }

  if (message.type === "engine:init") {
    // Engine wiring to stockfish.js flavor happens in implementation tickets.
    cancelled = false;
    postMessageSafe({ type: "engine:ready", requestId: message.requestId });
    return;
  }

  if (message.type === "engine:analyzePosition") {
    if (cancelled) {
      postMessageSafe({ type: "engine:cancelled", requestId: message.requestId });
      return;
    }

    // Stub response to keep protocol stable for frontend integration work.
    postMessageSafe({
      type: "engine:result",
      requestId: message.requestId,
      payload: {
        bestMoveUci: undefined,
        evaluationType: "cp",
        evaluation: 0,
        depth: message.payload.depth,
        pvUci: []
      }
    });
  }
};
