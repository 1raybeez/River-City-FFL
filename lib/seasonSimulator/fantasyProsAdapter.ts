import { normalizeWeeklyProjection, type NormalizedWeeklyProjection, type ProjectionAvailabilityStatus } from "./prerequisites";
import { resolveFantasyProsIdentity, type CrosswalkFantasyProsRecord, type CrosswalkSleeperRecord } from "./identityCrosswalk";

export const FANTASYPROS_ADAPTER_VERSION = "fantasypros-weekly-v1";
export const FANTASYPROS_SOURCE = "FANTASYPROS";
const POSITIONS = "QB:RB:WR:TE:DST:K";

export type FantasyProsProjectionRecord = CrosswalkFantasyProsRecord & { stats?: { points_half?: number | string | null; [key: string]: unknown } };
export type FantasyProsProjectionResponse = { season?: string | number; week?: string | number; scoring?: string; players?: FantasyProsProjectionRecord[]; count?: string | number };
export type FantasyProsAdapterOptions = { apiKey: string; fetchImpl?: typeof fetch; sleep?: (milliseconds: number) => Promise<void>; now?: () => string };
export type NormalizedFantasyProsFeed = { projections: NormalizedWeeklyProjection[]; diagnostics: { providerCount: number; projected: number; unresolved: number; missingPoints: number; sourceAsOf: string | null } };

function projectionPoints(record: FantasyProsProjectionRecord): number | null {
  const value = record.stats?.points_half;
  return typeof value === "number" && Number.isFinite(value) ? value : typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value)) ? Number(value) : null;
}

function responseDate(response: Response, now: () => string): string {
  return response.headers.get("last-modified") ?? now();
}

export function normalizeFantasyProsFeed(
  response: FantasyProsProjectionResponse,
  sleeperRecords: readonly CrosswalkSleeperRecord[],
  sourceAsOf: string | null,
  knownCrosswalk: ReadonlyMap<string, string> = new Map(),
): NormalizedFantasyProsFeed {
  const projections: NormalizedWeeklyProjection[] = [];
  let unresolved = 0;
  let missingPoints = 0;
  for (const record of response.players ?? []) {
    const identity = resolveFantasyProsIdentity(record, sleeperRecords, knownCrosswalk);
    const points = projectionPoints(record);
    if (!identity.sleeperPlayerId) unresolved += 1;
    if (identity.sleeperPlayerId && points === null) missingPoints += 1;
    const normalized = normalizeWeeklyProjection({
      season: Number(response.season),
      week: Number(response.week),
      playerId: identity.sleeperPlayerId,
      providerPlayerId: record.fpid ?? record.player_id ?? null,
      playerName: record.name ?? record.player_name ?? null,
      position: record.position_id ?? null,
      nflTeam: record.team_id ?? null,
      projectedPoints: points,
      source: FANTASYPROS_SOURCE,
      sourceAsOf,
      providerVersion: FANTASYPROS_ADAPTER_VERSION,
      identityMethod: identity.method,
      availabilityStatus: "UNKNOWN" as ProjectionAvailabilityStatus,
    });
    projections.push(normalized);
  }
  return { projections, diagnostics: { providerCount: response.players?.length ?? 0, projected: projections.filter(p => p.coverageStatus === "PROJECTED" || p.coverageStatus === "VALID_ZERO").length, unresolved, missingPoints, sourceAsOf } };
}

export class FantasyProsWeeklyAdapter {
  private readonly cache = new Map<string, Promise<NormalizedFantasyProsFeed>>();
  private lastRequestAt = 0;
  constructor(private readonly options: FantasyProsAdapterOptions) {}

  fetchWeek(season: number, week: number, sleeperRecords: readonly CrosswalkSleeperRecord[], knownCrosswalk: ReadonlyMap<string, string> = new Map()): Promise<NormalizedFantasyProsFeed> {
    const cacheKey = `${season}:${week}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;
    const request = this.fetchUncached(season, week, sleeperRecords, knownCrosswalk);
    this.cache.set(cacheKey, request);
    return request;
  }

  private async fetchUncached(season: number, week: number, sleeperRecords: readonly CrosswalkSleeperRecord[], knownCrosswalk: ReadonlyMap<string, string>): Promise<NormalizedFantasyProsFeed> {
    const wait = this.options.sleep ?? ((milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds)));
    const elapsed = Date.now() - this.lastRequestAt;
    if (elapsed < 1000) await wait(1000 - elapsed);
    this.lastRequestAt = Date.now();
    const fetchImpl = this.options.fetchImpl ?? fetch;
    const url = `https://api.fantasypros.com/public/v2/json/nfl/${season}/projections?week=${week}&scoring=HALF&positions=${POSITIONS}`;
    const response = await fetchImpl(url, { headers: { "x-api-key": this.options.apiKey } });
    if (!response.ok) throw new Error(`FantasyPros projection feed unavailable: HTTP ${response.status}`);
    const body = await response.json() as FantasyProsProjectionResponse;
    return normalizeFantasyProsFeed(body, sleeperRecords, responseDate(response, this.options.now ?? (() => new Date().toISOString())), knownCrosswalk);
  }
}
