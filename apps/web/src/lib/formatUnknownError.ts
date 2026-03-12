function readStringField(value: unknown, key: "message" | "name"): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === "string" && candidate.trim().length > 0 ? candidate.trim() : undefined;
}

export function formatUnknownError(error: unknown, fallback: string = "Unknown error"): string {
  if (typeof ErrorEvent !== "undefined" && error instanceof ErrorEvent) {
    return error.message || error.type || fallback;
  }

  if (error instanceof Error) {
    return error.message || error.name || fallback;
  }

  if (typeof DOMException !== "undefined" && error instanceof DOMException) {
    return error.message || error.name || fallback;
  }

  if (typeof error === "string") {
    return error.trim().length > 0 ? error : fallback;
  }

  const name = readStringField(error, "name");
  const message = readStringField(error, "message");
  if (name && message) {
    return name === "Error" ? message : `${name}: ${message}`;
  }
  if (message) {
    return message;
  }
  if (name) {
    return name;
  }

  try {
    const serialized = JSON.stringify(error);
    return serialized && serialized !== "{}" ? serialized : fallback;
  } catch {
    return fallback;
  }
}
