// @ts-nocheck
import { getAuthUserId } from "@convex-dev/auth/server";

export async function requireUserId(ctx: { auth: { getUserIdentity: () => Promise<unknown> } }) {
  const userId = await getAuthUserId(ctx as never);
  if (!userId) {
    throw new Error("Authentication required");
  }
  return userId;
}

