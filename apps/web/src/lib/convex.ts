import { ConvexReactClient } from "convex/react";
import { makeFunctionReference } from "convex/server";

const convexUrl = import.meta.env.VITE_CONVEX_URL;

if (!convexUrl) {
  throw new Error("Missing VITE_CONVEX_URL");
}

export const convex = new ConvexReactClient(convexUrl);

export const convexApi = {
  auth: {
    signIn: makeFunctionReference<"action">("auth:signIn"),
    signOut: makeFunctionReference<"action">("auth:signOut")
  },
  users: {
    current: makeFunctionReference<"query">("users:current")
  },
  games: {
    list: makeFunctionReference<"query">("games:list"),
    get: makeFunctionReference<"query">("games:get"),
    importBatch: makeFunctionReference<"mutation">("games:importBatch")
  },
  analysis: {
    snapshot: makeFunctionReference<"query">("analysis:snapshot"),
    saveRun: makeFunctionReference<"mutation">("analysis:saveRun"),
    savePlies: makeFunctionReference<"mutation">("analysis:savePlies")
  },
  puzzles: {
    list: makeFunctionReference<"query">("puzzles:list"),
    get: makeFunctionReference<"query">("puzzles:get"),
    generateForRun: makeFunctionReference<"mutation">("puzzles:generateForRun"),
    recordAttempt: makeFunctionReference<"mutation">("puzzles:recordAttempt")
  }
} as const;
