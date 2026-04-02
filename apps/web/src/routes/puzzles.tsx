import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import type { Puzzle } from "../domain/types";
import { usePuzzles } from "../lib/runtimeGateway";
import type { PuzzleDifficultyFilter, PuzzleOwnershipFilter, PuzzleTab } from "../presentation/puzzleView";
import { filterPuzzles } from "../presentation/puzzleView";

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
    return <section className="page"><p>Loading puzzles...</p></section>;
  }

  const rows: Puzzle[] = puzzles;
  const filteredRows = filterPuzzles(rows, activeTab, ownershipFilter, difficultyFilter);
  const blunderCount = rows.filter((puzzle) => puzzle.classification === "blunder").length;
  const mistakeCount = rows.filter((puzzle) => puzzle.classification === "mistake").length;

  return (
    <section className="page stack-gap">
      <div>
        <h2>Puzzles</h2>
        <p className="muted">Puzzles are generated automatically from analyzed domain-level mistakes and blunders, then ordered by due date and failures. Use the ownership filter to focus on your own mistakes or the opponent's.</p>
        <p><Link to="/puzzles/continuous">Start continuous mode</Link></p>
      </div>

      {rows.length === 0 ? <p className="muted">No puzzles generated yet. Analyze a game to create some.</p> : null}

      {rows.length > 0 ? (
        <>
          <div className="puzzle-toolbar">
            <div className="puzzle-tab-row" role="tablist" aria-label="Puzzle banks">
              {([
                { id: "blunder", count: blunderCount },
                { id: "mistake", count: mistakeCount }
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`puzzle-tab ${activeTab === tab.id ? "active" : ""}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span>{tabLabel(tab.id)}</span>
                  <span className="puzzle-tab-count">{tab.count}</span>
                </button>
              ))}
            </div>

            <label className="puzzle-filter">
              <span className="muted">Ownership</span>
              <select
                className="puzzle-select"
                value={ownershipFilter}
                onChange={(event) => setOwnershipFilter(readOwnershipFilter(event.target.value))}
              >
                {OWNERSHIP_FILTERS.map((value) => (
                  <option key={value} value={value}>
                    {ownershipLabel(value, activeTab)}
                  </option>
                ))}
              </select>
            </label>

            <label className="puzzle-filter">
              <span className="muted">Difficulty</span>
              <select
                className="puzzle-select"
                value={difficultyFilter}
                onChange={(event) => setDifficultyFilter(readDifficultyFilter(event.target.value))}
              >
                {DIFFICULTY_FILTERS.map((value) => (
                  <option key={value} value={value}>
                    {value === "all" ? "All" : value}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {filteredRows.length === 0 ? <p className="muted">No {ownershipLabel(ownershipFilter, activeTab).toLowerCase()} match the selected filters.</p> : null}

          <ul className="list card-list">
            {filteredRows.map((puzzle) => (
              <li key={puzzle.id}>
                <button
                  type="button"
                  className="library-card-button puzzle-card-button"
                  onClick={() => {
                    void navigate({ to: "/puzzles/$puzzleId", params: { puzzleId: puzzle.id } });
                  }}
                >
                  <div className="puzzle-card-head">
                    <strong>{puzzle.classification.toUpperCase()}</strong>
                    <span className="puzzle-difficulty-pill">Difficulty {puzzle.difficulty}/5</span>
                  </div>
                  {puzzle.themes.length > 0 ? (
                    <div className="library-card-meta">
                      <span>{puzzle.themes.join(", ")}</span>
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
