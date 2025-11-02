/**
 * Stockfish WASM Engine Wrapper
 * Handles UCI protocol communication with Stockfish engine
 * 
 * Uses stockfish.js (single-threaded) for Electron compatibility
 */

import { PositionEvaluation } from '../../types/analysis';

// @ts-ignore - stockfish.js doesn't have TypeScript types
import Stockfish from 'stockfish.js';

interface StockfishInstance {
	addMessageListener: (callback: (message: string) => void) => void;
	removeMessageListener: (callback: (message: string) => void) => void;
	postMessage: (command: string) => void;
	terminate: () => void;
}

export interface StockfishOptions {
	/** Analysis depth (default: 15) */
	depth?: number;
	/** Multi-PV (number of best moves to return, default: 1) */
	multiPV?: number;
	/** Time limit in milliseconds (optional) */
	timeLimit?: number;
}

export class StockfishEngine {
	private stockfishInstance: StockfishInstance | null = null;
	private isReady: boolean = false;
	private readyPromise: Promise<void> | null = null;
	private messageQueue: Array<{ resolve: (value: string) => void; reject: (error: any) => void }> = [];
	private currentAnalysisResponse: string = '';
	private uciReady: boolean = false;

	constructor() {
		// Initialize will be called lazily
	}

	/**
	 * Initialize Stockfish engine
	 */
	async initialize(): Promise<void> {
		if (this.isReady) {
			return;
		}

		if (this.readyPromise) {
			return this.readyPromise;
		}

		this.readyPromise = this._initializeEngine();
		return this.readyPromise;
	}

	private async _initializeEngine(): Promise<void> {
		try {
			// Initialize Stockfish.js
			// In Obsidian/Electron, we need to create a Worker from a local file
			// Electron requires paths to start with './' or be absolute
			
			// Check if Worker is available
			if (typeof Worker === 'undefined') {
				throw new Error('Web Workers are not supported in this environment');
			}

			let stockfishWorker: Worker | null = null;
			let workerUrl: string | null = null;

			// Approach 1: Try to load from plugin directory using fetch + blob URL
			// Use relative path with './' prefix for Electron compatibility
			try {
				// Fetch the worker file content from plugin directory
				const response = await fetch('./stockfish.wasm.js');
				if (response.ok) {
					const workerCode = await response.text();
					const blob = new Blob([workerCode], { type: 'application/javascript' });
					workerUrl = URL.createObjectURL(blob);
					stockfishWorker = new Worker(workerUrl);
				} else {
					throw new Error(`Failed to fetch worker file: ${response.status}`);
				}
			} catch (error) {
				// Approach 2: Try relative path with './' prefix (required by Electron)
				try {
					stockfishWorker = new Worker('./stockfish.wasm.js');
				} catch (error2) {
					throw new Error(`Failed to create Worker. Fetch error: ${error}. Direct path error: ${error2}`);
				}
			}
			
			if (!stockfishWorker) {
				throw new Error('Failed to create Stockfish worker');
			}

			// Wrap the Worker to match our interface
			this.stockfishInstance = {
				addMessageListener: (callback: (message: string) => void) => {
					stockfishWorker!.addEventListener('message', (e: MessageEvent) => callback(e.data as string));
				},
				removeMessageListener: (callback: (message: string) => void) => {
					// Note: We can't easily remove listeners with this signature
					// For now, we'll keep a reference and remove when needed
					stockfishWorker!.removeEventListener('message', (e: MessageEvent) => callback(e.data as string) as any);
				},
				postMessage: (command: string) => {
					stockfishWorker!.postMessage(command);
				},
				terminate: () => {
					stockfishWorker!.terminate();
					if (workerUrl) {
						URL.revokeObjectURL(workerUrl);
					}
				}
			} as StockfishInstance;

			// Set up message listener
			this.stockfishInstance.addMessageListener((message: string) => {
				this.handleMessage(message);
			});

			// Initialize UCI protocol
			await this.sendUCICommand('uci');
			await this.waitForResponse('uciok', 10000);

			// Wait for ready
			await this.sendUCICommand('isready');
			await this.waitForResponse('readyok', 10000);

			this.isReady = true;
			this.uciReady = true;

		} catch (error) {
			throw new Error(`Failed to initialize Stockfish engine: ${error}`);
		}
	}

	/**
	 * Handle messages from Stockfish
	 */
	private handleMessage(message: string): void {
		// Accumulate analysis output
		if (message.startsWith('info') || message.startsWith('bestmove')) {
			this.currentAnalysisResponse += message + '\n';
		}

		// Resolve waiting promises based on message content
		for (let i = this.messageQueue.length - 1; i >= 0; i--) {
			const queued = this.messageQueue[i];
			if (queued) {
				// Resolve with the message
				this.messageQueue.splice(i, 1);
				queued.resolve(message);
				break;
			}
		}
	}

