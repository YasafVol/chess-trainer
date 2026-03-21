import type { ChessComSyncConfig, ChessComSyncInterval } from "./types.js";

export const CHESS_COM_SYNC_CONFIG_DEFAULTS: ChessComSyncConfig = {
  username: "",
  enabled: false,
  interval: "daily"
};

export function normalizeChessComUsername(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeInterval(value: ChessComSyncInterval | null | undefined): ChessComSyncInterval {
  return value === "weekly" ? "weekly" : CHESS_COM_SYNC_CONFIG_DEFAULTS.interval;
}

export function normalizeChessComSyncConfig(
  input: Partial<ChessComSyncConfig> | null | undefined
): ChessComSyncConfig {
  const username = normalizeChessComUsername(input?.username);
  return {
    username,
    enabled: typeof input?.enabled === "boolean" ? input.enabled : CHESS_COM_SYNC_CONFIG_DEFAULTS.enabled,
    interval: normalizeInterval(input?.interval),
    lastSyncAt: typeof input?.lastSyncAt === "string" && input.lastSyncAt.trim().length > 0 ? input.lastSyncAt : undefined,
    lastSuccessfulArchive: typeof input?.lastSuccessfulArchive === "string" && input.lastSuccessfulArchive.trim().length > 0
      ? input.lastSuccessfulArchive
      : undefined,
    lastStatus: typeof input?.lastStatus === "string" && input.lastStatus.trim().length > 0 ? input.lastStatus.trim() : undefined
  };
}

export function validateChessComSyncConfig(config: ChessComSyncConfig): string | null {
  if (config.enabled && !config.username) {
    return "Chess.com username is required to enable sync.";
  }
  return null;
}

export function isChessComSyncDue(
  config: Pick<ChessComSyncConfig, "enabled" | "username" | "interval" | "lastSyncAt">,
  now: Date = new Date()
): boolean {
  if (!config.enabled || !config.username) {
    return false;
  }

  if (!config.lastSyncAt) {
    return true;
  }

  const lastSyncAtMs = Date.parse(config.lastSyncAt);
  if (Number.isNaN(lastSyncAtMs)) {
    return true;
  }

  const intervalMs = config.interval === "weekly"
    ? 7 * 24 * 60 * 60 * 1000
    : 24 * 60 * 60 * 1000;

  return now.getTime() - lastSyncAtMs >= intervalMs;
}
