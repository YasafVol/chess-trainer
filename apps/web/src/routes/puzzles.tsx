import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { Puzzle } from "../domain/types";
import { usePuzzles } from "../lib/runtimeGateway";
import type { PuzzleDifficultyFilter, PuzzleOwnershipFilter, PuzzleTab } from "../presentation/puzzleView";
import { filterPuzzles } from "../presentation/puzzleView";
import { cn } from "@/lib/utils";

const DIFFICULTY_FILTERS: PuzzleDifficultyFilter[] = ["all", 1, 2, 3, 4, 5];
const OWNERSHIP_FILTERS: PuzzleOwnershipFilter[] = ["all", "mine", "other"];

function tabLabel(tab: PuzzleTab): string {
  return tab === "blunder" ? "Blunders" : "Mistakes";
}

function ownershipLabel(filter: PuzzleOwnershipFilter, activeTab: PuzzleTab): string {
  if (filter === "all") {
    return "All";
  }
  if (filter === "mine") {
    return activeTab === "blunder" ? "My blunders" : "My mistakes";
  }
  return activeTab === "blunder" ? "Other blunders" : "Other mistakes";
}

function readDifficultyFilter(value: string): PuzzleDifficultyFilter {
  if (value === "all") {
    return "all";
  }

  const parsed = Number(value);
  return parsed >= 1 && parsed <= 5 ? (parsed as PuzzleDifficultyFilter) : "all";
}

function readOwnershipFilter(value: string): PuzzleOwnershipFilter {
  if (value === "mine" || value === "other") {
    return value;
  }
  return "all";
}

export function PuzzlesPage() {
  const puzzles = usePuzzles();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<PuzzleTab>("blunder");
  const [ownershipFilter, setOwnershipFilter] = useState<PuzzleOwnershipFilter>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<PuzzleDifficultyFilter>("all");

  if (puzzles === undefined) {
    return <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm"><p className="text-muted-foreground">Loading puzzles...</p></section>;
  }

  const rows: Puzzle[] = puzzles;
  const filteredRows = filterPuzzles(rows, activeTab, ownershipFilter, difficultyFilter);
  const blunderCount = rows.filter((puzzle) => puzzle.classification === "blunder").length;
  const mistakeCount = rows.filter((puzzle) => puzzle.classification === "mistake").length;

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Puzzles</h2>
        <p className="text-sm text-muted-foreground">Puzzles are generated automatically from analyzed domain-level mistakes and blunders, then ordered by due date and failures. Use the ownership filter to focus on your own mistakes or the opponent's.</p>
        <p className="mt-2">
          <Button variant="link" className="px-0" asChild>
            <Link to="/puzzles/continuous">Start continuous mode</Link>
          </Button>
        </p>
      </div>

      {rows.length === 0 ? <p className="text-sm text-muted-foreground">No puzzles generated yet. Analyze a game to create some.</p> : null}

      {rows.length > 0 ? (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3.5">
            <div className="inline-flex flex-wrap gap-2" role="tablist" aria-label="Puzzle banks">
              {([
                { id: "blunder", count: blunderCount },
                { id: "mistake", count: mistakeCount }
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors cursor-pointer",
                    activeTab === tab.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground hover:bg-muted"
                  )}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span>{tabLabel(tab.id)}</span>
                  <span className={cn(
                    "inline-flex items-center justify-center min-w-[28px] min-h-[28px] rounded-full px-2 text-xs",
                    activeTab === tab.id ? "bg-white/15" : "bg-muted"
                  )}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">Ownership</span>
                <select
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm min-w-[140px]"
                  value={ownershipFilter}
                  onChange={(event) => setOwnershipFilter(readOwnershipFilter(event.target.value))}
                >
                  {OWNERSHIP_FILTERS.map((value) => (
                    <option key={value} value={value}>
                      {ownershipLabel(value, activeTab)}
                    </option>
                  ))}
                </select>
              </Label>

              <Label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">Difficulty</span>
                <select
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm min-w-[140px]"
                  value={difficultyFilter}
                  onChange={(event) => setDifficultyFilter(readDifficultyFilter(event.target.value))}
                >
                  {DIFFICULTY_FILTERS.map((value) => (
                    <option key={value} value={value}>
                      {value === "all" ? "All" : value}
                    </option>
                  ))}
                </select>
              </Label>
            </div>
          </div>

          {filteredRows.length === 0 ? <p className="text-sm text-muted-foreground">No {ownershipLabel(ownershipFilter, activeTab).toLowerCase()} match the selected filters.</p> : null}

          <ul className="space-y-3">
            {filteredRows.map((puzzle) => (
              <li key={puzzle.id}>
                <button
                  type="button"
                  className="w-full text-left rounded-xl border border-border bg-card p-4 transition-all hover:border-ring/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                  onClick={() => {
                    void navigate({ to: "/puzzles/$puzzleId", params: { puzzleId: puzzle.id } });
                  }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <strong className="text-sm">{puzzle.classification.toUpperCase()}</strong>
                    <Badge variant="secondary">Difficulty {puzzle.difficulty}/5</Badge>
                  </div>
                  {puzzle.themes.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {puzzle.themes.map((theme) => (
                        <Badge key={theme} variant="outline" className="text-xs">{theme}</Badge>
                      ))}
                    </div>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
