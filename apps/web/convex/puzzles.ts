// @ts-nocheck
import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";
import {
  buildPuzzleStats,
  candidatePuzzlePairs,
  classifyEvalSwing,
  createInitialSchedule,
  inferThemes,
  initialPuzzleDifficulty,
  nextReviewOrder,
  nextScheduleFromQuality
} from "../src/domain/puzzles";
import { requireUserId } from "./helpers";

export const list = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const puzzles = await ctx.db
      .query("puzzles")
      .withIndex("by_user_dueAt", (q) => q.eq("userId", userId))
      .collect();

    return nextReviewOrder(puzzles as never);
  }
});

export const get = queryGeneric({
  args: { puzzleId: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const puzzle = await ctx.db
      .query("puzzles")
      .withIndex("by_user_clientId", (q) => q.eq("userId", userId).eq("clientId", args.puzzleId))
      .unique();

    if (!puzzle) {
      return null;
    }

    const attempts = await ctx.db
      .query("puzzleAttempts")
      .withIndex("by_user_puzzle_attemptedAt", (q) => q.eq("userId", userId).eq("puzzleId", args.puzzleId))
      .collect();

    return {
      puzzle,
      attempts,
      stats: buildPuzzleStats(puzzle as never, attempts as never)
    };
  }
});

export const generateForRun = mutationGeneric({
  args: { runId: v.string(), gameId: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const game = await ctx.db
      .query("games")
      .withIndex("by_user_clientId", (q) => q.eq("userId", userId).eq("clientId", args.gameId))
      .unique();

    if (!game) {
      throw new Error("Game not found");
    }

    const plies = await ctx.db
      .query("analysisByPly")
      .withIndex("by_run_ply", (q) => q.eq("runId", args.runId))
      .collect();

    const candidates = candidatePuzzlePairs(plies as never);
    const now = new Date().toISOString();
    let created = 0;

    for (const candidate of candidates) {
      const classification = classifyEvalSwing(candidate.evalSwing);
      if (!classification || (classification !== "mistake" && classification !== "blunder")) {
        continue;
      }

      const sourceKey = `${game.hash}:${candidate.before.fen}:${candidate.before.bestMoveUci ?? ""}`;
      const existing = await ctx.db
        .query("puzzles")
        .withIndex("by_user_sourceKey", (q) => q.eq("userId", userId).eq("sourceKey", sourceKey))
        .unique();

      if (existing) {
        continue;
      }

      const schedule = createInitialSchedule(now);
      const themes = inferThemes(candidate.before.pvUci, candidate.before.playedMoveUci);
      const difficulty = initialPuzzleDifficulty({
        evalSwing: candidate.evalSwing,
        bestLine: candidate.before.pvUci,
        evaluationType: candidate.before.evaluationType
      });

      await ctx.db.insert("puzzles", {
        clientId: crypto.randomUUID(),
        userId,
        gameId: args.gameId,
        runId: args.runId,
        sourcePly: candidate.before.ply,
        sourceGameHash: game.hash,
        sourceKey,
        classification,
        fen: candidate.before.fen,
        sideToMove: candidate.before.fen.split(" ")[1] === "b" ? "b" : "w",
        evalSwing: candidate.evalSwing,
        expectedBestMove: candidate.before.bestMoveUci,
        expectedLine: candidate.before.pvUci,
        playedBadMove: candidate.before.playedMoveUci,
        themes,
        difficulty,
        repetition: schedule.repetition,
        intervalDays: schedule.intervalDays,
        easeFactor: schedule.easeFactor,
        dueAt: schedule.dueAt,
        lastReviewedAt: schedule.lastReviewedAt,
        consecutiveFailures: schedule.consecutiveFailures,
        createdAt: now,
        updatedAt: now
      });
      created += 1;
    }

    return { created };
  }
});

export const recordAttempt = mutationGeneric({
  args: {
    puzzleId: v.string(),
    result: v.union(v.literal("success"), v.literal("fail")),
    quality: v.number(),
    elapsedMs: v.number(),
    hintsUsed: v.number(),
    revealed: v.boolean(),
    attemptedAt: v.string()
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const puzzle = await ctx.db
      .query("puzzles")
      .withIndex("by_user_clientId", (q) => q.eq("userId", userId).eq("clientId", args.puzzleId))
      .unique();

    if (!puzzle) {
      throw new Error("Puzzle not found");
    }

    await ctx.db.insert("puzzleAttempts", {
      clientId: crypto.randomUUID(),
      userId,
      puzzleId: args.puzzleId,
      result: args.result,
      quality: args.quality,
      elapsedMs: args.elapsedMs,
      hintsUsed: args.hintsUsed,
      revealed: args.revealed,
      attemptedAt: args.attemptedAt
    });

    const nextSchedule = nextScheduleFromQuality(
      {
        repetition: puzzle.repetition,
        intervalDays: puzzle.intervalDays,
        easeFactor: puzzle.easeFactor,
        dueAt: puzzle.dueAt,
        lastReviewedAt: puzzle.lastReviewedAt,
        consecutiveFailures: puzzle.consecutiveFailures
      },
      args.quality,
      args.attemptedAt
    );

    await ctx.db.patch(puzzle._id, {
      repetition: nextSchedule.repetition,
      intervalDays: nextSchedule.intervalDays,
      easeFactor: nextSchedule.easeFactor,
      dueAt: nextSchedule.dueAt,
      lastReviewedAt: nextSchedule.lastReviewedAt,
      consecutiveFailures: nextSchedule.consecutiveFailures,
      updatedAt: args.attemptedAt
    });

    return { dueAt: nextSchedule.dueAt };
  }
});

