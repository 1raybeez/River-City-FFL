import { canonicalAuctionTeams } from "../lib/auction/canonicalTeamCatalog";
import { loadDraftReportV2SourceInput } from "../lib/draftReportV2/sourceAdapter";
import { buildDraftReportV2Snapshot } from "../lib/draftReportV2/snapshot";
import { calculateDraftQualityCandidates, componentOverlapDescription } from "../lib/draftReportV2/calibration";
import { calculateDraftQuality } from "../lib/draftReportV2/draftQuality";
import { calculateAuctionEfficiency } from "../lib/draftReportV2/auctionEfficiency";
import { buildDraftQualityContributionMap, buildFormulaCReport } from "../lib/draftReportV2/contributionMap";
import { calculatePostDraftMetrics } from "../lib/postDraftMetrics";
import { calculatePublicDraftGrades } from "../lib/draftGrade";

async function main() {
  const { input, currentDisplayNames, evidence } = await loadDraftReportV2SourceInput(2026);
  if (!evidence.values.activeRunId || !evidence.adp.activeRunId || !evidence.values.generatedAt || !evidence.adp.generatedAt) throw new Error("No explicit published evidence source is available; calibration stopped.");
  const evidenceAsOf = [evidence.values.generatedAt, evidence.adp.generatedAt].sort()[0];
  const snapshot = buildDraftReportV2Snapshot(input, { evidenceAsOf, evidenceSources: [{ source: "published-player-value", runId: evidence.values.activeRunId, generatedAt: evidence.values.generatedAt }, { source: "published-adp-consensus", runId: evidence.adp.activeRunId, generatedAt: evidence.adp.generatedAt }], currentDisplayNames });
  const quality = calculateDraftQuality(snapshot);
  const candidates = calculateDraftQualityCandidates(snapshot);
  const efficiency = calculateAuctionEfficiency(snapshot);
  const v1Input = { ...input, powerRankings: { season: 2026, generatedAt: input.generatedAt, label: "Roster Strength Index", teams: canonicalAuctionTeams.map((team, index) => ({ franchiseId: team.franchiseId, rosterId: team.rosterId, teamName: team.teamName, avatar: null, rank: index + 1, rosterValue: 0, averageSOS: 50, powerScore: 0, normalizedIndex: 50, coverage: "complete", status: "Preseason Outlook" })), coverage: { status: "complete", rosterCount: 12, playerCount: 0, valuedPlayerCount: 0, missingValuePlayerCount: 0, sosPlayerCount: 0, missingSosPlayerCount: 0, unmappedFranchiseCount: 0, message: null }, sources: { rosters: "Sleeper", ownership: "Sleeper", playerValues: "Firestore player_stats" } } } as Parameters<typeof calculatePostDraftMetrics>[0];
  const v1Metrics = calculatePostDraftMetrics(v1Input);
  const v1Grades = calculatePublicDraftGrades(v1Metrics);
  console.log(JSON.stringify({ evidenceAsOf, snapshotId: snapshot.snapshotId, inputChecksum: snapshot.inputChecksum, modelVersions: snapshot.modelVersions, evidenceSources: snapshot.evidenceSources, coverage: snapshot.coverage, lineupRequirements: snapshot.rosterRequirements, overlap: componentOverlapDescription(), currentIdentity: snapshot.teams.map((team) => ({ franchiseId: team.franchiseId, draftTimeTeamName: team.historicalDraftTimeTeamName, currentTeamName: team.currentDisplayName })), v1: v1Grades.records.map((record) => ({ franchiseId: record.franchiseId, score: record.draftScore, grade: record.letterGrade, value: record.valueEfficiency.score, roster: record.rosterConstruction.score, budget: record.budgetManagement.score, keeper: record.keeperEfficiency.score })), formulaC: buildFormulaCReport(snapshot), contributionMap: buildDraftQualityContributionMap(snapshot), currentShadow: quality.teams.map((team) => ({ franchiseId: team.franchiseId, draftQuality: team.draftQuality, components: team.components })), candidates, auctionEfficiency: efficiency.teams }, null, 2));
  console.error(`Calibrated ${canonicalAuctionTeams.length} canonical franchises. Candidate formulas are diagnostic only.`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
