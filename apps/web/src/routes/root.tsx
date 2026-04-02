import { useEffect, useState } from "react";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { sharedAnalysisCoordinator } from "../application/analysisCoordinator";
import { sharedChessComSyncCoordinator } from "../application/chessComSyncCoordinator";
import { useRuntimeSession } from "../lib/runtimeGateway";
import { useAuthActions } from "@convex-dev/auth/react";
import { AuthGateView } from "../presentation/AuthGateView";
import { buildAuthGateViewModel } from "../presentation/authGateModel";

export function RootLayout() {
  const session = useRuntimeSession();

  useEffect(() => {
    sharedAnalysisCoordinator.ensureStarted();
    sharedChessComSyncCoordinator.ensureStarted();
  }, []);

  if (!session.isConfigured) {
    return (
      <div className="app-shell">
        <header className="shell-header">
          <div>
            <h1>Chess Trainer</h1>
            <p className="muted">Import, analyze, and turn blunders into puzzles.</p>
          </div>
        </header>
        <main>
          <section className="page">
            <p>Convex is not configured. Set `VITE_CONVEX_URL` before running the web app.</p>
          </section>
        </main>
      </div>
    );
  }

  if (session.isLoading) {
    return (
      <div className="app-shell">
        <header className="shell-header">
          <div>
            <h1>Chess Trainer</h1>
            <p className="muted">Import, analyze, and turn blunders into puzzles.</p>
          </div>
        </header>
        <main>
          <section className="page">
            <p>Loading your session...</p>
          </section>
        </main>
      </div>
    );
  }

  if (!session.isAuthenticated || !session.user) {
    return <SignedOutLayout />;
  }

  return <SignedInLayout />;
}

function SignedOutLayout() {
  const { signIn } = useAuthActions();
  const pathname = useRouterState({
    select: (state) => state.location.pathname
  });
  const [signInError, setSignInError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const model = buildAuthGateViewModel(pathname);

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
    <div className="app-shell">
      <header className="shell-header">
        <div>
          <h1>Chess Trainer</h1>
          <p className="muted">Import, analyze, and turn blunders into puzzles.</p>
        </div>
      </header>
      <main>
        <AuthGateView
          model={model}
          signingIn={signingIn}
          signInError={signInError}
          onSignIn={startGoogleSignIn}
        />
      </main>
    </div>
  );
}

function SignedInLayout() {
  const session = useRuntimeSession();
  const { signOut } = useAuthActions();
  const user = session.user;

  async function handleSignOut() {
    await signOut();
  }

  return (
    <div className="app-shell">
      <header className="shell-header">
        <div>
          <h1>Chess Trainer</h1>
          <p className="muted">Import, analyze, and turn blunders into puzzles.</p>
        </div>
        <div className="session-box">
          <span className="muted">{session.browserOnline && session.backendConnected ? "Online" : "Offline (view-only)"}</span>
          <span className="muted">{user?.name ?? user?.email ?? user?.id ?? "Unknown user"}</span>
          <button type="button" className="action-button" onClick={() => void handleSignOut()}>
            Sign out
          </button>
        </div>
      </header>

      <nav className="top-nav" aria-label="Main navigation">
        <Link to="/" activeOptions={{ exact: true }}>Import</Link>
        <Link to="/library" activeOptions={{ exact: true }}>Library</Link>
        <Link to="/puzzles" activeOptions={{ exact: true }}>Puzzles</Link>
        <Link to="/backoffice" activeOptions={{ exact: true }}>Backoffice</Link>
      </nav>

      <main>
        <Outlet />
      </main>
    </div>
  );
}
