/**
 * Centralized logging utility for Chess Trainer plugin
 * Provides consistent error handling and user feedback
 */

import { Notice } from 'obsidian';

export enum LogLevel {
	DEBUG = 0,
	INFO = 1,
	WARN = 2,
	ERROR = 3,
}

export interface LogEntry {
	timestamp: Date;
	level: LogLevel;
	message: string;
	details?: any;
	userVisible?: boolean;
}

/**
 * Logger class for centralized error handling and user feedback
 */
class Logger {
	private logs: LogEntry[] = [];
	private maxLogs = 100; // Keep last 100 log entries
	private currentLogLevel: LogLevel = LogLevel.INFO;

	/**
	 * Set the minimum log level
	 * @param level - Minimum log level to output
	 */
	setLogLevel(level: LogLevel): void {
		this.currentLogLevel = level;
	}

	/**
	 * Log debug information (console only)
	 * @param message - Log message
	 * @param details - Optional details object
	 */
	debug(message: string, details?: any): void {
		this.log(LogLevel.DEBUG, message, details, false);
	}

	/**
	 * Log general information (console only)
	 * @param message - Log message
	 * @param details - Optional details object
	 */
	info(message: string, details?: any): void {
		this.log(LogLevel.INFO, message, details, false);
	}

	/**
	 * Log warning (console + optional user notice)
	 * @param message - Warning message
	 * @param userVisible - Whether to show as notice to user
	 * @param details - Optional details object
	 */
	warn(message: string, userVisible: boolean = false, details?: any): void {
		this.log(LogLevel.WARN, message, details, userVisible);
	}

	/**
	 * Log error (console + user notice)
	 * @param message - Error message
	 * @param details - Optional details object
	 * @param showNotice - Whether to show as notice to user (default: true)
	 */
	error(message: string, details?: any, showNotice: boolean = true): void {
		this.log(LogLevel.ERROR, message, details, showNotice);
	}

	/**
	 * Log PGN validation error with user-friendly message
	 * @param pgnError - PGN validation error details
	 */
	pgnError(pgnError: { type: string; message: string; line?: number }): void {
		const userMessage = this.formatPgnErrorMessage(pgnError);
		this.error(`PGN Validation Error: ${pgnError.message}`, pgnError, true);
	}

	/**
	 * Log file operation error
	 * @param operation - File operation being performed
	 * @param error - Error object
	 * @param filename - Optional filename
	 */
	fileError(operation: string, error: any, filename?: string): void {
		const message = filename 
			? `File operation failed: ${operation} for "${filename}"`
			: `File operation failed: ${operation}`;
		
		this.error(message, { operation, error, filename }, true);
	}

	/**
	 * Get recent logs for debugging
	 * @param maxCount - Maximum number of logs to return
	 * @returns Array of recent log entries
	 */
	getRecentLogs(maxCount: number = 50): LogEntry[] {
		return this.logs.slice(-maxCount);
	}

	/**
	 * Clear all logs
	 */
	clearLogs(): void {
		this.logs = [];
	}

	/**
	 * Internal logging method
	 * @param level - Log level
	 * @param message - Log message
	 * @param details - Optional details
	 * @param showNotice - Whether to show user notice
	 */
	private log(level: LogLevel, message: string, details?: any, showNotice: boolean = false): void {
		const entry: LogEntry = {
			timestamp: new Date(),
			level,
			message,
			details,
			userVisible: showNotice
		};

		// Add to logs
		this.logs.push(entry);
		if (this.logs.length > this.maxLogs) {
			this.logs = this.logs.slice(-this.maxLogs);
		}

		// Console output if above threshold
		if (level >= this.currentLogLevel) {
			const timestamp = entry.timestamp.toISOString();
			const levelName = LogLevel[level];
			const logMessage = `[${timestamp}] ${levelName}: ${message}`;
			
			switch (level) {
				case LogLevel.DEBUG:
				case LogLevel.INFO:
					console.log(logMessage, details || '');
					break;
				case LogLevel.WARN:
					console.warn(logMessage, details || '');
					break;
				case LogLevel.ERROR:
					console.error(logMessage, details || '');
					break;
			}
		}

		// User notification
		if (showNotice) {
			new Notice(message);
		}
	}

	/**
	 * Format PGN validation error for user display
	 * @param error - PGN error object
	 * @returns User-friendly error message
	 */
	private formatPgnErrorMessage(error: { type: string; message: string; line?: number }): string {
		switch (error.type) {
			case 'empty':
				return 'PGN is empty. Please paste a valid chess game in PGN format.';
			case 'no_headers':
				return 'PGN appears to be missing headers. Please ensure it includes player names and game information.';
			case 'no_moves':
				return 'PGN has headers but no moves found. Please check the PGN format.';
			case 'invalid_move':
				const lineInfo = error.line ? ` (line ${error.line})` : '';
				return `Invalid chess move notation found${lineInfo}: ${error.message}`;
			case 'parse_error':
				return `PGN parsing failed: ${error.message}`;
			case 'too_long':
				return 'PGN is too long (maximum 500 moves). Consider splitting into smaller games.';
			default:
				return error.message || 'Invalid PGN format';
		}
	}
}

// Create singleton logger instance
export const logger = new Logger();

// Export convenience functions
export const logDebug = (message: string, details?: any) => logger.debug(message, details);
export const logInfo = (message: string, details?: any) => logger.info(message, details);
export const logWarn = (message: string, userVisible: boolean = false, details?: any) => logger.warn(message, userVisible, details);
export const logError = (message: string, details?: any, showNotice: boolean = true) => logger.error(message, details, showNotice);
export const logPgnError = (error: { type: string; message: string; line?: number }) => logger.pgnError(error);
export const logFileError = (operation: string, error: any, filename?: string) => logger.fileError(operation, error, filename);
