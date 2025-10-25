/**
 * Filename utility for generating safe, deterministic chess game filenames
 * Handles sanitization, international characters, and filename generation
 */

/**
 * Sanitize a string for use in filenames
 * Removes or replaces filesystem-unsafe characters
 * @param input - String to sanitize
 * @returns Sanitized string safe for filenames
 */
export function sanitizeFilename(input: string): string {
	if (!input) {
		return 'Unknown';
	}

	return input
		// Replace problematic characters with underscores
		.replace(/[\/\\:*?"<>|]/g, '_')
		// Replace multiple spaces with single space
		.replace(/\s+/g, ' ')
		// Remove leading/trailing whitespace
		.trim()
		// Limit length to prevent issues
		.substring(0, 50);
}

/**
 * Sanitize and normalize player name
 * Handles international characters and special cases
 * @param name - Player name
 * @returns Sanitized player name
 */
export function sanitizePlayerName(name: string): string {
	if (!name) {
		return 'Unknown';
	}

	// Remove common titles and suffixes
	const cleanName = name
		.replace(/\b(?:GM|IM|FM|WGM|WIM|WFM)\b\.?/gi, '') // Remove chess titles
		.replace(/\([^)]*\)/g, '') // Remove parenthetical information
		.trim();

	return sanitizeFilename(cleanName);
}

/**
 * Format player with Elo rating
 * @param name - Player name
 * @param elo - Player Elo rating (can be null/undefined)
 * @returns Formatted player string (e.g., "Magnus(2847)" or "Unknown")
 */
export function formatPlayer(name: string, elo: number | null | undefined): string {
	const sanitizedName = sanitizePlayerName(name);
	
	if (elo && elo > 0) {
		return `${sanitizedName}(${elo})`;
	}
	
	return sanitizedName;
}

/**
 * Normalize PGN date string to ISO format
 * @param pgnDate - Date from PGN header (format: "YYYY.MM.DD")
 * @returns ISO date string "YYYY-MM-DD" or current date if invalid
 */
export function normalizeDate(pgnDate?: string): string {
	if (!pgnDate) {
		return new Date().toISOString().split('T')[0];
	}

	// Handle PGN date format "YYYY.MM.DD"
	const dateMatch = pgnDate.match(/^(\d{4})\.(\d{2})\.(\d{2})$/);
	if (dateMatch) {
		const [, year, month, day] = dateMatch;
		// Validate date components
		const yearNum = parseInt(year);
		const monthNum = parseInt(month);
		const dayNum = parseInt(day);
		
		if (yearNum >= 1900 && yearNum <= 2100 && 
			monthNum >= 1 && monthNum <= 12 && 
			dayNum >= 1 && dayNum <= 31) {
			return `${year}-${month}-${day}`;
		}
	}

	// Fallback to current date
	return new Date().toISOString().split('T')[0];
}

/**
 * Generate chess game filename from PGN headers
 * @param headers - PGN headers object
 * @param hash - Short hash for uniqueness
 * @returns Generated filename in format: "YYYY-MM-DD White(Elo)-vs-Black(Elo) Result hash.md"
 */
export function generateChessFilename(headers: {
	White?: string;
	Black?: string;
	WhiteElo?: string;
	BlackElo?: string;
	Date?: string;
	Result?: string;
}, hash: string): string {
	const white = formatPlayer(headers.White || 'White', parseElo(headers.WhiteElo));
	const black = formatPlayer(headers.Black || 'Black', parseElo(headers.BlackElo));
	const date = normalizeDate(headers.Date);
	const result = headers.Result || '*';

	return `${date} ${white}-vs-${black} ${result} ${hash}.md`;
}

/**
 * Parse Elo rating from PGN header
 * @param eloString - Elo rating string from PGN
 * @returns Parsed Elo as number or null if invalid
 */
function parseElo(eloString?: string): number | null {
	if (!eloString) {
		return null;
	}

	const elo = parseInt(eloString.replace(/[^\d]/g, ''));
	
	if (elo >= 0 && elo <= 4000) {
		return elo;
	}
	
	return null;
}

/**
 * Validate filename doesn't exceed filesystem limits
 * @param filename - Filename to validate
 * @returns True if filename is safe
 */
export function isFilenameSafe(filename: string): boolean {
	// Check length (typical limit is 255 characters)
	if (filename.length > 200) {
		return false;
	}

	// Check for forbidden characters
	const forbidden = /[\/\\:*?"<>|]/;
	if (forbidden.test(filename)) {
		return false;
	}

	// Check for reserved names (Windows)
	const reserved = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
	const baseName = filename.replace(/\.[^.]+$/, ''); // Remove extension
	if (reserved.test(baseName)) {
		return false;
	}

	return true;
}
