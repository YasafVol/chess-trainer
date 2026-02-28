import { Link, Outlet } from "@tanstack/react-router";

export function RootLayout() {
  return (
    <div className="app-shell">
      <header>
        <h1>Chess Trainer Web</h1>
        <nav className="top-nav" aria-label="Main navigation">
          <Link to="/">Import</Link>
          <Link to="/library">Library</Link>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
