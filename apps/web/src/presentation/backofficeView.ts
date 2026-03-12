import { ANALYSIS_POLICY } from "../domain/analysisPolicy.js";
import { PUZZLE_CLASSIFICATION_THRESHOLDS } from "../domain/puzzles.js";

export type BackofficeConfigField = {
  key: string;
  label: string;
  value: string;
  help: string;
};

export type BackofficeConfigSection = {
  id: string;
  title: string;
  description: string;
  fields: BackofficeConfigField[];
};

export function buildBackofficeConfigSections(): BackofficeConfigSection[] {
  // TODO: replace these read-only sections with persisted admin config once validation and storage are in place.
  return [
    {
      id: "analysis-depths",
      title: "Depths",
      description: "Analysis depth rules used by the browser Stockfish pipeline.",
      fields: [
        {
          key: "defaultDepth",
          label: "Default depth",
          value: String(ANALYSIS_POLICY.defaultDepth),
          help: "Applied to games up to 200 plies."
        },
        {
          key: "longGameDepth",
          label: "Long game depth",
          value: String(ANALYSIS_POLICY.longGameDepth),
          help: `Applied once a game reaches ${ANALYSIS_POLICY.longGameMinPlies} plies.`
        },
        {
          key: "veryLongGameDepth",
          label: "Very long game depth",
          value: String(ANALYSIS_POLICY.veryLongGameDepth),
          help: `Applied once a game reaches ${ANALYSIS_POLICY.veryLongGameMinPlies} plies.`
        },
        {
          key: "retryDepthStep",
          label: "Retry depth step",
          value: String(ANALYSIS_POLICY.retryDepthStep),
          help: "Depth reduction used when a step times out or the engine errors."
        },
        {
          key: "retryMinDepth",
          label: "Retry minimum depth",
          value: String(ANALYSIS_POLICY.retryMinDepth),
          help: "Lower bound for retry-based depth reduction."
        }
      ]
    },
    {
      id: "analysis-lines-and-limits",
      title: "Lines and Limits",
      description: "Engine line count, worker resource hints, and analysis runtime bounds.",
      fields: [
        {
          key: "defaultMultiPV",
          label: "MultiPV lines",
          value: String(ANALYSIS_POLICY.defaultMultiPV),
          help: "Number of principal variations requested from Stockfish."
        },
        {
          key: "defaultThreadsMobile",
          label: "Mobile threads",
          value: String(ANALYSIS_POLICY.defaultThreadsMobile),
          help: "Current thread hint for constrained devices."
        },
        {
          key: "defaultHashMbMobile",
          label: "Mobile hash (MB)",
          value: String(ANALYSIS_POLICY.defaultHashMbMobile),
          help: "Current browser-side hash hint for constrained devices."
        },
        {
          key: "softPerPositionMaxMs",
          label: "Per-position movetime (ms)",
          value: String(ANALYSIS_POLICY.softPerPositionMaxMs),
          help: "Primary runtime knob passed to Stockfish for each engine request."
        },
        {
          key: "perPlyTimeMultiplier",
          label: "Per-ply multiplier",
          value: String(ANALYSIS_POLICY.perPlyTimeMultiplier),
          help: "Converts movetime into expected wall-clock cost per analyzed ply."
        },
        {
          key: "totalBudgetBuffer",
          label: "Total budget buffer",
          value: String(ANALYSIS_POLICY.totalBudgetBuffer),
          help: "Safety headroom applied on top of projected full-run time."
        },
        {
          key: "emergencyHardCapMs",
          label: "Emergency hard cap (ms)",
          value: String(ANALYSIS_POLICY.emergencyHardCapMs),
          help: "Last-resort ceiling for unusually slow environments."
        }
      ]
    },
    {
      id: "definitions",
      title: "Definitions",
      description: "Puzzle classification thresholds derived from absolute centipawn swing.",
      fields: [
        {
          key: "inaccuracy",
          label: "Inaccuracy",
          value: `>= ${PUZZLE_CLASSIFICATION_THRESHOLDS.inaccuracy} cp`,
          help: "Absolute eval swing between consecutive analyzed plies."
        },
        {
          key: "mistake",
          label: "Mistake",
          value: `>= ${PUZZLE_CLASSIFICATION_THRESHOLDS.mistake} cp`,
          help: "Absolute eval swing between consecutive analyzed plies."
        },
        {
          key: "blunder",
          label: "Blunder",
          value: `>= ${PUZZLE_CLASSIFICATION_THRESHOLDS.blunder} cp`,
          help: "Absolute eval swing between consecutive analyzed plies."
        }
      ]
    }
  ];
}
