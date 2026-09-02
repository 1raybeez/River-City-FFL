import fantasyCalcArtifact from "../../data/trade-analyzer/current-value/published/fantasycalc-redraft-2026-2026-08-31.json";
import type { CurrentSeasonPlayerValue } from "./currentValue";

export const PUBLISHED_FANTASYCALC_ARTIFACT_ID = "fantasycalc-redraft-2026-2026-08-31" as const;
export const PUBLISHED_FANTASYCALC_ARTIFACT_PATH = "data/trade-analyzer/current-value/published/fantasycalc-redraft-2026-2026-08-31.json" as const;
export const PUBLISHED_FANTASYCALC_CHECKSUM = "f72ed72a9debb711165243b1723a789d8f03a385ff7d3ab1d730a438de0bc759" as const;

const POSITIONS = new Set(["QB", "RB", "WR", "TE", "K", "DEF"]);

type FantasyCalcPlayer = {
  playerId?: unknown;
  playerName?: unknown;
  position?: unknown;
  rawSourceValue?: unknown;
  generatedAt?: unknown;
  fantasycalcOverallRank?: unknown;
  fantasycalcPositionRank?: unknown;
  fantasycalcTrend30Day?: unknown;
  fantasycalcName?: unknown;
  fantasycalcId?: unknown;
  fantasycalcSleeperId?: unknown;
  sourceAttribution?: unknown;
  sourceUrl?: unknown;
  sourceCapturedAt?: unknown;
};

type FantasyCalcArtifact = {
  generatedAt?: unknown;
  sourceDetail?: unknown;
  sourceVersion?: unknown;
  sourceAttribution?: unknown;
  sourceSettings?: { isDynasty?: unknown; numQbs?: unknown; numTeams?: unknown; ppr?: unknown };
  sourceFreshness?: { capturedAt?: unknown; generatedAt?: unknown };
  players?: unknown;
};

export type FantasyCalcArtifactValidation = {
  valid: boolean;
  errors: string[];
  playerCount: number;
  generatedAt: string | null;
};

export type FantasyCalcRow = {
  playerId: string;
  rawSourceValue: number;
  fantasycalcOverallRank: number | null;
  fantasycalcPositionRank: number | null;
  fantasycalcTrend30Day: number | null;
  generatedAt: string;
  fantasycalcName: string | null;
  fantasycalcId: string | null;
  fantasycalcSleeperId: string | null;
};

export type LoadedFantasyCalcArtifact = FantasyCalcArtifactValidation & {
  artifactId: string;
  artifactPath: string;
  checksum: string | null;
  rows: ReadonlyMap<string, FantasyCalcRow>;
};

function validTimestamp(value: unknown) { return typeof value === "string" && Number.isFinite(Date.parse(value)); }
function validFiniteNumber(value: unknown) { return value === null || (typeof value === "number" && Number.isFinite(value)); }
function validRank(value: unknown) { return value === null || (typeof value === "number" && Number.isInteger(value) && value > 0); }

