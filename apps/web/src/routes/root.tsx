import { useEffect, useState } from "react";
import { Link, Outlet } from "@tanstack/react-router";
import { LogOut, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sharedAnalysisCoordinator } from "../application/analysisCoordinator";
import { sharedChessComSyncCoordinator } from "../application/chessComSyncCoordinator";
import { useRuntimeSession } from "../lib/runtimeGateway";
import { useAuthActions } from "@convex-dev/auth/react";
import { cn } from "@/lib/utils";

export function RootLayout() {
  const session = useRuntimeSession();

  useEffect(() => {
    sharedAnalysisCoordinator.ensureStarted();
    sharedChessComSyncCoordinator.ensureStarted();
  }, []);

  if (!session.isConfigured) {
    return (
      <Shell>
        <ShellHeader />
        <main>
          <PageCard>
            <p>Convex is not configured. Set `VITE_CONVEX_URL` before running the web app.</p>
          </PageCard>
        </main>
      </Shell>
    );
  }

  if (session.isLoading) {
    return (
      <Shell>
        <ShellHeader />
        <main>
          <PageCard>
            <p className="text-muted-foreground">Loading your session...</p>
          </PageCard>
        </main>
      </Shell>
    );
  }

  if (!session.isAuthenticated || !session.user) {
    return <SignedOutLayout />;
  }

  return <SignedInLayout />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-[1180px] px-6 py-6">
      {children}
    </div>
  );
}

function ShellHeader() {
  return (
    <header className="mb-5 flex items-start justify-between gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Chess Trainer</h1>
        <p className="text-sm text-muted-foreground">Import, analyze, and turn blunders into puzzles.</p>
      </div>
    </header>
  );
}

function PageCard({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      {children}
    </section>
  );
}

function SignedOutLayout() {
  const { signIn } = useAuthActions();
  const [signInError, setSignInError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  async function startGoogleSignIn() {
    setSigningIn(true);
    setSignInError(null);
    try {
      await signIn("google", {
        redirectTo: window.location.pathname
      });
    } catch (error) {
      setSignInError(error instanceof Error ? error.message : "Google sign-in failed.");
      setSigningIn(false);
    }
  }

  return (
    <Shell>
      <ShellHeader />
      <main>
        <PageCard>
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Sign in required</h2>
              <p className="text-sm text-muted-foreground">Remote persistence is active. Sign in with Google to access your library, analysis, and puzzles.</p>
            </div>
            <Button onClick={() => void startGoogleSignIn()} disabled={signingIn}>
              {signingIn ? "Connecting..." : "Continue with Google"}
            </Button>
            {signInError ? <p className="text-sm text-destructive">{signInError}</p> : null}
          </div>
        </PageCard>
      </main>
    </Shell>
  );
}

function SignedInLayout() {
  const session = useRuntimeSession();
  const { signOut } = useAuthActions();
  const user = session.user;
  const isOnline = session.browserOnline && session.backendConnected;

  async function handleSignOut() {
    await signOut();
  }

  return (
    <Shell>
      <header className="mb-5 flex items-start justify-between gap-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chess Trainer</h1>
          <p className="text-sm text-muted-foreground">Import, analyze, and turn blunders into puzzles.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {isOnline ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
            {isOnline ? "Online" : "Offline"}
          </span>
          <span className="text-xs text-muted-foreground">{user?.name ?? user?.email ?? user?.id ?? "Unknown user"}</span>
          <Button variant="ghost" size="sm" onClick={() => void handleSignOut()}>
            <LogOut className="size-3.5" />
            Sign out
          </Button>
        </div>
      </header>

      <nav className="mb-5 flex flex-wrap gap-1" aria-label="Main navigation">
        {[
          { to: "/" as const, label: "Import", exact: true },
          { to: "/library" as const, label: "Library", exact: true },
          { to: "/puzzles" as const, label: "Puzzles", exact: true },
          { to: "/backoffice" as const, label: "Backoffice", exact: true },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: item.exact }}
            className={cn(
              "relative rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
              "[&[data-status=active]]:bg-secondary [&[data-status=active]]:text-foreground [&[data-status=active]]:font-semibold"
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <main>
        <Outlet />
      </main>
    </Shell>
  );
}
