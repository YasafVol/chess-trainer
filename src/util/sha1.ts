/**
 * SHA-1 hash utility with Web Crypto API fallback
 * Provides deterministic hashing for PGN content
 */

// Polyfill for String.padStart if not available
if (!String.prototype.padStart) {
	String.prototype.padStart = function padStart(targetLength: number, padString?: string): string {
		targetLength = targetLength >> 0; // truncate if number or convert non-number to 0
		padString = String(padString || ' ');
		if (this.length > targetLength) {
			return String(this);
		} else {
			targetLength = targetLength - this.length;
			if (targetLength > padString.length) {
				padString += padString.repeat(targetLength / padString.length); // append to original to ensure we are longer than needed
			}
			return padString.slice(0, targetLength) + String(this);
		}
	};
}

// Fallback SHA-1 implementation using simple hash for environments without Web Crypto
// Note: This is NOT cryptographically secure, but provides deterministic hashing for filename generation
async function fallbackSha1(text: string): Promise<string> {
	// Simple hash function for fallback (NOT crypto secure, but deterministic)
	let hash = 0;
	for (let i = 0; i < text.length; i++) {
		const char = text.charCodeAt(i);
		hash = ((hash << 5) - hash) + char;
		hash = hash & hash; // Convert to 32-bit integer
	}
	
	// Convert to hex and pad to 40 characters (SHA-1 length)
	const hexHash = Math.abs(hash).toString(16);
	return hexHash.padStart(8, '0').repeat(5).substring(0, 40); // Repeat and truncate to get 40 chars
}

/**
 * Generate SHA-1 hash of the input text
 * Uses Web Crypto API when available, falls back to simple hash
 * @param text - Input text to hash
 * @returns Promise resolving to hex SHA-1 hash (40 characters)
 */
export async function sha1(text: string): Promise<string> {
	// Feature detection for Web Crypto API
	if (typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.digest === 'function') {
		try {
			const encoder = new TextEncoder();
			const data = encoder.encode(text);
			const hashBuffer = await crypto.subtle.digest('SHA-1', data);
			const hashArray = Array.from(new Uint8Array(hashBuffer));
			const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
			return hashHex;
		} catch (error) {
			console.warn('Web Crypto API failed, using fallback hash:', error);
		}
	}
	
	// Fallback for environments without Web Crypto API
	return fallbackSha1(text);
}

/**
 * Generate a short hash (first 8 characters) for filenames
 * @param text - Input text to hash
 * @returns Promise resolving to 8-character hex string
 */
export async function shortHash(text: string): Promise<string> {
	const fullHash = await sha1(text);
	return fullHash.substring(0, 8);
}
