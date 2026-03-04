let cancelled = false;
let currentFlavor = null;
let engine = null;
let activeAnalyze = null;
const lineWaiters = [];
import stockfishLiteSingleJsUrl from "stockfish/bin/stockfish-18-lite-single.js?url";
import stockfishLiteSingleWasmUrl from "stockfish/bin/stockfish-18-lite-single.wasm?url";
import stockfishSingleJsUrl from "stockfish/bin/stockfish-18-single.js?url";
import stockfishSingleWasmUrl from "stockfish/bin/stockfish-18-single.wasm?url";
import stockfishFullJsUrl from "stockfish/bin/stockfish-18.js?url";
import stockfishFullWasmUrl from "stockfish/bin/stockfish-18.wasm?url";
const UCI_MOVE_RE = /^[a-h][1-8][a-h][1-8][qrbn]?$/i;
function isUciMove(token) {
    return UCI_MOVE_RE.test(token);
}
function parseUciList(raw) {
    if (!raw) {
        return undefined;
    }
    const moves = raw
        .trim()
        .split(/\s+/)
        .filter((token) => isUciMove(token))
        .map((token) => token.toLowerCase());
    return moves.length > 0 ? moves : undefined;
}
function parseBestmoveLine(line) {
    const match = line.match(/^bestmove\s+(\S+)/i);
    if (!match) {
        return undefined;
    }
    const candidate = match[1];
    if (!candidate || candidate === "(none)" || !isUciMove(candidate)) {
        return undefined;
    }
    return candidate.toLowerCase();
}
function splitEngineOutput(raw) {
    if (typeof raw !== "string") {
        return [];
    }
    return raw
        .split(/\r?\n/g)
        .map((line) => line.trim())
        .filter(Boolean);
}
function rejectAllWaiters(error) {
    while (lineWaiters.length > 0) {
        const waiter = lineWaiters.shift();
        waiter?.reject(error);
    }
}
function selectEngineAssets(flavor) {
    if (flavor === "stockfish-18-lite-single") {
        return { jsUrl: stockfishLiteSingleJsUrl, wasmUrl: stockfishLiteSingleWasmUrl };
    }
    if (flavor === "stockfish-18-single") {
        return { jsUrl: stockfishSingleJsUrl, wasmUrl: stockfishSingleWasmUrl };
    }
    return { jsUrl: stockfishFullJsUrl, wasmUrl: stockfishFullWasmUrl };
}
function sendEngineCommand(command) {
    if (!engine) {
        throw new Error("Engine is not initialized");
    }
    engine.postMessage(command);
}
function waitForLine(match, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
        const waiter = {
            match,
            resolve: (line) => {
                clearTimeout(timeoutId);
                resolve(line);
            },
            reject: (error) => {
                clearTimeout(timeoutId);
                reject(error);
            }
        };
        const timeoutId = setTimeout(() => {
            const index = lineWaiters.indexOf(waiter);
            if (index >= 0) {
                lineWaiters.splice(index, 1);
            }
            reject(new Error("Timed out waiting for engine response"));
        }, timeoutMs);
        lineWaiters.push(waiter);
    });
}
function parseInfoLine(line) {
    if (!line.startsWith("info ")) {
        return null;
    }
    const scoreMatch = line.match(/\bscore\s+(cp|mate)\s+(-?\d+)/);
    const multipvMatch = line.match(/\bmultipv\s+(\d+)/);
    const depthMatch = line.match(/\bdepth\s+(\d+)/);
    const nodesMatch = line.match(/\bnodes\s+(\d+)/);
    const npsMatch = line.match(/\bnps\s+(\d+)/);
    const pvMatch = line.match(/\bpv\s+(.+)$/);
    if (!scoreMatch && !depthMatch && !nodesMatch && !npsMatch && !pvMatch && !multipvMatch) {
        return null;
    }
    const evaluationType = scoreMatch?.[1] ?? "cp";
    const evaluation = scoreMatch ? Number(scoreMatch[2]) : 0;
    const parsedMultipv = multipvMatch ? Number(multipvMatch[1]) : undefined;
    const parsedDepth = depthMatch ? Number(depthMatch[1]) : undefined;
    const parsedNodes = nodesMatch ? Number(nodesMatch[1]) : undefined;
    const parsedNps = npsMatch ? Number(npsMatch[1]) : undefined;
    const multipv = typeof parsedMultipv === "number" && Number.isFinite(parsedMultipv) ? parsedMultipv : undefined;
    const depth = typeof parsedDepth === "number" && Number.isFinite(parsedDepth) ? parsedDepth : undefined;
    const nodes = typeof parsedNodes === "number" && Number.isFinite(parsedNodes) ? parsedNodes : undefined;
    const nps = typeof parsedNps === "number" && Number.isFinite(parsedNps) ? parsedNps : undefined;
    const pvUci = parseUciList(pvMatch?.[1]);
    return {
        evaluationType,
        evaluation,
        multipv,
        depth,
        nodes,
        nps,
        pvUci
    };
}
function handleEngineLine(line) {
    for (let i = 0; i < lineWaiters.length; i += 1) {
        const waiter = lineWaiters[i];
        if (waiter && waiter.match(line)) {
            lineWaiters.splice(i, 1);
            waiter.resolve(line);
            break;
        }
    }
    if (!activeAnalyze) {
        return;
    }
    const info = parseInfoLine(line);
    if (info) {
        if (typeof info.multipv === "number" && info.multipv > activeAnalyze.requestedMultiPV) {
            return;
        }
        if (typeof info.multipv === "number" && info.multipv !== 1) {
            return;
        }
        activeAnalyze.latest = {
            evaluationType: info.evaluationType ?? activeAnalyze.latest.evaluationType,
            evaluation: info.evaluation ?? activeAnalyze.latest.evaluation,
            multipv: info.multipv ?? activeAnalyze.latest.multipv,
            depth: info.depth ?? activeAnalyze.latest.depth,
            nodes: info.nodes ?? activeAnalyze.latest.nodes,
            nps: info.nps ?? activeAnalyze.latest.nps,
            pvUci: info.pvUci ?? activeAnalyze.latest.pvUci
        };
        return;
    }
    if (line.startsWith("bestmove")) {
        const bestMove = parseBestmoveLine(line);
        const outbound = activeAnalyze.cancelled
            ? { type: "engine:cancelled", requestId: activeAnalyze.requestId }
            : {
                type: "engine:result",
                requestId: activeAnalyze.requestId,
                payload: {
                    bestMoveUci: bestMove,
                    evaluationType: activeAnalyze.latest.evaluationType,
                    evaluation: activeAnalyze.latest.evaluation,
                    depth: activeAnalyze.latest.depth || activeAnalyze.requestedDepth,
                    nodes: activeAnalyze.latest.nodes,
                    nps: activeAnalyze.latest.nps,
                    pvUci: activeAnalyze.latest.pvUci
                }
            };
        const resolver = activeAnalyze.resolve;
        activeAnalyze = null;
        resolver(outbound);
    }
}
async function ensureEngine(flavor) {
    if (engine && currentFlavor === flavor) {
        return;
    }
    if (engine) {
        try {
            engine.postMessage("quit");
            engine.terminate();
        }
        catch {
            // no-op
        }
        engine = null;
        currentFlavor = null;
    }
    const assets = selectEngineAssets(flavor);
    const workerUrl = `${assets.jsUrl}#${encodeURIComponent(assets.wasmUrl)}`;
    engine = new Worker(workerUrl);
    currentFlavor = flavor;
    cancelled = false;
    engine.onmessage = (event) => {
        const lines = splitEngineOutput(event.data);
        for (const line of lines) {
            handleEngineLine(line);
        }
    };
    engine.onerror = (event) => {
        const message = event instanceof ErrorEvent ? event.message : "Engine worker error";
        const error = new Error(message);
        rejectAllWaiters(error);
        if (activeAnalyze) {
            activeAnalyze.reject(error);
            activeAnalyze = null;
        }
    };
    sendEngineCommand("uci");
    await waitForLine((line) => line === "uciok");
    sendEngineCommand("isready");
    await waitForLine((line) => line === "readyok");
}
function postMessageSafe(msg) {
    self.postMessage(msg);
}
self.onmessage = async (event) => {
    const message = event.data;
    if (message.type === "engine:cancel") {
        cancelled = true;
        if (activeAnalyze) {
            activeAnalyze.cancelled = true;
            try {
                sendEngineCommand("stop");
            }
            catch {
                // no-op
            }
        }
        postMessageSafe({ type: "engine:cancelled", requestId: message.requestId });
        return;
    }
    if (message.type === "engine:terminate") {
        if (engine) {
            try {
                engine.postMessage("quit");
            }
            catch {
                // no-op
            }
            engine.terminate();
        }
        engine = null;
        currentFlavor = null;
        rejectAllWaiters(new Error("Engine terminated"));
        if (activeAnalyze) {
            activeAnalyze.reject(new Error("Engine terminated"));
            activeAnalyze = null;
        }
        close();
        return;
    }
    if (message.type === "engine:init") {
        try {
            await ensureEngine(message.payload.flavor);
            postMessageSafe({ type: "engine:ready", requestId: message.requestId });
        }
        catch (error) {
            postMessageSafe({
                type: "engine:error",
                requestId: message.requestId,
                payload: {
                    message: error instanceof Error ? error.message : "Engine initialization failed"
                }
            });
        }
        return;
    }
    if (message.type === "engine:analyzePosition") {
        if (!engine) {
            postMessageSafe({
                type: "engine:error",
                requestId: message.requestId,
                payload: { message: "Engine not initialized" }
            });
            return;
        }
        if (activeAnalyze) {
            postMessageSafe({
                type: "engine:error",
                requestId: message.requestId,
                payload: { message: "Another analysis is already running" }
            });
            return;
        }
        if (cancelled) {
            postMessageSafe({ type: "engine:cancelled", requestId: message.requestId });
            cancelled = false;
            return;
        }
        const bestMoveTimeout = setTimeout(() => {
            if (!activeAnalyze) {
                return;
            }
            activeAnalyze.reject(new Error("Engine did not return bestmove before timeout"));
            activeAnalyze = null;
            try {
                sendEngineCommand("stop");
            }
            catch {
                // no-op
            }
        }, 30000);
        try {
            sendEngineCommand("isready");
            await waitForLine((line) => line === "readyok");
            sendEngineCommand("ucinewgame");
            sendEngineCommand(`setoption name Threads value 1`);
            sendEngineCommand(`setoption name MultiPV value ${Math.max(1, message.payload.multiPV)}`);
            sendEngineCommand(`position fen ${message.payload.fen}`);
            const completion = new Promise((resolve, reject) => {
                activeAnalyze = {
                    requestId: message.requestId,
                    requestedDepth: message.payload.depth,
                    requestedMultiPV: Math.max(1, message.payload.multiPV),
                    cancelled: false,
                    latest: {
                        evaluationType: "cp",
                        evaluation: 0,
                        multipv: 1,
                        depth: message.payload.depth,
                        pvUci: []
                    },
                    resolve,
                    reject
                };
            });
            if (message.payload.movetimeMs && message.payload.movetimeMs > 0) {
                sendEngineCommand(`go movetime ${message.payload.movetimeMs}`);
            }
            else {
                sendEngineCommand(`go depth ${Math.max(1, message.payload.depth)}`);
            }
            const outbound = await completion;
            clearTimeout(bestMoveTimeout);
            postMessageSafe(outbound);
        }
        catch (error) {
            clearTimeout(bestMoveTimeout);
            if (activeAnalyze) {
                activeAnalyze = null;
            }
            postMessageSafe({
                type: "engine:error",
                requestId: message.requestId,
                payload: {
                    message: error instanceof Error ? error.message : "Engine analysis failed"
                }
            });
        }
    }
};
