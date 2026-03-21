// @ts-nocheck
import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";
import { requireUserId } from "./helpers";

const ANALYSIS_COORDINATOR_CONFIG_KEY = "analysisCoordinatorConfig";
const PUZZLE_PLAYBACK_CONFIG_KEY = "puzzlePlaybackConfig";

const analysisCoordinatorConfigValidator = v.object({
  enabled: v.boolean(),
  intervalMs: v.number()
});

const puzzlePlaybackConfigValidator = v.object({
  stepMs: v.number()
});

async function upsertAppMeta(ctx, userId, key, value) {
  const existing = await ctx.db
    .query("appMeta")
    .withIndex("by_user_key", (q) => q.eq("userId", userId).eq("key", key))
    .unique();

  const payload = {
    userId,
    key,
    value,
    updatedAt: new Date().toISOString()
  };

  if (existing) {
    await ctx.db.patch(existing._id, payload);
  } else {
    await ctx.db.insert("appMeta", payload);
  }

  return value;
}

export const getAnalysisCoordinatorConfig = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const record = await ctx.db
      .query("appMeta")
      .withIndex("by_user_key", (q) => q.eq("userId", userId).eq("key", ANALYSIS_COORDINATOR_CONFIG_KEY))
      .unique();

    return record?.value ?? {
      enabled: true,
      intervalMs: 30_000
    };
  }
});

export const saveAnalysisCoordinatorConfig = mutationGeneric({
  args: {
    config: analysisCoordinatorConfigValidator
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    return upsertAppMeta(ctx, userId, ANALYSIS_COORDINATOR_CONFIG_KEY, args.config);
  }
});

export const getPuzzlePlaybackConfig = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const record = await ctx.db
      .query("appMeta")
      .withIndex("by_user_key", (q) => q.eq("userId", userId).eq("key", PUZZLE_PLAYBACK_CONFIG_KEY))
      .unique();

    return record?.value ?? {
      stepMs: 450
    };
  }
});

export const savePuzzlePlaybackConfig = mutationGeneric({
  args: {
    config: puzzlePlaybackConfigValidator
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    return upsertAppMeta(ctx, userId, PUZZLE_PLAYBACK_CONFIG_KEY, args.config);
  }
});
