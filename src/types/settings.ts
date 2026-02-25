/**
 * Plugin settings interface
 */

export interface ChessTrainerSettings {
	// Analysis settings
	analysisEnabled: boolean;
	serviceUrl: string;
	defaultDepth: number;
	defaultMultiPV: number;
	defaultMovetimeMs: number;
	// Engine strength settings
	limitStrength: boolean;
	defaultEngineElo: number;
	defaultEngineSkill: number;
	// Evaluation breakdown visibility settings
	showEvalBreakdown: {
		material: boolean;
		pawns: boolean;
		kingSafety: boolean;
		mobility: boolean;
		space: boolean;
		threats: boolean;
	};
	boardSizePx: number; // 0 = auto-fit to container width
	moveWindowHeightPx: number; // Height of the move viewer window
}

export const DEFAULT_SETTINGS: ChessTrainerSettings = {
	analysisEnabled: false,
	serviceUrl: 'http://localhost:9898',
	defaultDepth: 14,
	defaultMultiPV: 1,
	defaultMovetimeMs: 0,
	limitStrength: true,
	defaultEngineElo: 2400,
	defaultEngineSkill: 20,
	showEvalBreakdown: {
		material: true,
		pawns: true,
		kingSafety: true,
		mobility: true,
		space: true,
		threats: true,
	},
	boardSizePx: 0,
	moveWindowHeightPx: 450,
};


