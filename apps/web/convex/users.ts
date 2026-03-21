// @ts-nocheck
import { queryGeneric } from "convex/server";
import { requireUserId } from "./helpers";

export const current = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }
    return {
      id: String(userId),
      name: user.name,
      email: user.email,
      image: user.image
    };
  }
});
