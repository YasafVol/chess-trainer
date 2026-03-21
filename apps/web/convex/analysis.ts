// @ts-nocheck
import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";
import { requireUserId } from "./helpers";

const runInput = v.object({
  id: v.string(),
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
});

const plyInput = v.object({
  id: v.string(),
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
});

function toRunRecord(userId, run) {
  return {
    id: run.clientId,
    userId: String(userId),
    gameId: run.gameId,
    schemaVersion: run.schemaVersion,
    engineName: run.engineName,
    engineVersion: run.engineVersion,
    engineFlavor: run.engineFlavor,
    options: run.options,
    status: run.status,
    progressDone: run.progressDone,
    progressTotal: run.progressTotal,
    createdAt: run.createdAt,
    completedAt: run.completedAt,
    error: run.error
  };
}

function toPlyRecord(userId, ply) {
  return {
    id: ply.clientId,
    userId: String(userId),
    runId: ply.runId,
    gameId: ply.gameId,
    ply: ply.ply,
    fen: ply.fen,
    playedMoveUci: ply.playedMoveUci,
    playedMoveEvaluationType: ply.playedMoveEvaluationType,
    playedMoveEvaluation: ply.playedMoveEvaluation,
    playedMoveDepth: ply.playedMoveDepth,
    playedMovePvUci: ply.playedMovePvUci,
    bestMoveUci: ply.bestMoveUci,
    evaluationType: ply.evaluationType,
    evaluation: ply.evaluation,
    depth: ply.depth,
    nodes: ply.nodes,
    nps: ply.nps,
    timeMs: ply.timeMs,
    pvUci: ply.pvUci
  };
}

export const snapshot = queryGeneric({
  args: { gameId: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const latestRun = await ctx.db
      .query("analysisRuns")
      .withIndex("by_user_game_createdAt", (q) => q.eq("userId", userId).eq("gameId", args.gameId))
      .order("desc")
      .first();

    if (!latestRun) {
      return { run: null, plies: [] };
    }

    const plies = await ctx.db
      .query("analysisByPly")
      .withIndex("by_user_run_ply", (q) => q.eq("userId", userId).eq("runId", latestRun.clientId))
      .collect();

    return {
      run: toRunRecord(userId, latestRun),
      plies: plies.map((ply) => toPlyRecord(userId, ply))
    };
  }
});

export const hasCompletedForGame = queryGeneric({
  args: { gameId: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const runs = await ctx.db
      .query("analysisRuns")
      .withIndex("by_user_game_createdAt", (q) => q.eq("userId", userId).eq("gameId", args.gameId))
      .collect();

    return runs.some((run) => run.status === "completed");
  }
});

export const saveRun = mutationGeneric({
  args: { run: runInput },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query("analysisRuns")
      .withIndex("by_user_clientId", (q) => q.eq("userId", userId).eq("clientId", args.run.id))
      .unique();

    const payload = {
      clientId: args.run.id,
      userId,
      gameId: args.run.gameId,
      schemaVersion: args.run.schemaVersion,
      engineName: args.run.engineName,
      engineVersion: args.run.engineVersion,
      engineFlavor: args.run.engineFlavor,
      options: args.run.options,
      status: args.run.status,
      progressDone: args.run.progressDone,
      progressTotal: args.run.progressTotal,
      createdAt: args.run.createdAt,
      completedAt: args.run.completedAt,
      error: args.run.error
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
    } else {
      await ctx.db.insert("analysisRuns", payload);
    }

    return args.run.id;
  }
});

export const savePlies = mutationGeneric({
  args: { plies: v.array(plyInput) },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    for (const ply of args.plies) {
      const existing = await ctx.db
        .query("analysisByPly")
        .withIndex("by_user_clientId", (q) => q.eq("userId", userId).eq("clientId", ply.id))
        .unique();

      const payload = {
        clientId: ply.id,
        userId,
        runId: ply.runId,
        gameId: ply.gameId,
        ply: ply.ply,
        fen: ply.fen,
        playedMoveUci: ply.playedMoveUci,
        playedMoveEvaluationType: ply.playedMoveEvaluationType,
        playedMoveEvaluation: ply.playedMoveEvaluation,
        playedMoveDepth: ply.playedMoveDepth,
        playedMovePvUci: ply.playedMovePvUci,
        bestMoveUci: ply.bestMoveUci,
        evaluationType: ply.evaluationType,
        evaluation: ply.evaluation,
        depth: ply.depth,
        nodes: ply.nodes,
        nps: ply.nps,
        timeMs: ply.timeMs,
        pvUci: ply.pvUci
      };

      if (existing) {
        await ctx.db.patch(existing._id, payload);
      } else {
        await ctx.db.insert("analysisByPly", payload);
      }
    }

    return args.plies.length;
  }
});
