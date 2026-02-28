async function subtleSha1(text: string): Promise<string | null> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    return null;
  }
  try {
    const data = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-1", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}

function fallbackHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0").repeat(5).slice(0, 40);
}

export async function sha1(text: string): Promise<string> {
  const cryptographic = await subtleSha1(text);
  if (cryptographic) return cryptographic;
  return fallbackHash(text);
}

export async function shortHash(text: string): Promise<string> {
  const full = await sha1(text);
  return full.slice(0, 8);
}
