/**
 * Annotation storage service
 * Stores and retrieves game analysis annotations
 */

import { Vault } from 'obsidian';
import { GameAnalysis, PositionEvaluation } from '../../types/analysis';
import { upsert, readFileContent } from '../../adapters/NoteRepo';
import { logInfo, logError } from '../../util/logger';

const ANNOTATIONS_DIR = 'Chess/games';
const LEGACY_ANNOTATIONS_DIR = 'Chess/games/annotations';

/**
 * Save game analysis annotations to file
 */
export async function saveAnnotations(
	vault: Vault,
	gameHash: string,
	analysis: GameAnalysis
): Promise<void> {
	try {
		const path = `${ANNOTATIONS_DIR}/${gameHash}.json`;
		
		const annotationData = {
			gameHash,
			created: new Date().toISOString(),
			moves: analysis.moves,
			statistics: analysis.statistics,
			depth: analysis.depth,
			analysisTime: analysis.analysisTime,
			analysisDate: analysis.analysisDate
		};

		const content = JSON.stringify(annotationData, null, 2);
		await upsert(vault, path, content);
		
		logInfo(`Saved annotations for game ${gameHash}`);
	} catch (error) {
		logError('Failed to save annotations', error);
		throw error;
	}
}

/**
 * Load game analysis annotations from file
 */
export async function loadAnnotations(
	vault: Vault,
	gameHash: string
): Promise<GameAnalysis | null> {
	try {
		const path = `${ANNOTATIONS_DIR}/${gameHash}.json`;
		let content = await readFileContent(vault, path);

		if (!content) {
			// Fallback to legacy location for backward compatibility
			content = await readFileContent(vault, `${LEGACY_ANNOTATIONS_DIR}/${gameHash}.json`);
		}
		
		if (!content) {
			return null;
		}

		const data = JSON.parse(content);
		
		// Remove metadata fields and reconstruct GameAnalysis
		const analysis: GameAnalysis = {
			gameHash: data.gameHash || gameHash,
			analysisDate: data.analysisDate || data.created,
			depth: data.depth,
			analysisTime: data.analysisTime || 0,
			moves: data.moves || [],
			statistics: data.statistics || {
				averageEvaluation: 0,
				accuracy: 0,
				bestMoves: 0,
				excellentMoves: 0,
				goodMoves: 0,
				inaccuracies: 0,
				mistakes: 0,
				blunders: 0,
				totalMoves: 0
			}
		};
		
		return analysis;
	} catch (error) {
		logError(`Failed to load annotations for game ${gameHash}`, error);
		return null;
	}
}

/**
 * Check if annotations exist for a game
 */
export function annotationsExist(vault: Vault, gameHash: string): boolean {
	const path = `${ANNOTATIONS_DIR}/${gameHash}.json`;
	const legacyPath = `${LEGACY_ANNOTATIONS_DIR}/${gameHash}.json`;
	return Boolean(
		vault.getAbstractFileByPath(path) ??
		vault.getAbstractFileByPath(legacyPath)
	);
}

