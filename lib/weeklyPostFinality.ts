import { captureWeeklyActualEvidence, type ActualEvidenceLeague, type ActualEvidenceMatchup, type ActualEvidencePlayerDirectory, type ActualEvidenceRoster, type ActualEvidenceSleeperState } from "@/lib/seasonSimulator/actualEvidenceService";
import { buildCalibrationReadiness, type CalibrationReadiness, type CalibrationReadinessStore } from "@/lib/seasonSimulator/calibrationReadiness";
import { persistResidualEvidence, pairWeeklyProjectionAndActual } from "@/lib/seasonSimulator/postFinalityEvidence";
import { type ActualEvidenceArtifact, type PairedResidualDataset, type ProjectionEvidenceArtifact } from "@/lib/seasonSimulator/evidenceCollection";
import { buildDurableEvidenceRecord, durableEvidencePath, type ImmutableEvidenceStore } from "@/lib/seasonSimulator/durableEvidence";
import { buildWeeklyRecapDraft, type RecapDraftStore, type WeeklyRecapDraft } from "@/lib/weeklyRecapDraft";

export type PostFinalityResult = Readonly<{ state: "WAITING_FOR_FINALITY" | "WEEK_1_PATH_C_PROTECTED" | "ACTUALS_CAPTURED" | "NO_PAIR" | "RESIDUALS_PAIRED" | "CALIBRATION_REFRESHED" | "RECAP_DRAFT_READY" | "CONFLICT" | "ERROR"; season: number; week: number; writePerformed: boolean; actual: ActualEvidenceArtifact | null; residual: PairedResidualDataset | null; readiness: CalibrationReadiness | null; draft: WeeklyRecapDraft | null; reason: string | null }>;

export type PostFinalityInput = Readonly<{
  season: number;
  week: number;
  now: Date;
  state: ActualEvidenceSleeperState;
  league: ActualEvidenceLeague;
  rosters: readonly ActualEvidenceRoster[];
  matchups: readonly ActualEvidenceMatchup[];
  playerDirectory: ActualEvidencePlayerDirectory;
  projection: ProjectionEvidenceArtifact | null;
  existingActual?: ActualEvidenceArtifact | null;
  existingResiduals?: readonly PairedResidualDataset[];
  existingReadiness?: CalibrationReadiness | null;
  existingDraft?: WeeklyRecapDraft | null;
  evidenceStore: ImmutableEvidenceStore;
  readinessStore: CalibrationReadinessStore;
  draftStore: RecapDraftStore;
  nextWeekSchedule?: readonly { matchupId: number; first: { rosterId: number; points: number }; second: { rosterId: number; points: number } }[];
}>;

function base(input: PostFinalityInput, state: PostFinalityResult["state"], reason: string | null, values: Partial<PostFinalityResult> = {}): PostFinalityResult { return { state, season: input.season, week: input.week, writePerformed: false, actual: null, residual: null, readiness: null, draft: null, reason, ...values }; }

function recapMatchups(matchups: readonly ActualEvidenceMatchup[]) {
  const grouped = new Map<number, ActualEvidenceMatchup[]>();
  for (const row of matchups) { const matchupId = Number(row.matchup_id); if (!Number.isInteger(matchupId)) continue; grouped.set(matchupId, [...(grouped.get(matchupId) ?? []), row]); }
  return [...grouped.entries()].filter(([, rows]) => rows.length === 2).map(([matchupId, rows]) => ({ matchupId, first: { rosterId: Number(rows[0].roster_id), points: Number(rows[0].points) }, second: { rosterId: Number(rows[1].roster_id), points: Number(rows[1].points) } }));
}

function hasUnresolvedTie(matchups: readonly ActualEvidenceMatchup[]) {
  const grouped = new Map<number, number[]>();
  for (const row of matchups) { const matchupId = Number(row.matchup_id); if (!Number.isInteger(matchupId) || typeof row.points !== "number") continue; grouped.set(matchupId, [...(grouped.get(matchupId) ?? []), row.points]); }
  return [...grouped.values()].some(scores => scores.length === 2 && scores[0] === scores[1]);
}

export async function runPostFinalityAutomation(input: PostFinalityInput): Promise<PostFinalityResult> {
  if (input.season === 2026 && input.week === 1) return base(input, "WEEK_1_PATH_C_PROTECTED", "Week 1 actual evidence is already captured as PATH C; no projection pair or rebuild is permitted.", { actual: input.existingActual ?? null });
  const capture = input.existingActual ? { state: "CAPTURED" as const, artifact: input.existingActual, reason: null } : captureWeeklyActualEvidence(input);
  if (capture.state === "WAITING_FOR_FINALITY") return base(input, "WAITING_FOR_FINALITY", capture.reason);
  if (capture.state === "CONFLICT" || !capture.artifact) return base(input, "CONFLICT", capture.reason);
  const actual = capture.artifact;
  let writePerformed = false;
  if (!input.existingActual) {
    const actualRecordValue = buildDurableEvidenceRecord({ season: input.season, week: input.week, kind: "ACTUAL", source: "SLEEPER", sourceChecksum: actual.actualInputChecksum, capturedAt: input.now.toISOString(), payload: actual });
    const actualRecord = await input.evidenceStore.create(durableEvidencePath(input.season, input.week, "ACTUAL", actual.actualInputChecksum), actualRecordValue);
    writePerformed = actualRecord === "CREATED";
  }
  if (actual.calibrationEligibility === "INELIGIBLE_PATH_C") return base(input, "ACTUALS_CAPTURED", "Actual evidence is historical-only and calibration-ineligible.", { actual, writePerformed });
  if (hasUnresolvedTie(input.matchups)) return base(input, "CONFLICT", "Finalized evidence contains an unresolved tied matchup; commissioner review is required before residuals or recap draft generation.", { actual, writePerformed });
  const paired = pairWeeklyProjectionAndActual(input.projection, actual);
  if (paired.state === "NO_PAIR" || paired.state === "INELIGIBLE_PATH_C") return base(input, "NO_PAIR", paired.reason, { actual, writePerformed });
  if (paired.state === "CONFLICT" || !paired.residual) return base(input, "CONFLICT", paired.reason, { actual, writePerformed });
  const residual = paired.residual;
  const residualWrite = await persistResidualEvidence(input.evidenceStore, residual, input.now.toISOString());
  writePerformed ||= residualWrite.writePerformed;
  const readiness = input.existingReadiness ?? buildCalibrationReadiness([...(input.existingResiduals ?? []), residual], input.now.toISOString());
  const readinessWrite = await input.readinessStore.create(`river-city/season-simulator/calibration/readiness-${readiness.checksum}.json`, readiness);
  writePerformed ||= readinessWrite === "CREATED";
  const draft = input.existingDraft ?? buildWeeklyRecapDraft({ season: input.season, week: input.week, matchups: recapMatchups(input.matchups), nextWeekSchedule: input.nextWeekSchedule, sourceEvidenceChecksums: [actual.actualInputChecksum, residual.diagnostics.checksum] });
  const draftWrite = await input.draftStore.create(`river-city/season-simulator/recaps/${input.season}/week-${String(input.week).padStart(2, "0")}-${draft.draftChecksum}.json`, draft);
  writePerformed ||= draftWrite === "CREATED";
  return base(input, "RECAP_DRAFT_READY", null, { actual, residual, readiness, draft, writePerformed });
}
