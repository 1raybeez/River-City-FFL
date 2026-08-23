export function isSameOriginRequest(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true;

  const requestOrigins = new Set([new URL(req.url).origin]);
  const forwardedHost = req.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const forwardedProtocol = req.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  if (forwardedHost) {
    requestOrigins.add(`${forwardedProtocol || "https"}://${forwardedHost}`);
  }

  const publicHost = process.env.VERCEL_URL?.trim();
  if (publicHost) {
    requestOrigins.add(
      publicHost.startsWith("http") ? publicHost : `https://${publicHost}`
    );
  }

  return requestOrigins.has(origin);
}

export function validateJsonMutationRequest(req: Request) {
  if (!isSameOriginRequest(req)) {
    return new Response(JSON.stringify({ error: "Cross-origin request denied." }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!req.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return new Response(JSON.stringify({ error: "JSON request required." }), {
      status: 415,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}
