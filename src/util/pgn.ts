/**
 * Normalize PGN input to improve parsing tolerance.
 * - Converts Windows line endings to Unix.
 * - Strips inline ';' comments and BOM characters.
 * - Collapses excessive whitespace while preserving blank lines.
 * - Removes comment lines starting with #
 */
export function normalizePgnInput(pgn: string): string {
	if (!pgn) {
		return '';
	}

	let normalized = pgn
		.replace(/\uFEFF/g, '') // remove BOM
		.replace(/\r\n?/g, '\n')
		.replace(/^#.*$/gm, '') // remove comment lines starting with #
		.replace(/\t/g, ' ')
		.replace(/;[^\n]*/g, '') // strip ';' comments
		.replace(/[ \f\v]+/g, ' '); // collapse misc spaces

	// Ensure headers and moves are separated by a blank line
	const headerMatch = normalized.match(/^(\s*\[[^\]]+\]\s*\n)+/m);
	if (headerMatch) {
		const headerBlock = headerMatch[0];
		const rest = normalized.slice(headerBlock.length).replace(/^\s+/, '');
		normalized = `${headerBlock.trimEnd()}\n\n${rest}`;
	}

	return normalized
		.split('\n')
		.map(line => line.trimEnd())
		.join('\n')
		.trim();
}
