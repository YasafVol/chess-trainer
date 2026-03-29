// @ts-nocheck
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  games: defineTable({
    clientId: v.string(),
    userId: v.id("users"),
    schemaVersion: v.number(),
    hash: v.string(),
    pgn: v.string(),
    headers: v.record(v.string(), v.string()),
    initialFen: v.string(),
    movesUci: v.array(v.string()),
    source: v.union(v.literal("paste"), v.literal("upload"), v.literal("chesscom")),
    createdAt: v.string(),
    updatedAt: v.string()
  })
    .index("by_user_updatedAt", ["userId", "updatedAt"])
    .index("by_user_hash", ["userId", "hash"])
    .index("by_user_clientId", ["userId", "clientId"]),
  analysisRuns: defineTable({
    clientId: v.string(),
    userId: v.id("users"),
    gameId: v.string(),
    schemaVersion: v.number(),
    engineName: v.string(),
    engineVersion: v.string(),
    engineFlavor: v.string(),
    options: v.object({
      depth: v.number(),
      multiPV: v.number(),
      movetimeMs: v.optional(v.number()),
      foregroundBudgetMs: v.optional(v.number()),
      threads: v.optional(v.number()),
      hashMb: v.optional(v.number())
    }),
    status: v.union(v.literal("queued"), v.literal("running"), v.literal("completed"), v.literal("failed"), v.literal("cancelled")),
    progressDone: v.optional(v.number()),
    progressTotal: v.optional(v.number()),
    createdAt: v.string(),
    completedAt: v.optional(v.string()),
    error: v.optional(v.string())
  })
    .index("by_user_game_createdAt", ["userId", "gameId", "createdAt"])
    .index("by_user_clientId", ["userId", "clientId"]),
  analysisByPly: defineTable({
    clientId: v.string(),
    userId: v.id("users"),
    runId: v.string(),
    gameId: v.string(),
    ply: v.number(),
    fen: v.string(),
    playedMoveUci: v.optional(v.string()),
    playedMoveEvaluationType: v.optional(v.union(v.literal("cp"), v.literal("mate"))),
    playedMoveEvaluation: v.optional(v.number()),
    playedMoveDepth: v.optional(v.number()),
    playedMovePvUci: v.optional(v.array(v.string())),
    bestMoveUci: v.optional(v.string()),
    evaluationType: v.union(v.literal("cp"), v.literal("mate")),
    evaluation: v.number(),
    depth: v.number(),
    nodes: v.optional(v.number()),
    nps: v.optional(v.number()),
    timeMs: v.optional(v.number()),
    pvUci: v.array(v.string())
  })
    .index("by_user_run_ply", ["userId", "runId", "ply"])
    .index("by_user_game_ply", ["userId", "gameId", "ply"])
    .index("by_user_clientId", ["userId", "clientId"]),
  puzzles: defineTable({
    clientId: v.string(),
    userId: v.id("users"),
    gameId: v.string(),
    sourceKey: v.string(),
    classification: v.union(v.literal("inaccuracy"), v.literal("mistake"), v.literal("blunder")),
    ownership: v.union(v.literal("mine"), v.literal("other")),
    source: v.object({
      runId: v.string(),
      ply: v.number(),
      sourceGameHash: v.string()
    }),
    fen: v.string(),
    sideToMove: v.union(v.literal("w"), v.literal("b")),
    evalSwing: v.number(),
    expectedBestMove: v.string(),
    expectedLine: v.array(v.string()),
    solutionMoves: v.array(v.string()),
    playedBadMove: v.optional(v.string()),
    themes: v.array(v.string()),
    difficulty: v.number(),
    schedule: v.object({
      repetition: v.number(),
      intervalDays: v.number(),
      easeFactor: v.number(),
      dueAt: v.string(),
      lastReviewedAt: v.optional(v.string()),
      consecutiveFailures: v.number()
    }),
    createdAt: v.string(),
    updatedAt: v.string()
  })
    .index("by_user_updatedAt", ["userId", "updatedAt"])
    .index("by_user_sourceKey", ["userId", "sourceKey"])
    .index("by_user_clientId", ["userId", "clientId"]),
  puzzleAttempts: defineTable({
    clientId: v.string(),
    userId: v.id("users"),
    puzzleId: v.string(),
    result: v.union(v.literal("success"), v.literal("fail")),
    quality: v.number(),
    elapsedMs: v.number(),
    hintsUsed: v.number(),
    revealed: v.boolean(),
    attemptedAt: v.string()
  })
    .index("by_user_puzzle_attemptedAt", ["userId", "puzzleId", "attemptedAt"])
    .index("by_user_attemptedAt", ["userId", "attemptedAt"]),
  appMeta: defineTable({
    userId: v.id("users"),
    key: v.union(
      v.literal("analysisCoordinatorConfig"),
      v.literal("puzzlePlaybackConfig"),
      v.literal("chessComSyncConfig")
    ),
    value: v.union(
      v.object({
        enabled: v.boolean(),
        intervalMs: v.number()
      }),
      v.object({
        stepMs: v.number()
      }),
      v.object({
        username: v.string(),
        enabled: v.boolean(),
        interval: v.union(v.literal("daily"), v.literal("weekly")),
        lastSyncAt: v.optional(v.string()),
        lastSuccessfulArchive: v.optional(v.string()),
        lastStatus: v.optional(v.string())
      })
    ),
    updatedAt: v.string()
  }).index("by_user_key", ["userId", "key"])
});
