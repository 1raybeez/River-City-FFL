import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ExpertRosEvidence } from "./recommendationEngine";

export const PUBLISHED_ROS_ARTIFACT_ID = "ros-consensus-2026-2026-08-31" as const;
export const PUBLISHED_ROS_ARTIFACT_PATH = "data/trade-analyzer/ros/published/ros-consensus-2026-2026-08-31.json" as const;
const PUBLISHED_ROS_ABSOLUTE_PATH = join(process.cwd(), PUBLISHED_ROS_ARTIFACT_PATH);
const POSITIONS = new Set(["QB", "RB", "WR", "TE", "K", "DEF"]);
const FRESHNESS = new Set(["FRESH", "AGING", "STALE", "UNKNOWN"]);
const CONFIDENCE = new Set(["HIGH", "MEDIUM", "LOW", "UNAVAILABLE"]);

type RosSourceRow = { source?: unknown; playerName?: unknown; team?: unknown; position?: unknown; overallRank?: unknown; positionalRank?: unknown; sourceValue?: unknown; generatedAt?: unknown; rowNumber?: unknown; playerId?: unknown };
type RosRow = { playerId?: unknown; playerName?: unknown; position?: unknown; consensusOverallRank?: unknown; consensusPositionalRank?: unknown; sourceCount?: unknown; sourceRows?: unknown; generatedAt?: unknown; freshness?: unknown; confidence?: unknown; staleSourceCount?: unknown };
type RosArtifact = { season?: unknown; generatedAt?: unknown; rows?: unknown; sources?: unknown; provenance?: unknown; coverage?: unknown; [key: string]: unknown };

export type RosArtifactValidation = { valid: boolean; errors: string[]; playerCount: number; generatedAt: string | null; sourceNames: string[] };
export type LoadedPublishedRos = RosArtifactValidation & { artifactId: string; artifactPath: string; checksum: string | null; rows: ReadonlyMap<string, ExpertRosEvidence> };

function finiteRank(value: unknown) { return value === null || (typeof value === "number" && Number.isFinite(value) && value > 0); }
function validTimestamp(value: unknown) { return typeof value === "string" && Number.isFinite(Date.parse(value)); }

export function validateRosArtifact(value: unknown, expectedSeason = 2026): RosArtifactValidation {
  const errors: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) return { valid: false, errors: ["Artifact must be an object."], playerCount: 0, generatedAt: null, sourceNames: [] };
  const artifact = value as RosArtifact;
  if (artifact.season !== expectedSeason) errors.push(`Expected season ${expectedSeason}.`);
  if (!validTimestamp(artifact.generatedAt)) errors.push("generatedAt must be a valid timestamp.");
  if (!Array.isArray(artifact.rows)) errors.push("rows must be an array.");
  if (!Array.isArray(artifact.sources) || artifact.sources.length === 0) errors.push("sources must be a non-empty array.");
  const sourceNames = Array.isArray(artifact.sources) ? artifact.sources.flatMap((source) => source && typeof source === "object" && typeof (source as { name?: unknown }).name === "string" ? [(source as { name: string }).name] : []) : [];
  if (sourceNames.length !== (Array.isArray(artifact.sources) ? artifact.sources.length : 0)) errors.push("Every source must have a name.");
  const ids = new Set<string>();
  const rows = Array.isArray(artifact.rows) ? artifact.rows as RosRow[] : [];
  rows.forEach((row, index) => {
    if (!row || typeof row !== "object") { errors.push(`rows[${index}] must be an object.`); return; }
    if (typeof row.playerId !== "string" || !row.playerId) errors.push(`rows[${index}].playerId must be a non-empty string.`);
    else if (ids.has(row.playerId)) errors.push(`Duplicate playerId ${row.playerId}.`);
    else ids.add(row.playerId);
    if (typeof row.playerName !== "string" || !row.playerName.trim()) errors.push(`rows[${index}].playerName must be non-empty.`);
    if (typeof row.position !== "string" || !POSITIONS.has(row.position)) errors.push(`rows[${index}].position is invalid.`);
    if (!finiteRank(row.consensusOverallRank) || !finiteRank(row.consensusPositionalRank)) errors.push(`rows[${index}] has an invalid consensus rank.`);
    if (!validTimestamp(row.generatedAt)) errors.push(`rows[${index}].generatedAt must be a valid timestamp.`);
    if (!FRESHNESS.has(String(row.freshness))) errors.push(`rows[${index}].freshness is invalid.`);
    if (!CONFIDENCE.has(String(row.confidence))) errors.push(`rows[${index}].confidence is invalid.`);
    if (typeof row.sourceCount !== "number" || !Number.isInteger(row.sourceCount) || row.sourceCount < 1) errors.push(`rows[${index}].sourceCount is invalid.`);
    if (!Array.isArray(row.sourceRows) || row.sourceRows.length !== row.sourceCount) errors.push(`rows[${index}] sourceCount does not match sourceRows.`);
    (Array.isArray(row.sourceRows) ? row.sourceRows as RosSourceRow[] : []).forEach((source, sourceIndex) => {
      if (!source || typeof source !== "object" || typeof source.source !== "string" || !source.source) errors.push(`rows[${index}].sourceRows[${sourceIndex}] has invalid source metadata.`);
      if (source.overallRank !== null && !finiteRank(source.overallRank)) errors.push(`rows[${index}].sourceRows[${sourceIndex}] has an invalid overall rank.`);
      if (source.positionalRank !== null && !finiteRank(source.positionalRank)) errors.push(`rows[${index}].sourceRows[${sourceIndex}] has an invalid positional rank.`);
      if (!validTimestamp(source.generatedAt)) errors.push(`rows[${index}].sourceRows[${sourceIndex}].generatedAt is invalid.`);
    });
  });
  return { valid: errors.length === 0, errors, playerCount: rows.length, generatedAt: typeof artifact.generatedAt === "string" ? artifact.generatedAt : null, sourceNames };
}

