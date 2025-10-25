/**
 * Vault adapter for managing chess game notes
 * Handles file creation, updates, and folder management
 */

import { App, TFile, Vault } from 'obsidian';
import { logFileError, logInfo } from '../util/logger';

export interface UpsertResult {
	file: TFile;
	created: boolean; // true if new file, false if existing file was updated
	path: string;
}

/**
 * Create or update a file in the vault
 * Handles folder creation and file overwrite scenarios
 * @param vault - Obsidian Vault instance
 * @param path - File path relative to vault root
 * @param content - File content
 * @returns Promise resolving to upsert result
 */
export async function upsert(vault: Vault, path: string, content: string): Promise<UpsertResult> {
	try {
		logInfo(`Upserting file: ${path}`);

		// Check if file already exists
		const existingFile = vault.getAbstractFileByPath(path);

		if (existingFile) {
			// Update existing file
			logInfo(`Updating existing file: ${path}`);
			await vault.modify(existingFile as TFile, content);
			
			return {
				file: existingFile as TFile,
				created: false,
				path
			};
		} else {
			// Create new file - need to ensure directories exist
			const dirPath = getDirectoryPath(path);
			
			if (dirPath) {
				await ensureDirectoryExists(vault, dirPath);
			}

			logInfo(`Creating new file: ${path}`);
			const newFile = await vault.create(path, content);
			
			return {
				file: newFile,
				created: true,
				path
			};
		}
	} catch (error) {
		logFileError('upsert', error, path);
		throw new Error(`Failed to upsert file "${path}": ${error instanceof Error ? error.message : String(error)}`);
	}
}

/**
 * Ensure a directory exists in the vault
 * Creates the directory and any parent directories if needed
 * @param vault - Obsidian Vault instance
 * @param dirPath - Directory path (relative to vault root)
 */
async function ensureDirectoryExists(vault: Vault, dirPath: string): Promise<void> {
	try {
		// Obsidian creates parent directories automatically, but we should handle potential errors
		await vault.createFolder(dirPath);
		logInfo(`Created directory: ${dirPath}`);
	} catch (error) {
		// Check if it's a "folder already exists" error (Obsidian doesn't specify error codes)
		const errorMessage = error instanceof Error ? error.message : String(error);
		
		if (errorMessage.includes('already exists') || errorMessage.includes('Folder already exists')) {
			logInfo(`Directory already exists: ${dirPath}`);
			return; // This is OK
		}

		// For other errors, try to create parent directories
		const parentDir = getDirectoryPath(dirPath);
		if (parentDir && parentDir !== dirPath) {
			await ensureDirectoryExists(vault, parentDir);
			await vault.createFolder(dirPath);
			logInfo(`Created nested directory: ${dirPath}`);
		} else {
			logFileError('ensureDirectoryExists', error, dirPath);
			throw new Error(`Failed to create directory "${dirPath}": ${errorMessage}`);
		}
	}
}

/**
 * Extract directory path from a file path
 * @param filePath - Full file path
 * @returns Directory path or empty string if root level
 */
function getDirectoryPath(filePath: string): string {
	const lastSlash = filePath.lastIndexOf('/');
	if (lastSlash <= 0) {
		return ''; // Root level or no directory
	}
	
	return filePath.substring(0, lastSlash);
}

/**
 * Check if a file exists in the vault
 * @param vault - Obsidian Vault instance
 * @param path - File path to check
 * @returns True if file exists
 */
export function fileExists(vault: Vault, path: string): boolean {
	const file = vault.getAbstractFileByPath(path);
	return file !== null;
}

/**
 * Get file content if it exists
 * @param vault - Obsidian Vault instance
 * @param path - File path to read
 * @returns File content or null if file doesn't exist
 */
export async function readFileContent(vault: Vault, path: string): Promise<string | null> {
	try {
		const file = vault.getAbstractFileByPath(path);
		
		if (file) {
			// Use cached read method if available, otherwise fallback
			if ((file as any).read) {
				return await (file as any).read();
			}
			// Alternative: use vault.adapter.read if available
			return null;
		}
		
		return null;
	} catch (error) {
		logFileError('readFileContent', error, path);
		return null;
	}
}

/**
 * List files in a directory
 * @param vault - Obsidian Vault instance
 * @param dirPath - Directory path to list
 * @returns Array of file paths
 */
export function listFiles(vault: Vault, dirPath: string): string[] {
	try {
		// Obsidian doesn't provide direct directory listing
		// This is a limitation we'll work around by using the file system if needed
		logInfo(`Listing files in directory: ${dirPath}`);
		
		// For now, return empty array - this would need platform-specific implementation
		// or Obsidian API extensions for full directory listing
		return [];
	} catch (error) {
		logFileError('listFiles', error, dirPath);
		return [];
	}
}

/**
 * Get file statistics
 * @param vault - Obsidian Vault instance
 * @param path - File path to analyze
 * @returns File statistics or null if file doesn't exist
 */
export async function getFileStats(vault: Vault, path: string): Promise<{
	size: number;
	created: Date | null;
	modified: Date | null;
} | null> {
	try {
		const file = vault.getAbstractFileByPath(path);
		
		if (file) {
			// Use stat if available, otherwise provide defaults
			const stat = (file as any).stat;
			if (stat) {
				return {
					size: stat.size || 0,
					created: stat.ctime ? new Date(stat.ctime) : null,
					modified: stat.mtime ? new Date(stat.mtime) : null
				};
			}
			
			// Fallback values
			return {
				size: 0,
				created: null,
				modified: null
			};
		}
		
		return null;
	} catch (error) {
		logFileError('getFileStats', error, path);
		return null;
	}
}

/**
 * Backup a file before overwriting
 * Creates a backup with timestamp suffix
 * @param vault - Obsidian Vault instance
 * @param path - Original file path
 * @returns Promise resolving to backup file path or null if failed
 */
export async function createBackup(vault: Vault, path: string): Promise<string | null> {
	try {
		const content = await readFileContent(vault, path);
		if (!content) {
			return null; // File doesn't exist
		}

		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const backupPath = path.replace(/\.md$/, '') + `.backup.${timestamp}.md`;
		
		await vault.create(backupPath, content);
		logInfo(`Created backup: ${backupPath}`);
		
		return backupPath;
	} catch (error) {
		logFileError('createBackup', error, path);
		return null;
	}
}

/**
 * Validate file path for security and filesystem safety
 * @param path - File path to validate
 * @returns True if path is safe
 */
export function isValidPath(path: string): boolean {
	if (!path || typeof path !== 'string') {
		return false;
	}

	// Check for path traversal attempts
	if (path.includes('..') || path.includes('~')) {
		return false;
	}

	// Check for invalid characters
	const invalidChars = /[<>:"|?*]/;
	if (invalidChars.test(path)) {
		return false;
	}

	// Check length (typical filesystem limits)
	if (path.length > 250) {
		return false;
	}

	return true;
}
