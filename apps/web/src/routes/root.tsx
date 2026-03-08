import { Link, Outlet } from "@tanstack/react-router";
import { useMockSession } from "../lib/mockData";

export function RootLayout() {
  const session = useMockSession();

  return (
    <div className="app-shell">
      <header className="shell-header">
        <div>
          <h1>Chess Trainer</h1>
          <p className="muted">Import, analyze, and turn blunders into puzzles.</p>
        </div>
        <div className="session-box">
          <span className="muted">Mock mode</span>
          <span className="muted">{session.user.name}</span>
        </div>
      </header>

      <nav className="top-nav" aria-label="Main navigation">
        <Link to="/" activeOptions={{ exact: true }}>Import</Link>
        <Link to="/library" activeOptions={{ exact: true }}>Library</Link>
        <Link to="/puzzles" activeOptions={{ exact: true }}>Puzzles</Link>
      </nav>

      <main>
        <Outlet />
      </main>
    </div>
  );
}
