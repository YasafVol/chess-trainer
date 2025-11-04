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
	boardSizePx: number; // 0 = auto-fit to container width
}

export const DEFAULT_SETTINGS: ChessTrainerSettings = {
	analysisEnabled: false,
	serviceUrl: 'http://localhost:9898',
	defaultDepth: 14,
	defaultMultiPV: 1,
	defaultMovetimeMs: 0,
	boardSizePx: 0,
};


