export type AuthGateFeature = {
  title: string;
  description: string;
};

export type AuthGateViewModel = {
  eyebrow: string;
  title: string;
  summary: string;
  routeLabel: string;
  routeHint: string;
  featureHeading: string;
  features: AuthGateFeature[];
};

const sharedFeatures: AuthGateFeature[] = [
  {
    title: "Remote game library",
    description: "Keep imports, analysis runs, and puzzle output attached to your account instead of a single browser session."
  },
  {
    title: "Browser-side engine work",
    description: "Run Stockfish in the browser worker pipeline while Convex keeps the latest saved state available across routes."
  },
  {
    title: "Read-only offline review",
    description: "Return later to inspect cached games and puzzle history even when the app falls back to offline view-only mode."
  }
];

type RouteCopy = {
  routeLabel: string;
  title: string;
  summary: string;
  routeHint: string;
};

function resolveRouteCopy(pathname: string): RouteCopy {
  if (pathname === "/") {
    return {
      routeLabel: "Import",
      title: "Sign in to import and persist fresh games.",
      summary: "Paste PGN, upload files, or bring in bounded Chess.com archives before pushing those games into your shared remote library.",
      routeHint: "After Google sign-in you will return to the import workspace."
    };
  }

  if (pathname === "/library") {
    return {
      routeLabel: "Library",
      title: "Sign in to reopen your saved training library.",
      summary: "Browse prior imports, reopen analyzed games, and continue from the same Convex-backed record instead of a local one-off session.",
      routeHint: "After Google sign-in you will return to the library route."
    };
  }

  if (pathname.startsWith("/puzzles")) {
    return {
      routeLabel: "Puzzles",
      title: "Sign in to review mistakes as puzzles.",
      summary: "Open due puzzle banks, resume continuous review, and keep solve history tied to the same authenticated account.",
      routeHint: "After Google sign-in you will return to the puzzle workflow."
    };
  }

  if (pathname.startsWith("/backoffice")) {
    return {
      routeLabel: "Backoffice",
      title: "Sign in to inspect runtime controls and import settings.",
      summary: "Review saved Chess.com sync settings, lazy-analysis controls, and FITL diagnostics from the authenticated application shell.",
      routeHint: "After Google sign-in you will return to backoffice."
    };
  }

  if (pathname.startsWith("/game/")) {
    return {
      routeLabel: "Game Workbench",
      title: "Sign in to continue from the analysis workbench.",
      summary: "Replay the stored line, branch moves, reopen saved engine output, and generate follow-on puzzles from the same game route.",
      routeHint: "After Google sign-in you will return to this game workbench."
    };
  }

  return {
    routeLabel: "Workspace",
    title: "Sign in to enter the authenticated training workspace.",
    summary: "The active product keeps persistence, analysis history, and puzzle progress behind the authenticated Convex runtime path.",
    routeHint: "After Google sign-in you will return to this route."
  };
}

export function buildAuthGateViewModel(pathname: string): AuthGateViewModel {
  const routeCopy = resolveRouteCopy(pathname);

  return {
    eyebrow: "Authenticated runtime",
    title: routeCopy.title,
    summary: routeCopy.summary,
    routeLabel: routeCopy.routeLabel,
    routeHint: routeCopy.routeHint,
    featureHeading: "What unlocks after sign-in",
    features: sharedFeatures
  };
}