function toEvidence(row: RosRow): ExpertRosEvidence {
  const sourceRows = row.sourceRows as RosSourceRow[];
  return { playerId: row.playerId as string, playerName: row.playerName as string, consensusOverallRank: typeof row.consensusOverallRank === "number" ? row.consensusOverallRank : null, consensusPositionalRank: typeof row.consensusPositionalRank === "number" ? row.consensusPositionalRank : null, sourceCount: row.sourceCount as number, staleSourceCount: typeof row.staleSourceCount === "number" ? row.staleSourceCount : 0, generatedAt: row.generatedAt as string, freshness: row.freshness as ExpertRosEvidence["freshness"], confidence: row.confidence as ExpertRosEvidence["confidence"], sourceRanks: sourceRows.map((source) => ({ source: source.source as string, overallRank: typeof source.overallRank === "number" ? source.overallRank : null, positionalRank: typeof source.positionalRank === "number" ? source.positionalRank : null })) };
}

export async function readPublishedRosArtifact(): Promise<LoadedPublishedRos> {
  try {
    const raw = await readFile(PUBLISHED_ROS_ABSOLUTE_PATH, "utf8");
    const parsed = JSON.parse(raw) as RosArtifact;
    const validation = validateRosArtifact(parsed);
    if (!validation.valid) return { ...validation, artifactId: PUBLISHED_ROS_ARTIFACT_ID, artifactPath: PUBLISHED_ROS_ARTIFACT_PATH, checksum: null, rows: new Map() };
    const rows = parsed.rows as RosRow[];
    return { ...validation, artifactId: PUBLISHED_ROS_ARTIFACT_ID, artifactPath: PUBLISHED_ROS_ARTIFACT_PATH, checksum: createHash("sha256").update(raw).digest("hex"), rows: new Map(rows.map((row) => [row.playerId as string, toEvidence(row)])) };
  } catch (error) {
    return { valid: false, errors: [error instanceof SyntaxError ? "Published ROS artifact is malformed JSON." : "Published ROS artifact is missing or unreadable."], playerCount: 0, generatedAt: null, sourceNames: [], artifactId: PUBLISHED_ROS_ARTIFACT_ID, artifactPath: PUBLISHED_ROS_ARTIFACT_PATH, checksum: null, rows: new Map() };
  }
}
