const DEFAULT_RETURN_TO = "/";

function decodeCandidate(value: string) {
  let candidate = value.trim();

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const decoded = decodeURIComponent(candidate);
      if (decoded === candidate) break;
      candidate = decoded;
    } catch {
      return null;
    }
  }

  return candidate;
}

/** Returns only an application-relative path suitable for router navigation. */
export function getSafeReturnTo(
  value: string | null | undefined,
  fallback = DEFAULT_RETURN_TO
) {
  const candidate = typeof value === "string" ? decodeCandidate(value) : null;
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return fallback;
  }

  if (
    candidate.includes("\\") ||
    candidate.includes("\u0000") ||
    /^[a-z][a-z\d+.-]*:/i.test(candidate)
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(candidate, "https://river-city-ffl.invalid");
    if (parsed.origin !== "https://river-city-ffl.invalid") return fallback;
  } catch {
    return fallback;
  }

  return candidate;
}
