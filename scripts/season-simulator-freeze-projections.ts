import fs from "node:fs/promises";
import path from "node:path";
import { buildProjectionEvidenceArtifact } from "../lib/seasonSimulator/evidenceCollection";
import { checksum } from "../lib/seasonSimulator/evidenceSnapshot";
import { evaluateFreezeWindow } from "../lib/seasonSimulator/freezeWindow";
import { buildProjectionCandidate } from "../lib/seasonSimulator/projectionCandidateService";

const CALIBRATION_DIRECTORY = path.join(process.cwd(), ".local-calibration");

export type FreezeOptions = { season: number; week: number; dryRun: boolean; now: Date; targetDirectory: string; fetchImpl?: typeof fetch; sleep?: (milliseconds: number) => Promise<void> };
export type FreezeSummary = { season: number; week: number; source: "FANTASYPROS"; sourceAsOf: string | null; normalizedProjectionCount: number; franchisesFound: number; expectedScoresAvailable: number; unresolvedIdentities: number; unavailableTeams: string[]; unavailableReasons: Record<string, string>; checksumCandidate: string; artifactTargetPath: string; writePerformed: boolean; officialFreezeEligible: boolean; eligibilityReason: string | null; beforeFirstKickoff: boolean };

function usage(): never {
  throw new Error("Usage: npm run season-simulator:freeze-projections -- --season 2026 --week 2 [--dry-run]");
}

export function parseFreezeArgs(args: readonly string[], now = new Date(), targetDirectory = CALIBRATION_DIRECTORY): FreezeOptions {
  const value = (flag: string) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined; };
  const season = Number(value("--season"));
  const week = Number(value("--week"));
  if (!Number.isInteger(season) || !Number.isInteger(week) || season !== 2026 || week !== 2) usage();
  return { season, week, dryRun: args.includes("--dry-run"), now, targetDirectory };
}

export function validateFreezeWindow(options: Pick<FreezeOptions, "season" | "week" | "now">): boolean {
  return evaluateFreezeWindow(options.season, options.week, options.now).eligible;
}

function approvedArtifact(value: unknown, season: number, week: number): boolean {
  if (!value || typeof value !== "object") return false;
  const artifact = value as Record<string, unknown>;
  return artifact.season === season && artifact.week === week && artifact.capturePurpose === "CALIBRATION_BASELINE" && artifact.capturedWithinApprovedWindow === true;
}

async function existingAuthoritativeArtifactCount(directory: string, season: number, week: number): Promise<number> {
  const files = (await fs.readdir(directory).catch(() => [] as string[])).filter(file => file.startsWith(`${season}-week-${String(week).padStart(2, "0")}-projection-evidence-`) && file.endsWith(".json"));
  let count = 0;
  for (const file of files) {
    try {
      if (approvedArtifact(JSON.parse(await fs.readFile(path.join(directory, file), "utf8")), season, week)) count += 1;
    } catch {
      // A malformed diagnostic cannot become an authoritative baseline.
    }
  }
  return count;
}

