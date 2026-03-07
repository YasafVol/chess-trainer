// Deferred backend descriptor for the local-first web runtime.
// Keep this file import-safe for the active app until Convex/auth is reintroduced.
type DeferredConvexFunctionType = "action" | "mutation" | "query";

type DeferredConvexReference<T extends DeferredConvexFunctionType> = {
  deferred: true;
  functionType: T;
  name: string;
};

function deferredFunctionReference<T extends DeferredConvexFunctionType>(
  functionType: T,
  name: string
): DeferredConvexReference<T> {
  return {
    deferred: true,
    functionType,
    name
  };
}

export const convex = null;

export function requireConvexRuntime(): never {
  throw new Error(
    "Convex is deferred in the current local-first web runtime. Enable the Convex client before using this module."
  );
}

export const convexApi = {
  auth: {
    signIn: deferredFunctionReference("action", "auth:signIn"),
    signOut: deferredFunctionReference("action", "auth:signOut")
  },
  users: {
    current: deferredFunctionReference("query", "users:current")
  },
  games: {
    list: deferredFunctionReference("query", "games:list"),
    get: deferredFunctionReference("query", "games:get"),
    importBatch: deferredFunctionReference("mutation", "games:importBatch")
  },
  analysis: {
    snapshot: deferredFunctionReference("query", "analysis:snapshot"),
    saveRun: deferredFunctionReference("mutation", "analysis:saveRun"),
    savePlies: deferredFunctionReference("mutation", "analysis:savePlies")
  },
  puzzles: {
    list: deferredFunctionReference("query", "puzzles:list"),
    get: deferredFunctionReference("query", "puzzles:get"),
    generateForRun: deferredFunctionReference("mutation", "puzzles:generateForRun"),
    recordAttempt: deferredFunctionReference("mutation", "puzzles:recordAttempt")
  }
} as const;
