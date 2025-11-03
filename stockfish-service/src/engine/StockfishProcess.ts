/**
 * Stockfish Process Manager
 * Handles spawning, communication, and lifecycle of Stockfish engine process
 */

import { spawn, ChildProcess } from 'child_process';
import { Mutex } from 'async-mutex';

export interface StockfishMessage {
	command: string;
	resolve: (value: string) => void;
	reject: (error: Error) => void;
	timeout?: NodeJS.Timeout;
}

export class StockfishProcess {
	private process: ChildProcess | null = null;
	private isReady: boolean = false;
	private messageQueue: StockfishMessage[] = [];
	private currentAnalysis: string = '';
	private analysisMutex: Mutex;
	private stockfishPath: string;
	private engineThreads: number;
	private engineHash: number;

	constructor(stockfishPath: string = 'stockfish', engineThreads: number = 1, engineHash: number = 128) {
		this.stockfishPath = stockfishPath;
		this.engineThreads = engineThreads;
		this.engineHash = engineHash;
		this.analysisMutex = new Mutex();
	}

	/**
	 * Initialize Stockfish process
	 */
	async initialize(): Promise<void> {
		if (this.process && this.isReady) {
			return;
		}

		if (this.process) {
			this.terminate();
		}

		return new Promise((resolve, reject) => {
			try {
				this.process = spawn(this.stockfishPath, [], {
					stdio: ['pipe', 'pipe', 'pipe'],
				});

				this.process.stdout?.on('data', (data: Buffer) => {
					this.handleOutput(data.toString());
				});

				this.process.stderr?.on('data', (data: Buffer) => {
					console.error(`Stockfish stderr: ${data.toString()}`);
				});

				this.process.on('error', (error) => {
					console.error('Stockfish process error:', error);
					this.isReady = false;
					reject(error);
				});

				this.process.on('exit', (code) => {
					console.log(`Stockfish process exited with code ${code}`);
					this.isReady = false;
					this.process = null;
				});

				// Initialize UCI protocol
				this.sendCommand('uci', 5000)
					.then(() => {
						return this.sendCommand('isready', 5000);
					})
					.then(() => {
						// Set options without waiting for response (they don't send responses)
						if (this.process?.stdin) {
							this.process.stdin.write(`setoption name Threads value ${this.engineThreads}\n`);
							this.process.stdin.write(`setoption name Hash value ${this.engineHash}\n`);
						}
						this.isReady = true;
						resolve();
					})
					.catch(reject);
			} catch (error) {
				reject(error);
			}
		});
	}

	/**
	 * Handle output from Stockfish
	 */
	private handleOutput(output: string): void {
		const lines = output.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);

