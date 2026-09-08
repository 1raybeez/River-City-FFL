import { createHash } from "node:crypto";
import { canonicalAuctionTeams } from "@/lib/auction/canonicalTeamCatalog";
import type { DraftReportV2Snapshot, DraftReportV2SnapshotBuildInput, DraftReportV2SnapshotOptions, V2Player } from "@/lib/draftReportV2/types";
import { DRAFT_REPORT_V2_VERSION, DRAFT_QUALITY_MODEL_VERSION, AUCTION_EFFICIENCY_MODEL_VERSION } from "@/lib/draftReportV2/types";

function stableJson(value: unknown) {
  return JSON.stringify(value, (_key, current) => {
    if (current && typeof current === "object" && !Array.isArray(current)) {
      return Object.fromEntries(Object.entries(current).sort(([a], [b]) => a.localeCompare(b)));
    }
    return current;
  });
}

function checksum(value: unknown) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function requireIso(value: string, label: string) {
  if (!value || !Number.isFinite(Date.parse(value))) throw new Error(`V2 ${label} must be an explicit ISO timestamp.`);
}

export function buildDraftReportV2Snapshot(input: DraftReportV2SnapshotBuildInput, options: DraftReportV2SnapshotOptions): DraftReportV2Snapshot {
  if (!input.rosterRequirements) throw new Error("V2 snapshot requires the authoritative Sleeper roster requirements.");
  if (options.evidenceSources.length === 0) throw new Error("V2 snapshot requires at least one explicit frozen evidence source.");
  requireIso(options.evidenceAsOf, "evidenceAsOf");
  requireIso(input.generatedAt, "generatedAt");
  if (input.draftStatus !== "complete") throw new Error("V2 snapshot requires a completed draft.");

  const canonicalByRoster = new Map<number, (typeof canonicalAuctionTeams)[number]>(canonicalAuctionTeams.map((team) => [Number(team.rosterId), team]));
  const teams = input.rosters.map((roster) => {
    const canonical = canonicalByRoster.get(roster.rosterId);
    if (!canonical || !roster.franchiseId) throw new Error(`V2 snapshot cannot resolve canonical franchise for roster ${roster.rosterId}.`);
    return {
      franchiseId: roster.franchiseId,
      rosterId: roster.rosterId,
      ownerIds: [...(roster.ownerIds ?? canonical.ownerIds)].sort(),
      historicalDraftTimeTeamName: roster.teamName ?? canonical.teamName,
      currentDisplayName: options.currentDisplayNames?.get(roster.franchiseId) ?? canonical.teamName,
      playerIds: [...roster.playerIds].sort(),
      acquisitions: input.acquisitions.filter((acquisition) => acquisition.rosterId === roster.rosterId).map((acquisition) => ({ ...acquisition })).sort((a, b) => a.playerId.localeCompare(b.playerId)),
    };
  }).sort((a, b) => a.franchiseId.localeCompare(b.franchiseId));
  if (teams.length !== canonicalAuctionTeams.length) throw new Error("V2 snapshot requires all canonical franchises.");

  const players: V2Player[] = Array.from(new Set(teams.flatMap((team) => team.playerIds))).sort().map((playerId) => {
    const player = input.players.get(playerId);
    if (!player) return { playerId, playerName: playerId, position: null, nflTeam: null, evidence: { publishedValue: null, adp: null, qualityScore: null, source: "missing" as const } };
    return { playerId, playerName: player.playerName, position: player.position, nflTeam: player.nflTeam, evidence: { publishedValue: player.publishedValue, adp: player.adp, qualityScore: null, source: player.publishedValue === null ? "missing" as const : "published-player-value" as const } };
  });
  const values = players.flatMap((player) => player.evidence.publishedValue === null ? [] : [player.evidence.publishedValue]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const scoredPlayers = players.map((player) => ({ ...player, evidence: { ...player.evidence, qualityScore: player.evidence.publishedValue === null ? null : max === min ? 50 : Math.round(((player.evidence.publishedValue - min) / (max - min)) * 10000) / 100 } }));
  const scoringTeams = teams.map(({ currentDisplayName: _currentDisplayName, ...team }) => team);
  const base = { season: input.season, draftId: input.draftId, draftStatus: input.draftStatus, generatedAt: input.generatedAt, evidenceAsOf: options.evidenceAsOf, rosterRequirements: input.rosterRequirements, teams, players: scoredPlayers, evidenceSources: options.evidenceSources, coverage: { playerCount: scoredPlayers.length, qualityEvidenceCount: scoredPlayers.filter((player) => player.evidence.qualityScore !== null).length, adpEvidenceCount: scoredPlayers.filter((player) => player.evidence.adp !== null).length, warnings: ["DRAFT_COMPLETION_TIMESTAMP_NOT_PERSISTED", ...(scoredPlayers.some((player) => player.evidence.qualityScore === null) ? ["One or more roster players lack frozen player-quality evidence."] : [])] }, modelVersions: { report: DRAFT_REPORT_V2_VERSION, draftQuality: DRAFT_QUALITY_MODEL_VERSION, auctionEfficiency: AUCTION_EFFICIENCY_MODEL_VERSION } };
  const { generatedAt: _generatedAt, ...baseWithoutGeneratedAt } = base;
  const scoringInput = { ...baseWithoutGeneratedAt, teams: scoringTeams };
  const inputChecksum = checksum(scoringInput);
  return { ...base, snapshotId: options.snapshotId ?? `draft-report-v2-${inputChecksum.slice(0, 16)}`, schemaVersion: DRAFT_REPORT_V2_VERSION, inputChecksum };
}

export function snapshotChecksum(snapshot: DraftReportV2Snapshot) {
  const { inputChecksum: _inputChecksum, teams, ...withoutChecksum } = snapshot;
  const scoringTeams = teams.map(({ currentDisplayName: _currentDisplayName, ...team }) => team);
  const { generatedAt: _generatedAt, ...withoutGeneratedAt } = withoutChecksum;
  return checksum({ ...withoutGeneratedAt, teams: scoringTeams });
}
