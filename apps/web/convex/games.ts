// @ts-nocheck
import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";
import { requireUserId } from "./helpers";

const importableGame = v.object({
  id: v.string(),
  schemaVersion: v.number(),
  hash: v.string(),
  pgn: v.string(),
  headers: v.record(v.string(), v.string()),
  initialFen: v.string(),
  movesUci: v.array(v.string()),
  source: v.union(v.literal("paste"), v.literal("upload"), v.literal("chesscom")),
  createdAt: v.string(),
  updatedAt: v.string()
});

function toGameRecord(userId, game) {
  return {
    id: game.clientId,
    userId: String(userId),
    schemaVersion: game.schemaVersion,
    hash: game.hash,
    pgn: game.pgn,
    headers: game.headers,
    initialFen: game.initialFen,
    movesUci: game.movesUci,
    source: game.source,
    createdAt: game.createdAt,
    updatedAt: game.updatedAt
  };
}

export const list = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const games = await ctx.db
      .query("games")
      .withIndex("by_user_updatedAt", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    return games.map((game) => toGameRecord(userId, game));
  }
});

export const get = queryGeneric({
  args: { gameId: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const game = await ctx.db
      .query("games")
      .withIndex("by_user_clientId", (q) => q.eq("userId", userId).eq("clientId", args.gameId))
      .unique();

    return game ? toGameRecord(userId, game) : null;
  }
});

export const importBatch = mutationGeneric({
  args: {
    games: v.array(importableGame)
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    let imported = 0;
    let skippedDuplicates = 0;
    let skippedInvalid = 0;
    const gameIds = [];

    for (const game of args.games) {
      if (!game.pgn || game.movesUci.length === 0) {
        skippedInvalid += 1;
        continue;
      }

      const existing = await ctx.db
        .query("games")
        .withIndex("by_user_hash", (q) => q.eq("userId", userId).eq("hash", game.hash))
        .unique();

      if (existing) {
        skippedDuplicates += 1;
        continue;
      }

      await ctx.db.insert("games", {
        clientId: game.id,
        userId,
        schemaVersion: game.schemaVersion,
        hash: game.hash,
        pgn: game.pgn,
        headers: game.headers,
        initialFen: game.initialFen,
        movesUci: game.movesUci,
        source: game.source,
        createdAt: game.createdAt,
        updatedAt: game.updatedAt
      });

      imported += 1;
      gameIds.push(game.id);
    }

    return {
      imported,
      skippedDuplicates,
      skippedInvalid,
      gameIds
    };
  }
});
