export const LEGISLATIVE_ELIGIBLE_VOTE_COUNT = 12;

export type LegislativeSessionPhase =
  | "COLLECTING"
  | "ANNUAL_VOTING"
  | "INTERIM"
  | "CLOSED";

export type LegislativeSessionSource = "persisted" | "legacy-fallback";
export type LegislativeProposalSessionType = "ANNUAL" | "INTERIM";

export interface LegislativeSessionConfig {
  sessionYear: number;
  phase?: LegislativeSessionPhase | null;
  meetingDate: string;
  annualVotingOpensAt: string;
  annualVotingClosesAt: string;
  interimVotingOpensAt?: string | null;
  interimVotingClosesAt?: string | null;
  cycleBoundaryDate?: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
  source: LegislativeSessionSource;
}

// This is the explicitly named compatibility path for the existing 2027
// deployment. It is not a persisted setting and must not be treated as one.
export const LEGACY_LEGISLATIVE_SESSION_CONFIG: LegislativeSessionConfig = {
  sessionYear: 2027,
  phase: null,
  meetingDate: "2027-03-21T00:30:00.000Z",
  annualVotingOpensAt: "2027-03-21T00:30:00.000Z",
  annualVotingClosesAt: "2027-03-28T00:30:00.000Z",
  interimVotingOpensAt: null,
  interimVotingClosesAt: null,
  cycleBoundaryDate: null,
  updatedAt: null,
  updatedBy: null,
  source: "legacy-fallback",
};

function timestamp(value: string | null | undefined) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function resolveLegislativeSessionPhase(
  config: LegislativeSessionConfig,
  now = new Date()
): LegislativeSessionPhase {
  if (config.phase) return config.phase;

  const currentTime = now.getTime();
  const cycleBoundary = timestamp(config.cycleBoundaryDate);
  if (cycleBoundary !== null && currentTime >= cycleBoundary) return "CLOSED";

  const annualOpen = timestamp(config.annualVotingOpensAt);
  const annualClose = timestamp(config.annualVotingClosesAt);
  if (annualOpen !== null && currentTime < annualOpen) return "COLLECTING";
  if (
    annualOpen !== null &&
    annualClose !== null &&
    currentTime <= annualClose
  ) {
    return "ANNUAL_VOTING";
  }

  return "INTERIM";
}

export function isLegislativeVotingOpen(
  config: LegislativeSessionConfig,
  now = new Date(),
  isOverrideOpen = false
) {
  if (isOverrideOpen) return true;
  const currentTime = now.getTime();
  const windows = [
    [timestamp(config.annualVotingOpensAt), timestamp(config.annualVotingClosesAt)],
    [timestamp(config.interimVotingOpensAt), timestamp(config.interimVotingClosesAt)],
  ];
  return windows.some(
    ([opensAt, closesAt]) =>
      opensAt !== null && closesAt !== null && currentTime >= opensAt && currentTime <= closesAt
  );
}

export function proposalSessionTypeForNow(
  config: LegislativeSessionConfig,
  now = new Date()
): LegislativeProposalSessionType {
  return resolveLegislativeSessionPhase(config, now) === "INTERIM"
    ? "INTERIM"
    : "ANNUAL";
}

export type LegislativeResult = "passed" | "failed" | "tied";

export function resolveLegislativeResult(yesVotes: number, noVotes: number): LegislativeResult {
  if (yesVotes === noVotes) return "tied";
  return yesVotes > noVotes ? "passed" : "failed";
}

export function hasAllEligibleVotes(yesVotes: number, noVotes: number) {
  return yesVotes + noVotes >= LEGISLATIVE_ELIGIBLE_VOTE_COUNT;
}
