export type CrosswalkPosition = "QB" | "RB" | "WR" | "TE" | "K" | "DEF" | "DST";

export type CrosswalkFantasyProsRecord = {
  fpid?: string | number | null;
  player_id?: string | number | null;
  name?: string | null;
  player_name?: string | null;
  position_id?: string | null;
  team_id?: string | null;
  sportsdata_player_id?: string | number | null;
};

export type CrosswalkSleeperRecord = {
  player_id: string;
  full_name?: string | null;
  position?: string | null;
  team?: string | null;
  fantasy_data_id?: string | number | null;
  sportradar_id?: string | null;
  stats_id?: string | number | null;
  gsis_id?: string | null;
  espn_id?: string | number | null;
  yahoo_id?: string | number | null;
  rotowire_id?: string | number | null;
  injury_status?: string | null;
  status?: string | null;
};

export type CrosswalkResult = {
  sleeperPlayerId: string | null;
  method: "EXACT_SHARED_EXTERNAL_ID" | "EXACT_KNOWN_CROSSWALK" | "EXACT_NAME_TEAM_POSITION" | "DST_TEAM_CODE" | "UNRESOLVED";
};

const EXTERNAL_ID_FIELDS = ["sportsdata_player_id", "fantasy_data_id", "sportradar_id", "stats_id", "gsis_id", "espn_id", "yahoo_id", "rotowire_id"] as const;

export function normalizeCrosswalkName(value: string | null | undefined): string {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "").replace(/(jr|sr|ii|iii|iv)$/, "");
}

export function normalizeCrosswalkTeam(value: string | null | undefined): string {
  const team = String(value ?? "").toUpperCase();
  return team === "JAX" ? "JAC" : team;
}

function providerId(record: CrosswalkFantasyProsRecord): string {
  return String(record.fpid ?? record.player_id ?? "").trim();
}

function providerName(record: CrosswalkFantasyProsRecord): string {
  return record.name ?? record.player_name ?? "";
}

function providerPosition(record: CrosswalkFantasyProsRecord): string {
  return String(record.position_id ?? "").toUpperCase();
}

function providerTeam(record: CrosswalkFantasyProsRecord): string {
  return normalizeCrosswalkTeam(record.team_id);
}

function sleeperPosition(record: CrosswalkSleeperRecord): string {
  return String(record.position ?? "").toUpperCase() === "DEF" ? "DST" : String(record.position ?? "").toUpperCase();
}

function sleeperTeam(record: CrosswalkSleeperRecord): string {
  return normalizeCrosswalkTeam(record.team);
}

function externalIds(record: CrosswalkFantasyProsRecord | CrosswalkSleeperRecord): string[] {
  return EXTERNAL_ID_FIELDS.map(field => {
    if (field === "sportsdata_player_id") return (record as CrosswalkFantasyProsRecord).sportsdata_player_id;
    return (record as CrosswalkSleeperRecord)[field];
  }).filter(value => value !== null && value !== undefined && String(value).trim() !== "").map(value => String(value).trim());
}

export function resolveFantasyProsIdentity(
  provider: CrosswalkFantasyProsRecord,
  sleeperRecords: readonly CrosswalkSleeperRecord[],
  knownCrosswalk: ReadonlyMap<string, string> = new Map(),
): CrosswalkResult {
  const providerExternalIds = new Set(externalIds(provider));
  const shared = sleeperRecords.find(record => externalIds(record).some(id => providerExternalIds.has(id)));
  if (shared) return { sleeperPlayerId: shared.player_id, method: "EXACT_SHARED_EXTERNAL_ID" };

  const known = knownCrosswalk.get(providerId(provider));
  if (known) return { sleeperPlayerId: known, method: "EXACT_KNOWN_CROSSWALK" };

  if (["DST", "DEF"].includes(providerPosition(provider))) {
    const defense = sleeperRecords.find(record => record.player_id === providerTeam(provider) && sleeperPosition(record) === "DST") ?? sleeperRecords.find(record => sleeperPosition(record) === "DST" && sleeperTeam(record) === providerTeam(provider));
    return defense ? { sleeperPlayerId: defense.player_id, method: "DST_TEAM_CODE" } : { sleeperPlayerId: null, method: "UNRESOLVED" };
  }

  const matches = sleeperRecords.filter(record => normalizeCrosswalkName(providerName(provider)) === normalizeCrosswalkName(record.full_name) && providerTeam(provider) === sleeperTeam(record) && providerPosition(provider) === sleeperPosition(record));
  return matches.length === 1 ? { sleeperPlayerId: matches[0].player_id, method: "EXACT_NAME_TEAM_POSITION" } : { sleeperPlayerId: null, method: "UNRESOLVED" };
}