export function validateFantasyCalcArtifact(value: unknown): FantasyCalcArtifactValidation {
  const errors: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) return { valid: false, errors: ["Artifact must be an object."], playerCount: 0, generatedAt: null };
  const artifact = value as FantasyCalcArtifact;
  if (!validTimestamp(artifact.generatedAt)) errors.push("generatedAt must be a valid timestamp.");
  if (typeof artifact.sourceDetail !== "string" || !artifact.sourceDetail.includes("Redraft")) errors.push("sourceDetail must identify Redraft.");
  if (typeof artifact.sourceVersion !== "string" || !artifact.sourceVersion) errors.push("sourceVersion must be present.");
  if (!artifact.sourceAttribution || typeof artifact.sourceAttribution !== "object" || typeof (artifact.sourceAttribution as { name?: unknown }).name !== "string") errors.push("sourceAttribution.name must be present.");
  if (!artifact.sourceSettings || artifact.sourceSettings.isDynasty !== false || String(artifact.sourceSettings.numQbs) !== "1" || String(artifact.sourceSettings.numTeams) !== "12" || String(artifact.sourceSettings.ppr) !== ".5") errors.push("sourceSettings must be REDRAFT, 1 QB, 12 teams, 0.5 PPR, isDynasty=false.");
  if (!artifact.sourceFreshness || !validTimestamp(artifact.sourceFreshness.capturedAt) || !validTimestamp(artifact.sourceFreshness.generatedAt)) errors.push("sourceFreshness timestamps must be valid.");
  if (!artifact.players || typeof artifact.players !== "object" || Array.isArray(artifact.players)) errors.push("players must be an object.");
  const players = artifact.players && typeof artifact.players === "object" && !Array.isArray(artifact.players) ? Object.entries(artifact.players as Record<string, FantasyCalcPlayer>) : [];
  const ids = new Set<string>();
  players.forEach(([key, player], index) => {
    if (!player || typeof player !== "object") { errors.push(`players[${index}] must be an object.`); return; }
    if (typeof player.playerId !== "string" || !player.playerId || key !== player.playerId) errors.push(`players[${index}].playerId must match its key.`);
    else if (ids.has(player.playerId)) errors.push(`Duplicate Sleeper player ID ${player.playerId}.`);
    else ids.add(player.playerId);
    if (typeof player.playerName !== "string" || !player.playerName.trim()) errors.push(`players[${index}].playerName must be present.`);
    if (typeof player.position !== "string" || !POSITIONS.has(player.position)) errors.push(`players[${index}].position is invalid.`);
    if (typeof player.rawSourceValue !== "number" || !Number.isFinite(player.rawSourceValue)) errors.push(`players[${index}].rawSourceValue must be finite.`);
    if (!validTimestamp(player.generatedAt)) errors.push(`players[${index}].generatedAt must be valid.`);
    if (!validRank(player.fantasycalcOverallRank) || !validRank(player.fantasycalcPositionRank) || !validFiniteNumber(player.fantasycalcTrend30Day)) errors.push(`players[${index}] has an invalid rank or trend.`);
    if (typeof player.fantasycalcSleeperId !== "string" || player.fantasycalcSleeperId !== player.playerId) errors.push(`players[${index}].fantasycalcSleeperId must match playerId.`);
    if (typeof player.fantasycalcName !== "string" || !player.fantasycalcName.trim()) errors.push(`players[${index}].fantasycalcName must be present.`);
    if (typeof player.sourceAttribution !== "string" || player.sourceAttribution !== "FantasyCalc") errors.push(`players[${index}].sourceAttribution must be FantasyCalc.`);
    if (typeof player.sourceUrl !== "string" || !player.sourceUrl) errors.push(`players[${index}].sourceUrl must be present.`);
    if (!validTimestamp(player.sourceCapturedAt)) errors.push(`players[${index}].sourceCapturedAt must be valid.`);
  });
  return { valid: errors.length === 0, errors, playerCount: players.length, generatedAt: typeof artifact.generatedAt === "string" ? artifact.generatedAt : null };
}

export function readPublishedFantasyCalcArtifact(): LoadedFantasyCalcArtifact {
  const validation = validateFantasyCalcArtifact(fantasyCalcArtifact);
  if (!validation.valid) return { ...validation, artifactId: PUBLISHED_FANTASYCALC_ARTIFACT_ID, artifactPath: PUBLISHED_FANTASYCALC_ARTIFACT_PATH, checksum: null, rows: new Map() };
  const rows = Object.values(fantasyCalcArtifact.players).map((player) => [player.playerId, {
    playerId: player.playerId,
    rawSourceValue: player.rawSourceValue,
    fantasycalcOverallRank: player.fantasycalcOverallRank ?? null,
    fantasycalcPositionRank: player.fantasycalcPositionRank ?? null,
    fantasycalcTrend30Day: player.fantasycalcTrend30Day ?? null,
    generatedAt: player.generatedAt,
    fantasycalcName: player.fantasycalcName ?? null,
    fantasycalcId: player.fantasycalcId ?? null,
    fantasycalcSleeperId: player.fantasycalcSleeperId ?? null,
  } satisfies FantasyCalcRow] as const);
  return { ...validation, artifactId: PUBLISHED_FANTASYCALC_ARTIFACT_ID, artifactPath: PUBLISHED_FANTASYCALC_ARTIFACT_PATH, checksum: PUBLISHED_FANTASYCALC_CHECKSUM, rows: new Map(rows) };
}

export function fantasyCalcToCurrentValueSource(row: FantasyCalcRow): CurrentSeasonPlayerValue["sources"][number] {
  return { source: "FantasyCalc REDRAFT", rank: row.fantasycalcOverallRank, value: row.rawSourceValue, generatedAt: row.generatedAt };
}
