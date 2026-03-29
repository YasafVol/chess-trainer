// @ts-nocheck
import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET
    })
  ],
  callbacks: {
    async redirect({ redirectTo }) {
      const siteUrl = process.env.SITE_URL?.replace(/\/$/, "");
      if (!siteUrl) {
        throw new Error("SITE_URL must be configured for auth redirects.");
      }
      if (redirectTo.startsWith("/")) {
        return `${siteUrl}${redirectTo}`;
      }
      if (redirectTo.startsWith(siteUrl)) {
        return redirectTo;
      }
      return siteUrl;
    }
  }
});
