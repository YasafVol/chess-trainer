import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { RootLayout } from "./routes/root";
import { ImportPage } from "./routes/import";
import { LibraryPage } from "./routes/library";
import { GamePage } from "./routes/game";
import { PuzzlesPage } from "./routes/puzzles";
import { PuzzlePage } from "./routes/puzzle";
import { BackofficePage } from "./routes/backoffice";
import { AnalysisBenchmarkPage } from "./routes/analysisBenchmark";

const rootRoute = createRootRoute({
  component: RootLayout
});

const importRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: ImportPage
});

const libraryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/library",
  component: LibraryPage
});

const gameRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/game/$gameId",
  component: GamePage
});

const puzzlesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/puzzles",
  component: PuzzlesPage
});

const puzzleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/puzzles/$puzzleId",
  component: PuzzlePage
});

const backofficeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/backoffice",
  component: BackofficePage
});

const analysisBenchmarkRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/backoffice/analysis-benchmark",
  component: AnalysisBenchmarkPage
});

const routeTree = rootRoute.addChildren([
  importRoute,
  libraryRoute,
  gameRoute,
  puzzlesRoute,
  puzzleRoute,
  backofficeRoute,
  analysisBenchmarkRoute
]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent"
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
