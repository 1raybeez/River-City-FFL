export type ServerFetchOptions = { fresh?: boolean; revalidateSeconds?: number };

export function serverFetch(input: string | URL, options: ServerFetchOptions = {}) {
  return fetch(input, options.fresh ? { cache: "no-store" } : undefined);
}
