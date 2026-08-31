import type { RosSourceRow } from "./rosValuePipeline";

export type FantasyProsPlayer = {
  player_name?: unknown;
  player_team_id?: unknown;
  player_position_id?: unknown;
  rank_ecr?: unknown;
  pos_rank?: unknown;
};

export type FantasyProsResponse = {
  count?: unknown;
  limit?: unknown;
  players?: unknown;
  last_updated?: unknown;
  last_updated_ts?: unknown;
  public_api_limited?: unknown;
  tier?: unknown;
};

export type FantasyProsRosAdaptation = {
  rows: RosSourceRow[];
  returnedRows: number;
  availableRows: number | null;
  limit: number | null;
  truncated: boolean;
  publicApiLimited: boolean;
  tier: string | null;
  lastUpdated: string | null;
  lastUpdatedTs: number | null;
};

function finiteNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function positionRank(value: unknown): number | null {
  const match = text(value)?.match(/(\d+)$/);
  return match ? finiteNumber(match[1]) : finiteNumber(value);
}

export function adaptFantasyProsRosResponse(
  response: FantasyProsResponse,
  generatedAt: string,
  source = "FantasyPros ROS"
): FantasyProsRosAdaptation {
  const players = Array.isArray(response.players) ? response.players : [];
  const rows = players.map((raw, index) => {
    const player = raw && typeof raw === "object" ? raw as FantasyProsPlayer : {};
    return {
      source,
      playerName: text(player.player_name) ?? "",
      team: text(player.player_team_id),
      position: text(player.player_position_id),
      overallRank: finiteNumber(player.rank_ecr),
      positionalRank: positionRank(player.pos_rank),
      sourceValue: null,
      generatedAt,
      rowNumber: index + 1,
      playerId: null,
    } satisfies RosSourceRow;
  });
  const availableRows = finiteNumber(response.count);
  const limit = finiteNumber(response.limit);
  return {
    rows,
    returnedRows: rows.length,
    availableRows,
    limit,
    truncated: Boolean(response.public_api_limited) || (limit !== null && rows.length >= limit && availableRows !== null && availableRows > rows.length),
    publicApiLimited: response.public_api_limited === true,
    tier: text(response.tier),
    lastUpdated: text(response.last_updated),
    lastUpdatedTs: finiteNumber(response.last_updated_ts),
  };
}

export function fantasyProsRowsToCsv(rows: readonly RosSourceRow[]): string {
  const quote = (value: string | number | null) => {
    const textValue = value === null ? "" : String(value);
    return /[,\"]/.test(textValue) ? `"${textValue.replace(/"/g, '""')}"` : textValue;
  };
  return [
    "Rank,Name,Team,Position,PosRank,Value",
    ...rows.map((row) => [row.overallRank, row.playerName, row.team, row.position, row.positionalRank, row.sourceValue].map(quote).join(",")),
  ].join("\n");
}
