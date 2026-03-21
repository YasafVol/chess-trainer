// @ts-nocheck
import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";
import {
  buildPuzzleStats,
  candidatePuzzlePairs,
  classifyEvalSwing,
  createInitialSchedule,
  derivePuzzleOwnership,
  inferThemes,
  initialPuzzleDifficulty,
  nextReviewOrder,
  nextScheduleFromQuality,
  normalizePuzzleRecord
} from "../src/domain/puzzles";
import { requireUserId } from "./helpers";

function toPuzzleRecord(userId, puzzle) {
  return normalizePuzzleRecord({
    id: puzzle.clientId,
    userId: String(userId),
    gameId: puzzle.gameId,
    source: puzzle.source,
    classification: puzzle.classification,
    ownership: puzzle.ownership,
    fen: puzzle.fen,
    sideToMove: puzzle.sideToMove,
    evalSwing: puzzle.evalSwing,
    expectedBestMove: puzzle.expectedBestMove,
    expectedLine: puzzle.expectedLine,
    solutionMoves: puzzle.solutionMoves,
    playedBadMove: puzzle.playedBadMove,
    themes: puzzle.themes,
    difficulty: puzzle.difficulty,
    schedule: puzzle.schedule,
    createdAt: puzzle.createdAt,
    updatedAt: puzzle.updatedAt
  });
}

function toAttemptRecord(userId, attempt) {
  return {
    id: attempt.clientId,
    userId: String(userId),
    puzzleId: attempt.puzzleId,
    result: attempt.result,
    quality: attempt.quality,
    elapsedMs: attempt.elapsedMs,
    hintsUsed: attempt.hintsUsed,
    revealed: attempt.revealed,
    attemptedAt: attempt.attemptedAt
  };
}

export const list = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const puzzles = await ctx.db
      .query("puzzles")
      .withIndex("by_user_updatedAt", (q) => q.eq("userId", userId))
      .collect();

    return nextReviewOrder(puzzles.map((puzzle) => toPuzzleRecord(userId, puzzle)));
  }
});

export const listAttempts = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const attempts = await ctx.db
      .query("puzzleAttempts")
      .withIndex("by_user_attemptedAt", (q) => q.eq("userId", userId))
      .collect();

    return attempts.map((attempt) => toAttemptRecord(userId, attempt));
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
      return {
        puzzle: null,
        attempts: [],
        stats: null
      };
    }

    const attempts = await ctx.db
      .query("puzzleAttempts")
      .withIndex("by_user_puzzle_attemptedAt", (q) => q.eq("userId", userId).eq("puzzleId", args.puzzleId))
      .collect();

    const mappedPuzzle = toPuzzleRecord(userId, puzzle);
    const mappedAttempts = attempts.map((attempt) => toAttemptRecord(userId, attempt));

    return {
      puzzle: mappedPuzzle,
      attempts: mappedAttempts,
      stats: buildPuzzleStats(mappedPuzzle, mappedAttempts)
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
      .withIndex("by_user_run_ply", (q) => q.eq("userId", userId).eq("runId", args.runId))
      .collect();

    const user = await ctx.db.get(userId);
    const username = user?.name ?? user?.email ?? String(userId);
    const candidates = candidatePuzzlePairs(plies.map((ply) => toAttemptlessPly(userId, ply)));
    const now = new Date().toISOString();
    let created = 0;

    for (const candidate of candidates) {
      const classification = classifyEvalSwing(candidate.evalSwing);
      if (!classification || classification === "inaccuracy" || !candidate.before.bestMoveUci || !candidate.before.playedMoveUci) {
        continue;
      }

      const sourceKey = `${game.hash}:${candidate.before.fen}:${candidate.before.bestMoveUci}`;
      const existing = await ctx.db
        .query("puzzles")
        .withIndex("by_user_sourceKey", (q) => q.eq("userId", userId).eq("sourceKey", sourceKey))
        .unique();

      if (existing) {
        continue;
      }

      const expectedLine = candidate.before.pvUci.length > 0 ? candidate.before.pvUci : [candidate.before.bestMoveUci];
      const schedule = createInitialSchedule(now);
      const sideToMove = candidate.before.fen.split(" ")[1] === "b" ? "b" : "w";

      await ctx.db.insert("puzzles", {
        clientId: crypto.randomUUID(),
        userId,
        gameId: args.gameId,
        sourceKey,
        classification,
        ownership: derivePuzzleOwnership({
          whiteName: game.headers.White,
          blackName: game.headers.Black,
          username,
          badMoveSide: sideToMove
        }),
        source: {
          runId: args.runId,
          ply: candidate.before.ply,
          sourceGameHash: game.hash
        },
        fen: candidate.before.fen,
        sideToMove,
        evalSwing: candidate.evalSwing,
        expectedBestMove: candidate.before.bestMoveUci,
        expectedLine,
        solutionMoves: expectedLine,
        playedBadMove: candidate.before.playedMoveUci,
        themes: inferThemes(expectedLine, candidate.before.playedMoveUci),
        difficulty: initialPuzzleDifficulty({
          evalSwing: candidate.evalSwing,
          bestLine: expectedLine,
          evaluationType: candidate.before.evaluationType
        }),
        schedule,
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

    const nextSchedule = nextScheduleFromQuality(puzzle.schedule, args.quality, args.attemptedAt);

    await ctx.db.patch(puzzle._id, {
      schedule: nextSchedule,
      updatedAt: args.attemptedAt
    });

    return { dueAt: nextSchedule.dueAt };
  }
});

function toAttemptlessPly(userId, ply) {
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
