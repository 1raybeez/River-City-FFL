import { loadDraftReportV2SourceInput } from "@/lib/draftReportV2/sourceAdapter";
import { buildDraftReportV2Snapshot } from "@/lib/draftReportV2/snapshot";
import { calculateDraftQuality } from "@/lib/draftReportV2/draftQuality";
import { calculateAuctionEfficiency } from "@/lib/draftReportV2/auctionEfficiency";
import { calculateDraftQualityCandidates } from "@/lib/draftReportV2/calibration";
import { buildDraftQualityContributionMap, buildFormulaCReport } from "@/lib/draftReportV2/contributionMap";
import { buildMethodDInputsFromFrozenReview, calculateMethodDScores } from "@/lib/draftReportV2/finalGrade";

export async function buildLiveDraftReportV2Review(season = 2026) {
  const { input, currentDisplayNames, evidence } = await loadDraftReportV2SourceInput(season);
  if (!evidence.values.activeRunId || !evidence.adp.activeRunId || !evidence.values.generatedAt || !evidence.adp.generatedAt) throw new Error("Published frozen evidence is unavailable.");
  const evidenceAsOf = [evidence.values.generatedAt, evidence.adp.generatedAt].sort()[0];
  const snapshot = buildDraftReportV2Snapshot(input, { evidenceAsOf, evidenceSources: [{ source: "published-player-value", runId: evidence.values.activeRunId, generatedAt: evidence.values.generatedAt }, { source: "published-adp-consensus", runId: evidence.adp.activeRunId, generatedAt: evidence.adp.generatedAt }], currentDisplayNames });
  const formulaC = buildFormulaCReport(snapshot);
  const auctionEfficiency = calculateAuctionEfficiency(snapshot);
  return { kind: "LIVE_SHADOW_CALCULATION" as const, snapshot, quality: calculateDraftQuality(snapshot), formulaC, candidates: calculateDraftQualityCandidates(snapshot), auctionEfficiency, finalGrades: calculateMethodDScores(buildMethodDInputsFromFrozenReview({ snapshot, formulaC, auctionEfficiency })), contributionMap: buildDraftQualityContributionMap(snapshot), provenance: { warning: "DRAFT_COMPLETION_TIMESTAMP_NOT_PERSISTED", message: "Exact Sleeper auction-completion event time was not separately persisted. This does not affect scoring but remains a publication-provenance gap." } };
}
