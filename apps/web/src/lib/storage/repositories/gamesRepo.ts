import type { GameRecord } from "../../../domain/types";
import { withStore } from "../db";

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

export async function saveGame(game: GameRecord): Promise<void> {
  await withStore("games", "readwrite", async (store) => {
    await requestToPromise(store.put(game));
  });
}

export async function getGame(id: string): Promise<GameRecord | null> {
  return withStore("games", "readonly", async (store) => {
    const result = await requestToPromise(store.get(id));
    return (result as GameRecord | undefined) ?? null;
  });
}

export async function listGames(): Promise<GameRecord[]> {
  return withStore("games", "readonly", async (store) => {
    const index = store.index("by_updatedAt");
    const result = await requestToPromise(index.getAll());
    return (result as GameRecord[]).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  });
}

export async function deleteGame(id: string): Promise<void> {
  await withStore("games", "readwrite", async (store) => {
    await requestToPromise(store.delete(id));
  });
}
