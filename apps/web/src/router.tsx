import {
  createRootRoute,
  createRoute,
  createRouter
} from "@tanstack/react-router";
import { RootLayout } from "./routes/root";
import { ImportPage } from "./routes/import";
import { LibraryPage } from "./routes/library";
import { GamePage } from "./routes/game";

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

const routeTree = rootRoute.addChildren([importRoute, libraryRoute, gameRoute]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent"
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
