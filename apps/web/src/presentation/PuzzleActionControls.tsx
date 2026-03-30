import { Eye, Lightbulb, RotateCcw, RefreshCw } from "lucide-react";
import { Button } from "../components/ui/button.js";

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
    <div className="mt-3 flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={onHint} disabled={hintDisabled}>
        <Lightbulb className="size-3.5" />
        Hint
      </Button>
      <Button variant="outline" size="sm" onClick={onReveal} disabled={revealDisabled}>
        <Eye className="size-3.5" />
        Reveal
      </Button>
      <Button variant="ghost" size="sm" onClick={onReset}>
        <RotateCcw className="size-3.5" />
        Reset
      </Button>
      <Button variant="ghost" size="sm" onClick={onTryAgain}>
        <RefreshCw className="size-3.5" />
        Try again
      </Button>
    </div>
  );
}
