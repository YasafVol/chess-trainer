/**
 * PGN validation service using chess.js
 * Validates PGN format, headers, and moves
 */

import { logPgnError } from '../util/logger';
import { normalizePgnInput } from '../util/pgn';

// Import chess.js - using dynamic import to handle bundling
// @ts-ignore - Bundled dependency
import { Chess } from '../deps/chess.js.mjs';

export interface PgnValidationError {
	type: 'empty' | 'no_headers' | 'no_moves' | 'invalid_move' | 'parse_error' | 'too_long';
	message: string;
	line?: number;
}

export interface PgnValidationResult {
	isValid: boolean;
	error?: PgnValidationError;
	warnings?: string[];
	normalized?: string;
}

export interface PgnHeaders {
	White?: string;
	Black?: string;
	WhiteElo?: string;
	BlackElo?: string;
	Event?: string;
	Site?: string;
	Date?: string;
	Round?: string;
	Result?: string;
	TimeControl?: string;
	ECO?: string;
	Opening?: string;
	[key: string]: string | undefined;
}

const MAX_MOVES = 500; // Maximum number of moves allowed

/**
 * Validate a PGN string for basic format and chess rules
 * @param pgn - PGN string to validate
 * @returns Validation result with error details if invalid
 */
export function validatePgn(pgn: string): PgnValidationResult {
	if (!pgn || typeof pgn !== 'string') {
		return {
			isValid: false,
			error: {
				type: 'empty',
				message: 'PGN is empty or invalid type'
			}
		};
	}

	const normalizedPgn = normalizePgnInput(pgn);
	if (normalizedPgn.length === 0) {
		return {
			isValid: false,
			error: {
				type: 'empty',
				message: 'PGN is empty'
			}
		};
	}

	// Check for maximum length to prevent performance issues
	const moveLines = normalizedPgn.split('\n').filter(line => {
		const trimmed = line.trim();
		return trimmed && !trimmed.startsWith('[') && !trimmed.startsWith('{');
	});

	if (moveLines.length > MAX_MOVES) {
		return {
			isValid: false,
			error: {
				type: 'too_long',
				message: `PGN has too many moves (${moveLines.length}). Maximum allowed is ${MAX_MOVES}.`
			}
		};
	}

	try {
		// Try to parse with chess.js
		const game = new Chess();
		game.loadPgn(normalizedPgn, { strict: false });

		// Additional validation
		const warnings: string[] = [];

		// Check for missing essential headers
		const headers = extractHeaders(normalizedPgn);
		if (!headers.White || !headers.Black) {
			warnings.push('Missing player names in PGN headers');
		}

		if (!headers.Result) {
			warnings.push('Missing game result in PGN headers');
		}

		// Check for unusual game length
		const history = game.history();
		if (history.length === 0) {
			return {
				isValid: false,
				error: {
					type: 'no_moves',
					message: 'PGN contains no moves'
				}
			};
		}

		if (history.length > 300) {
			warnings.push('Very long game - consider splitting if experiencing performance issues');
		}

		return {
			isValid: true,
			warnings: warnings.length > 0 ? warnings : undefined,
			normalized: normalizedPgn
		};

	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		
		// Try to extract line number from error message
		const lineMatch = errorMessage.match(/line (\d+)/i);
		const line = lineMatch ? parseInt(lineMatch[1]) : undefined;
		
		// Enhanced error message for invalid moves
		let enhancedMessage = errorMessage;
		if (errorMessage.includes('Invalid move in PGN:')) {
			const moveMatch = errorMessage.match(/Invalid move in PGN: (.+)/);
			if (moveMatch) {
				const invalidMove = moveMatch[1];
				enhancedMessage = `Invalid move "${invalidMove}" in PGN. This move is not legal from the current position. The PGN may contain an error, or the move notation may be incorrect.`;
			}
		}

		return {
			isValid: false,
			error: {
				type: 'parse_error',
				message: enhancedMessage,
				line
			}
		};
	}
}

/**
 * Extract headers from PGN string
 * @param pgn - PGN string
 * @returns Object containing extracted headers
 */
export function extractHeaders(pgn: string): PgnHeaders {
	const headers: PgnHeaders = {};
	const headerRegex = /^\[([A-Za-z]+)\s+"([^"]*)"\]$/gm;
	let match;

	while ((match = headerRegex.exec(pgn)) !== null) {
		const [, key, value] = match;
		headers[key] = value;
	}

	return headers;
}

/**
 * Extract moves from PGN string (simplified extraction)
 * @param pgn - PGN string
 * @returns Array of move strings
 */
function extractMoves(pgn: string): string[] {
	const moves: string[] = [];
	
	// Remove headers and comments
	const cleanPgn = pgn
		.replace(/^\[.*?\]$/gm, '') // Remove headers
		.replace(/\{[^}]*\}/g, '') // Remove comments
		.replace(/\$\d+/g, '') // Remove NAGs
		.trim();

	// Extract moves (basic extraction)
	const lines = cleanPgn.split('\n');
	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed && !trimmed.startsWith('[') && !trimmed.startsWith('{')) {
			// Remove move numbers and extract actual moves
			const movesInLine = trimmed
				.replace(/\d+\.+?\s*/g, '') // Remove move numbers
				.replace(/\s*\d+-\d+\s*/g, '') // Remove score lines
				.replace(/\s*[01]-[01]\s*/g, '') // Remove result notation
				.trim()
				.split(/\s+/)
				.filter(move => move && move !== '1-0' && move !== '0-1' && move !== '1/2-1/2' && move !== '*');
			
			moves.push(...movesInLine);
		}
	}

	return moves;
}

/**
 * Check if PGN is likely a multi-game file
 * @param pgn - PGN string
 * @returns True if appears to contain multiple games
 */
export function isMultiGamePgn(pgn: string): boolean {
	const headerCount = (pgn.match(/^\[Event/gm) || []).length;
	return headerCount > 1;
}

/**
 * Get basic game statistics
 * @param pgn - Valid PGN string
 * @returns Game statistics
 */
export function getGameStats(pgn: string): {
	moves: number;
	hasComments: boolean;
	hasVariations: boolean;
	estimatedTime?: string;
} | null {
	try {
		const game = new Chess();
		game.loadPgn(pgn, { strict: false });

		const history = game.history();
		const hasComments = pgn.includes('{') && pgn.includes('}');
		const hasVariations = pgn.includes('(') && pgn.includes(')');

		// Estimate game time from headers
	const headers = extractHeaders(normalizePgnInput(pgn));
		let estimatedTime: string | undefined;
		if (headers.TimeControl) {
			const tc = headers.TimeControl;
			if (tc.includes('+')) {
				estimatedTime = 'Increment';
			} else if (tc.includes('/')) {
				estimatedTime = 'Classical';
			} else if (parseInt(tc) < 300) {
				estimatedTime = 'Blitz';
			} else if (parseInt(tc) < 600) {
				estimatedTime = 'Rapid';
			} else {
				estimatedTime = 'Classical';
			}
		}

		return {
			moves: history.length,
			hasComments,
			hasVariations,
			estimatedTime
		};
	} catch (error) {
		logPgnError({
			type: 'parse_error',
			message: 'Failed to analyze game statistics'
		});
		return null;
	}
}
