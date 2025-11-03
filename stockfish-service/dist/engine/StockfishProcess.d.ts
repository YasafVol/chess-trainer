/**
 * Stockfish Process Manager
 * Handles spawning, communication, and lifecycle of Stockfish engine process
 */
export interface StockfishMessage {
    command: string;
    resolve: (value: string) => void;
    reject: (error: Error) => void;
    timeout?: NodeJS.Timeout;
}
export declare class StockfishProcess {
    private process;
    private isReady;
    private messageQueue;
    private currentAnalysis;
    private analysisMutex;
    private stockfishPath;
    private engineThreads;
    private engineHash;
    constructor(stockfishPath?: string, engineThreads?: number, engineHash?: number);
    /**
     * Initialize Stockfish process
     */
    initialize(): Promise<void>;
    /**
     * Handle output from Stockfish
     */
    private handleOutput;
    /**
     * Send command to Stockfish and wait for response
     */
    private sendCommand;
    /**
     * Analyze position
     */
    analyze(request: {
        fen?: string;
        moves?: string[];
        depth: number;
        multiPV: number;
        movetimeMs: number;
    }): Promise<string>;
    /**
     * Get engine version
     */
    getVersion(): Promise<string>;
    /**
     * Check if engine is ready
     */
    checkReady(): boolean;
    /**
     * Terminate Stockfish process
     */
    terminate(): void;
}
//# sourceMappingURL=StockfishProcess.d.ts.map