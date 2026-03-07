import type { Puzzle, PuzzleAttempt } from "../../../domain/types";
import { withStore } from "../db";

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

export async function savePuzzle(puzzle: Puzzle): Promise<void> {
  await withStore("puzzles", "readwrite", async (store) => {
    await requestToPromise(store.put(puzzle));
  });
}

export async function getPuzzle(id: string): Promise<Puzzle | null> {
  return withStore("puzzles", "readonly", async (store) => {
    const result = await requestToPromise(store.get(id));
    return (result as Puzzle | undefined) ?? null;
  });
}

export async function listPuzzles(): Promise<Puzzle[]> {
  return withStore("puzzles", "readonly", async (store) => {
    const index = store.index("by_updatedAt");
    const result = await requestToPromise(index.getAll());
    return (result as Puzzle[]).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  });
}

export async function savePuzzleAttempt(attempt: PuzzleAttempt): Promise<void> {
  await withStore("puzzleAttempts", "readwrite", async (store) => {
    await requestToPromise(store.put(attempt));
  });
}

export async function listPuzzleAttemptsByPuzzleId(puzzleId: string): Promise<PuzzleAttempt[]> {
  return withStore("puzzleAttempts", "readonly", async (store) => {
    const index = store.index("by_puzzleId");
    const result = (await requestToPromise(index.getAll(puzzleId))) as PuzzleAttempt[];
    return (result ?? []).sort((a, b) => (a.attemptedAt < b.attemptedAt ? -1 : 1));
  });
}
