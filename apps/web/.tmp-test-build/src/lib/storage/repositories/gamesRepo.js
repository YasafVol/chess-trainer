import { withStore } from "../db";
function requestToPromise(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
    });
}
export async function saveGame(game) {
    await withStore("games", "readwrite", async (store) => {
        await requestToPromise(store.put(game));
    });
}
export async function getGame(id) {
    return withStore("games", "readonly", async (store) => {
        const result = await requestToPromise(store.get(id));
        return result ?? null;
    });
}
export async function listGames() {
    return withStore("games", "readonly", async (store) => {
        const index = store.index("by_updatedAt");
        const result = await requestToPromise(index.getAll());
        return result.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    });
}
export async function deleteGame(id) {
    await withStore("games", "readwrite", async (store) => {
        await requestToPromise(store.delete(id));
    });
}
