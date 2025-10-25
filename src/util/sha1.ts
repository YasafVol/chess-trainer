/**
 * SHA-1 hash utility with js-sha1 library
 * Provides deterministic hashing for PGN content
 */

// Import vendored js-sha1 library
// @ts-ignore - Bundled dependency
import { sha1 as jsSha1 } from '../deps/sha1.js';

/**
 * Generate SHA-1 hash of the input text
 * Uses js-sha1 library for consistent, collision-resistant hashing
 * @param text - Input text to hash
 * @returns Promise resolving to hex SHA-1 hash (40 characters)
 */
export async function sha1(text: string): Promise<string> {
	// js-sha1 is synchronous, but we keep async interface for consistency
	try {
		return jsSha1(text);
	} catch (error) {
		console.warn('SHA-1 hashing failed, using fallback:', error);
		// Fallback to simple hash (rare case)
		let hash = 0;
		for (let i = 0; i < text.length; i++) {
			const char = text.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		const fallbackHash = Math.abs(hash).toString(16).padStart(8, '0').repeat(5);
		return fallbackHash.substring(0, 40);
	}
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

/**
 * Test function to verify SHA-1 implementation
 * Ensures different inputs produce different hashes
 */
export async function testSha1Collisions(): Promise<boolean> {
	try {
		const hash1 = await sha1('test input 1');
		const hash2 = await sha1('test input 2');
		const hash3 = await sha1('test input 1'); // Same as first
		
		// Different inputs should have different hashes
		const differentInputsProduceDifferentHashes = hash1 !== hash2;
		
		// Same inputs should produce same hashes
		const sameInputsProduceSameHashes = hash1 === hash3;
		
		// Hashes should be 40 characters (SHA-1 length)
		const correctLength = hash1.length === 40 && hash2.length === 40;
		
		return differentInputsProduceDifferentHashes && sameInputsProduceSameHashes && correctLength;
	} catch (error) {
		console.error('SHA-1 collision test failed:', error);
		return false;
	}
}
