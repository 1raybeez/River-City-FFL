import { canonicalAuctionTeams } from "../lib/auction/canonicalTeamCatalog";
import { loadDraftReportV2SourceInput } from "../lib/draftReportV2/sourceAdapter";
import { buildDraftReportV2Snapshot } from "../lib/draftReportV2/snapshot";
import { calculateDraftQuality } from "../lib/draftReportV2/draftQuality";
import { calculateAuctionEfficiency } from "../lib/draftReportV2/auctionEfficiency";

const season = 2026;

async function main() {
  const { input, currentDisplayNames, evidence } = await loadDraftReportV2SourceInput(season);
  if (!evidence.values.activeRunId || !evidence.adp.activeRunId || !evidence.values.generatedAt || !evidence.adp.generatedAt) throw new Error("No explicit published 2026 value/ADP evidence snapshot is available; diagnostic stopped without fabricating one.");
  const evidenceAsOf = [evidence.values.generatedAt, evidence.adp.generatedAt].sort()[0];
  const snapshot = buildDraftReportV2Snapshot(input, { evidenceAsOf, evidenceSources: [{ source: "published-player-value", runId: evidence.values.activeRunId, generatedAt: evidence.values.generatedAt }, { source: "published-adp-consensus", runId: evidence.adp.activeRunId, generatedAt: evidence.adp.generatedAt }], currentDisplayNames });
  const quality = calculateDraftQuality(snapshot);
  const efficiency = calculateAuctionEfficiency(snapshot);
  console.log(JSON.stringify({ evidenceAsOf: snapshot.evidenceAsOf, snapshotId: snapshot.snapshotId, inputChecksum: snapshot.inputChecksum, modelVersions: snapshot.modelVersions, warnings: snapshot.coverage.warnings, missingEvidence: snapshot.players.filter((player) => player.evidence.qualityScore === null).map((player) => player.playerId), teams: quality.teams.map((team) => { const snapshotTeam = snapshot.teams.find((candidate) => candidate.franchiseId === team.franchiseId); return { rank: team.draftQuality.leagueRank, franchiseId: team.franchiseId, rosterId: team.rosterId, draftTimeTeamName: snapshotTeam?.historicalDraftTimeTeamName ?? null, currentTeamName: snapshotTeam?.currentDisplayName ?? team.teamName, draftQuality: team.draftQuality, components: team.components, strength: team.biggestStrength, weakness: team.biggestWeakness, coverage: team.coverage, auction: efficiency.teams.find((candidate) => candidate.franchiseId === team.franchiseId) }; }), canonicalTeamCount: canonicalAuctionTeams.length }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