		for (const line of lines) {
			console.log(`[Stockfish] ${line}`); // Debug logging
			const firstWord = line.split(' ')[0];

			// Handle queued messages - check all messages, not just first
			for (let i = this.messageQueue.length - 1; i >= 0; i--) {
				const message = this.messageQueue[i];
				if (!message) continue;
				
				// Match responses based on command type
				let matched = false;
				if (message.command === 'uci' && line === 'uciok') {
					matched = true;
				} else if (message.command === 'isready' && line === 'readyok') {
					matched = true;
				} else if (message.command.startsWith('go') && firstWord === 'bestmove') {
					matched = true;
				} else if (message.command === 'quit') {
					// Quit doesn't have a response - resolve immediately
					matched = true;
				}
				
				if (matched) {
					if (message.timeout) {
						clearTimeout(message.timeout);
					}
					this.messageQueue.splice(i, 1);
					message.resolve(line);
					break; // Only resolve one message per line
				}
			}

			// Accumulate analysis output (for go commands)
			if (firstWord === 'info' || firstWord === 'bestmove') {
				this.currentAnalysis += line + '\n';
			}
		}
	}

	/**
	 * Send command to Stockfish and wait for response
	 */
	private async sendCommand(command: string, timeout: number = 10000): Promise<string> {
		if (!this.process || !this.process.stdin) {
			throw new Error('Stockfish process not initialized');
		}

		const processRef = this.process;
		const stdinRef = processRef?.stdin;
		return new Promise((resolve, reject) => {
			let resolved = false;
			
			const timeoutId = setTimeout(() => {
				if (!resolved) {
					resolved = true;
					const index = this.messageQueue.findIndex((m) => m.command === command);
					if (index >= 0) {
						this.messageQueue.splice(index, 1);
					}
					reject(new Error(`Timeout waiting for response to: ${command}`));
				}
			}, timeout);

			const message: StockfishMessage = {
				command,
				resolve: (value: string) => {
					if (!resolved) {
						resolved = true;
						clearTimeout(timeoutId);
						resolve(value);
					}
				},
				reject: (error: Error) => {
					if (!resolved) {
						resolved = true;
						clearTimeout(timeoutId);
						reject(error);
					}
				},
				timeout: timeoutId,
			};

			this.messageQueue.push(message);
			const stdin = stdinRef!;
			// Write command to stdin
			try {
				if (!stdin.write(command + '\n')) {
					// Handle backpressure
					stdin.once('drain', () => {
						console.log(`[Stockfish] Command written: ${command}`);
					});
				} else {
					console.log(`[Stockfish] Command sent: ${command}`);
				}
			} catch (error) {
				resolved = true;
				clearTimeout(timeoutId);
				const index = this.messageQueue.findIndex((m) => m.command === command);
				if (index >= 0) {
					this.messageQueue.splice(index, 1);
				}
				reject(new Error(`Failed to send command: ${error}`));
			}
		});
	}

	/**
	 * Analyze position
	 */
	async analyze(request: {
		fen?: string;
		moves?: string[];
		depth: number;
		multiPV: number;
		movetimeMs: number;
	}): Promise<string> {
		return this.analysisMutex.runExclusive(async () => {
			if (!this.isReady) {
				await this.initialize();
			}

			// Clear previous analysis
			this.currentAnalysis = '';

			// Set position (position command doesn't have a response in UCI)
			const fenInput = (request.fen ?? '').trim();
			let positionCommand = 'position';
			if (!fenInput || fenInput.toLowerCase() === 'startpos') {
				positionCommand += ' startpos';
			} else {
				positionCommand += ` fen ${fenInput}`;
			}

			if (request.moves && request.moves.length > 0) {
				positionCommand += ` moves ${request.moves.join(' ')}`;
			}

			// Send position command without waiting for response (UCI protocol doesn't send one)
			if (this.process?.stdin) {
				this.process.stdin.write(positionCommand + '\n');
				console.log(`[Stockfish] Position set: ${positionCommand}`);
			} else {
				throw new Error('Stockfish process stdin not available');
			}

			// Build go command
			let goCommand = 'go';
			if (request.movetimeMs > 0) {
				goCommand += ` movetime ${request.movetimeMs}`;
			} else {
				goCommand += ` depth ${request.depth}`;
			}

			if (request.multiPV > 1) {
				goCommand += ` multipv ${request.multiPV}`;
			}

			// Send analysis command and wait for bestmove
			const startTime = Date.now();
			await this.sendCommand(goCommand, Math.max(30000, request.movetimeMs || 30000)); // Use request timeout or 30s default
			const timingMs = Date.now() - startTime;

			// Return accumulated analysis
			return this.currentAnalysis;
		});
	}

	/**
	 * Get engine version
	 */
	async getVersion(): Promise<string> {
		if (!this.isReady) {
			await this.initialize();
		}

		// Send uci command and parse version from response
		const response = await this.sendCommand('uci', 5000);
		const lines = response.split('\n');
		for (const line of lines) {
			const versionMatch = line.match(/id name (.+)/);
			if (versionMatch) {
				return versionMatch[1];
			}
		}
		return 'Unknown';
	}

	/**
	 * Check if engine is ready
	 */
	checkReady(): boolean {
		return this.isReady && this.process !== null;
	}

	/**
	 * Terminate Stockfish process
	 */
	terminate(): void {
		if (this.process) {
			this.sendCommand('quit').catch(() => {
				// Ignore errors during quit
			});
			setTimeout(() => {
				if (this.process) {
					this.process.kill();
					this.process = null;
				}
			}, 1000);
		}
		this.isReady = false;
		this.messageQueue = [];
		this.currentAnalysis = '';
	}
}

