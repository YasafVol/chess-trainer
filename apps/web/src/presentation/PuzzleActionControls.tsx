type PuzzleActionControlsProps = {
  hintDisabled: boolean;
  revealDisabled: boolean;
  onHint: () => void;
  onReveal: () => void;
  onReset: () => void;
  onTryAgain: () => void;
};

export function PuzzleActionControls({
  hintDisabled,
  revealDisabled,
  onHint,
  onReveal,
  onReset,
  onTryAgain
}: PuzzleActionControlsProps) {
  return (
    <div className="controls">
      <button className="action-button" onClick={onHint} disabled={hintDisabled}>
        Hint
      </button>
      <button className="action-button" onClick={onReveal} disabled={revealDisabled}>
        Reveal
      </button>
      <button className="action-button" onClick={onReset}>
        Reset
      </button>
      <button className="action-button" onClick={onTryAgain}>
        Try again
      </button>
    </div>
  );
}