export async function runFreeze(options: FreezeOptions): Promise<FreezeSummary> {
  const windowDecision = evaluateFreezeWindow(options.season, options.week, options.now);
  if (!windowDecision.eligible && !options.dryRun) throw new Error(`REFUSED: ${windowDecision.reason}.`);
  const env = await fs.readFile(path.join(process.cwd(), ".env.local"), "utf8");
  const keyLine = env.split(/\r?\n/).find(line => /^\s*FANTASYPROS_API_KEY\s*=/.test(line));
  if (!keyLine) throw new Error("REFUSED: FANTASYPROS_API_KEY is missing.");
  const apiKey = keyLine.replace(/^\s*FANTASYPROS_API_KEY\s*=\s*/, "").trim().replace(/^"|"$/g, "");
  const candidate = await buildProjectionCandidate({ season: options.season, week: options.week, now: options.now, apiKey, fetchImpl: options.fetchImpl, sleep: options.sleep, freezeWindow: windowDecision.window && windowDecision.eligible ? { windowOpen: windowDecision.window.windowOpen, firstKickoff: windowDecision.window.firstKickoff } : undefined });
  let artifact = candidate.artifact;
  if (windowDecision.window && windowDecision.eligible) {
    const content = Object.fromEntries(Object.entries(artifact).filter(([key]) => key !== "schemaVersion" && key !== "checksum"));
    artifact = buildProjectionEvidenceArtifact({ ...content, freezeWindowOpen: windowDecision.window.windowOpen, firstKickoff: windowDecision.window.firstKickoff } as never);
  }
  const rosters = { length: candidate.franchisesFound };
  const franchiseResults = { expectedScoresAvailable: candidate.expectedScoresAvailable, unavailableTeams: candidate.unavailableTeams, unavailableReasons: candidate.unavailableReasons };
  const authoritativeCount = await existingAuthoritativeArtifactCount(options.targetDirectory, options.season, options.week);
  if (authoritativeCount > 0) throw new Error("REFUSED: an authoritative calibration baseline already exists for this season/week.");
  const targetPath = path.join(options.targetDirectory, `${options.season}-week-${String(options.week).padStart(2, "0")}-projection-evidence-${artifact.checksum.slice(0, 16)}.json`);
  const unavailableTeams = franchiseResults.unavailableTeams;
  const expectedScoresAvailable = franchiseResults.expectedScoresAvailable;
  const selectedIdentityMisses = candidate.unresolvedIdentities;
  const checksumValid = artifact.checksum === checksum(Object.fromEntries(Object.entries(artifact).filter(([key]) => key !== "checksum")));
  const officialEligibilityFailure = !windowDecision.eligible ? windowDecision.reason : rosters.length !== 12 ? "EXPECTED_12_FRANCHISES" : expectedScoresAvailable !== 12 ? "EXPECTED_12_AVAILABLE_SCORES" : unavailableTeams.length > 0 ? "UNAVAILABLE_FRANCHISE" : selectedIdentityMisses > 0 ? "SELECTED_IDENTITY_MISS" : !checksumValid ? "CHECKSUM_INVALID" : authoritativeCount > 0 ? "AUTHORITATIVE_BASELINE_EXISTS" : null;
  const officialFreezeEligible = officialEligibilityFailure === null;
  const summary: FreezeSummary = { season: options.season, week: options.week, source: "FANTASYPROS", sourceAsOf: candidate.sourceAsOf, normalizedProjectionCount: candidate.normalizedProjectionCount, franchisesFound: rosters.length, expectedScoresAvailable, unresolvedIdentities: selectedIdentityMisses, unavailableTeams, unavailableReasons: franchiseResults.unavailableReasons, checksumCandidate: artifact.checksum, artifactTargetPath: targetPath, writePerformed: false, officialFreezeEligible, eligibilityReason: officialEligibilityFailure, beforeFirstKickoff: windowDecision.window ? options.now.getTime() < Date.parse(windowDecision.window.firstKickoff) : false };
  if (!options.dryRun && !officialFreezeEligible) throw new Error(`REFUSED: ${officialEligibilityFailure}.`);
  if (!options.dryRun && officialFreezeEligible) {
    await fs.mkdir(options.targetDirectory, { recursive: true });
    const handle = await fs.open(targetPath, "wx");
    try { await handle.writeFile(JSON.stringify(artifact, null, 2) + "\n", "utf8"); } finally { await handle.close(); }
    summary.writePerformed = true;
  }
  return summary;
}

if (process.argv[1]?.endsWith("season-simulator-freeze-projections.ts")) {
  runFreeze(parseFreezeArgs(process.argv.slice(2))).then(summary => { console.log(JSON.stringify({ ...summary, label: "COMMISSIONER CALIBRATION DIAGNOSTIC", publication: "NOT OWNER-PUBLISHED", writePerformed: summary.writePerformed ? "YES" : "NO", officialFreezeEligible: summary.officialFreezeEligible ? "YES" : "NO", reason: summary.eligibilityReason }, null, 2)); }).catch(error => { console.error(error instanceof Error ? error.message : "Freeze refused"); process.exitCode = 1; });
}
