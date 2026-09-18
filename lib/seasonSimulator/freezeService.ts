import { checksum } from "@/lib/seasonSimulator/evidenceSnapshot";
import { durableEvidencePath, buildDurableEvidenceRecord, type ImmutableEvidenceStore } from "@/lib/seasonSimulator/durableEvidence";
import { resolveFreezeWindow, type FreezePolicy } from "@/lib/seasonSimulator/freezeWindowPolicy";
import type { NflKickoffSchedule } from "@/lib/nflKickoffSchedule";
import type { ProjectionEvidenceArtifact } from "@/lib/seasonSimulator/evidenceCollection";

export type FreezeServiceState = "WAITING" | "ELIGIBLE" | "FROZEN" | "ALREADY_FROZEN" | "MISSED" | "PROVIDER_UNAVAILABLE" | "FREEZE_COVERAGE_INCOMPLETE" | "CONFLICT" | "ERROR";
export type FreezeServiceResult = Readonly<{ state: FreezeServiceState; season: number; week: number; firstKickoff: string | null; windowOpen: string | null; objectPath: string | null; sourceChecksum: string | null; writePerformed: boolean; reason: string | null }>;
export type FreezeServiceDependencies = Readonly<{ schedule: NflKickoffSchedule; evidence: ImmutableEvidenceStore; hasAuthoritativeBaseline: () => Promise<boolean>; buildCandidate: (window?: { windowOpen: string; firstKickoff: string }) => Promise<ProjectionEvidenceArtifact>; policy?: FreezePolicy; now?: Date }>;

function result(season: number, week: number, values: Partial<FreezeServiceResult>): FreezeServiceResult { return { state: "ERROR", season, week, firstKickoff: null, windowOpen: null, objectPath: null, sourceChecksum: null, writePerformed: false, reason: null, ...values }; }
function validArtifact(artifact: ProjectionEvidenceArtifact, season: number, week: number) {
  const base = Object.fromEntries(Object.entries(artifact).filter(([key]) => key !== "checksum"));
  return artifact.schemaVersion === "river-city-projection-evidence-v1" && artifact.season === season && artifact.week === week && artifact.capturePurpose === "CALIBRATION_BASELINE" && artifact.capturedWithinApprovedWindow === true && Object.keys(artifact.expectedTeamScores).length === 12 && artifact.projections.length > 0 && artifact.checksum === checksum(base);
}

export async function freezeWeeklyProjections({ season, week, schedule, evidence, hasAuthoritativeBaseline, buildCandidate, policy, now = new Date() }: FreezeServiceDependencies & { season: number; week: number }): Promise<FreezeServiceResult> {
  if (await hasAuthoritativeBaseline()) return result(season, week, { state: "ALREADY_FROZEN", reason: "An authoritative projection baseline already exists; no provider refetch is permitted." });
  let window: Awaited<ReturnType<typeof resolveFreezeWindow>>;
  try { window = await resolveFreezeWindow(schedule, season, week, policy); } catch (error) { return result(season, week, { state: "PROVIDER_UNAVAILABLE", reason: error instanceof Error ? error.message : "NFL schedule unavailable." }); }
  const firstKickoff = Date.parse(window.firstKickoff); const open = Date.parse(window.windowOpen); const nowMs = now.getTime();
  if (nowMs < open) return result(season, week, { state: "WAITING", firstKickoff: window.firstKickoff, windowOpen: window.windowOpen, reason: "Freeze window is not open." });
  if (nowMs >= firstKickoff) return result(season, week, { state: "MISSED", firstKickoff: window.firstKickoff, windowOpen: window.windowOpen, reason: "Freeze window closed at first kickoff; no baseline will be manufactured." });
  let artifact: ProjectionEvidenceArtifact;
  try { artifact = await buildCandidate({ windowOpen: window.windowOpen, firstKickoff: window.firstKickoff }); } catch (error) { return result(season, week, { state: "PROVIDER_UNAVAILABLE", firstKickoff: window.firstKickoff, windowOpen: window.windowOpen, reason: error instanceof Error ? error.message : "Projection provider unavailable." }); }
  if (!validArtifact(artifact, season, week)) return result(season, week, { state: "FREEZE_COVERAGE_INCOMPLETE", firstKickoff: window.firstKickoff, windowOpen: window.windowOpen, reason: "Projection artifact failed authoritative 12-team/checksum/freeze-window validation." });
  const sourceChecksum = artifact.checksum; const objectPath = durableEvidencePath(season, week, "PROJECTION", sourceChecksum);
  try {
    const record = buildDurableEvidenceRecord({ season, week, kind: "PROJECTION", source: "FANTASYPROS", sourceChecksum, capturedAt: now.toISOString(), payload: artifact });
    const writeResult = await evidence.create(objectPath, record);
    return result(season, week, { state: writeResult === "CREATED" ? "FROZEN" : "ALREADY_FROZEN", firstKickoff: window.firstKickoff, windowOpen: window.windowOpen, objectPath, sourceChecksum, writePerformed: writeResult === "CREATED", reason: writeResult === "CREATED" ? null : "Exact durable evidence already exists." });
  } catch (error) { return result(season, week, { state: "CONFLICT", firstKickoff: window.firstKickoff, windowOpen: window.windowOpen, objectPath, sourceChecksum, reason: error instanceof Error ? error.message : "Durable evidence conflict." }); }
}
