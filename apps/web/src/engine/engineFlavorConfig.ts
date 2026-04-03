export const PREPARED_ENGINE_FLAVORS = [
  "stockfish-18-lite-single",
  "stockfish-18-single",
  "stockfish-18"
] as const;

export type EngineFlavor = (typeof PREPARED_ENGINE_FLAVORS)[number];

export const BUNDLED_ENGINE_FLAVORS = ["stockfish-18-lite-single"] as const;

export type BundledEngineFlavor = (typeof BUNDLED_ENGINE_FLAVORS)[number];

export const SHIPPED_ENGINE_FLAVOR: BundledEngineFlavor = "stockfish-18-lite-single";

export function isBundledEngineFlavor(flavor: EngineFlavor): flavor is BundledEngineFlavor {
  return (BUNDLED_ENGINE_FLAVORS as readonly string[]).includes(flavor);
}

export function listPreparedAlternativeEngineFlavors(): EngineFlavor[] {
  return PREPARED_ENGINE_FLAVORS.filter((flavor) => !isBundledEngineFlavor(flavor));
}

export function describeBundledEngineFlavors(): string {
  return BUNDLED_ENGINE_FLAVORS.join(", ");
}
