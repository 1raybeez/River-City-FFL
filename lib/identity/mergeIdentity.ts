const IDENTITY_PLACEHOLDERS = new Set(["UNKNOWN", "UNK"]);

export function isIdentityPlaceholder(value: unknown): boolean {
  return typeof value !== "string" || value.trim() === "" || IDENTITY_PLACEHOLDERS.has(value.trim().toUpperCase());
}

export function mergeIdentityValue<T>(current: T | null | undefined, incoming: T | null | undefined): T | null {
  const currentIsPlaceholder = isIdentityPlaceholder(current);
  const incomingIsPlaceholder = isIdentityPlaceholder(incoming);
  if (currentIsPlaceholder && !incomingIsPlaceholder) return incoming as T;
  if (!currentIsPlaceholder) return current as T;
  return incomingIsPlaceholder ? (current ?? incoming ?? null) as T | null : incoming as T;
}