	/**
	 * Send UCI command and wait for specific response
	 */
	private async waitForResponse(expectedResponse: string, timeout: number = 5000): Promise<string> {
		return new Promise<string>((resolve, reject) => {
			const startTime = Date.now();
			let resolved = false;

			// Set up a one-time listener
			const listener = (message: string) => {
				if (!resolved && message.includes(expectedResponse)) {
					resolved = true;
					if (this.stockfishInstance) {
						this.stockfishInstance.removeMessageListener(listener);
					}
					clearTimeout(timeoutId);
					resolve(message);
				}
			};

			// Add listener
			if (this.stockfishInstance) {
				this.stockfishInstance.addMessageListener(listener);
			}

			// Set timeout
			const timeoutId = setTimeout(() => {
				if (!resolved) {
					resolved = true;
					if (this.stockfishInstance) {
						this.stockfishInstance.removeMessageListener(listener);
					}
					reject(new Error(`Timeout waiting for ${expectedResponse}`));
				}
			}, timeout);

			// Also check current response buffer immediately
			if (this.currentAnalysisResponse.includes(expectedResponse)) {
				resolved = true;
				if (this.stockfishInstance) {
					this.stockfishInstance.removeMessageListener(listener);
				}
				clearTimeout(timeoutId);
				resolve(this.currentAnalysisResponse);
			}
		});
	}

	/**
	 * Send UCI command
	 */
	private async sendUCICommand(command: string): Promise<void> {
		if (!this.stockfishInstance) {
			throw new Error('Stockfish engine not initialized');
		}

		this.stockfishInstance.postMessage(command);
		
		// Small delay to allow processing
		await new Promise(resolve => setTimeout(resolve, 10));
	}

	/**
	 * Set position from FEN
	 */
	async setPosition(fen: string): Promise<void> {
		await this.ensureReady();
		await this.sendUCICommand(`position fen ${fen}`);
	}

	/**
	 * Analyze position
	 */
	async analyzePosition(options: StockfishOptions = {}): Promise<PositionEvaluation> {
		await this.ensureReady();
		
		const depth = options.depth || 15;
		const multiPV = options.multiPV || 1;
		
		// Clear previous analysis response
		this.currentAnalysisResponse = '';
		
		// Build go command
		let command = `go depth ${depth}`;
		if (multiPV > 1) {
			command += ` multipv ${multiPV}`;
		}
		if (options.timeLimit) {
			command += ` movetime ${options.timeLimit}`;
		}

		// Send analysis command
		await this.sendUCICommand(command);

		// Wait for bestmove response
		await this.waitForResponse('bestmove', 60000); // 60 second timeout

		// Parse the accumulated response
		return this.parseEvaluation(this.currentAnalysisResponse);
	}

	/**
	 * Parse evaluation from UCI response
	 */
	private parseEvaluation(response: string): PositionEvaluation {
		// Parse UCI output format:
		// info depth 15 score cp 20 bestmove e2e4
		// or
		// info depth 15 multipv 1 score cp 20 pv e2e4 e7e5 ...
		
		const lines = response.split('\n');
		let evaluation = 0;
		let bestMove = '';
		let depth = 0;
		const alternativeMoves: Array<{ move: string; evaluation: number }> = [];

		for (const line of lines) {
			if (line.startsWith('info')) {
				const depthMatch = line.match(/depth (\d+)/);
				if (depthMatch) {
					depth = parseInt(depthMatch[1]);
				}

				const scoreMatch = line.match(/score (cp|mate) (-?\d+)/);
				if (scoreMatch) {
					const scoreType = scoreMatch[1];
					const scoreValue = parseInt(scoreMatch[2]);
					
					if (scoreType === 'cp') {
						evaluation = scoreValue;
					} else {
						// Mate in N moves - convert to very large centipawn value
						evaluation = scoreValue > 0 ? 10000 : -10000;
					}
				}

				const pvMatch = line.match(/pv\s+(\S+)/);
				if (pvMatch) {
					bestMove = pvMatch[1];
				}

				const multipvMatch = line.match(/multipv (\d+)/);
				if (multipvMatch && parseInt(multipvMatch[1]) > 1) {
					// Alternative move
					alternativeMoves.push({ move: bestMove, evaluation });
				}
			} else if (line.startsWith('bestmove')) {
				const bestmoveMatch = line.match(/bestmove (\S+)/);
				if (bestmoveMatch) {
					bestMove = bestmoveMatch[1];
				}
			}
		}

		return {
			evaluation,
			bestMove,
			alternativeMoves: alternativeMoves.length > 0 ? alternativeMoves : undefined,
			depth
		};
	}

	/**
	 * Ensure engine is ready
	 */
	private async ensureReady(): Promise<void> {
		if (!this.isReady) {
			await this.initialize();
		}
	}

	/**
	 * Stop current analysis
	 */
	async stop(): Promise<void> {
		if (this.stockfishInstance) {
			await this.sendUCICommand('stop');
		}
	}

	/**
	 * Cleanup and terminate engine
	 */
	terminate(): void {
		if (this.stockfishInstance) {
			this.stockfishInstance.terminate();
			this.stockfishInstance = null;
			this.isReady = false;
			this.uciReady = false;
			this.readyPromise = null;
			this.currentAnalysisResponse = '';
		}
	}
}

