import "server-only";

import { firestore } from "@/lib/firebaseAdmin";
import {
  LEGACY_LEGISLATIVE_SESSION_CONFIG,
  type LegislativeSessionConfig,
  type LegislativeSessionPhase,
} from "@/lib/legislativeSession";

const SESSION_CONFIG_PATH = "league_settings/legislative_session";

function readString(value: unknown) {
  if (typeof value === "string" && value.trim()) return value;
  const timestamp = value as { toDate?: () => Date } | null;
  if (timestamp && typeof timestamp.toDate === "function") {
    return timestamp.toDate().toISOString();
  }
  return null;
}

function readPhase(value: unknown): LegislativeSessionPhase | null {
  return value === "COLLECTING" ||
    value === "ANNUAL_VOTING" ||
    value === "INTERIM" ||
    value === "CLOSED"
    ? value
    : null;
}

export async function readLegislativeSessionConfig(): Promise<LegislativeSessionConfig> {
  const snapshot = await firestore.doc(SESSION_CONFIG_PATH).get();
  if (!snapshot.exists) return LEGACY_LEGISLATIVE_SESSION_CONFIG;

  const data = snapshot.data() ?? {};
  const sessionYear = typeof data.sessionYear === "number" ? data.sessionYear : null;
  const meetingDate = readString(data.meetingDate);
  const annualVotingOpensAt = readString(data.annualVotingOpensAt);
  const annualVotingClosesAt = readString(data.annualVotingClosesAt);

  // A malformed or incomplete persisted document must not silently replace the
  // known compatibility settings with invented dates.
  if (!sessionYear || !meetingDate || !annualVotingOpensAt || !annualVotingClosesAt) {
    return LEGACY_LEGISLATIVE_SESSION_CONFIG;
  }

  return {
    sessionYear,
    phase: readPhase(data.phase),
    meetingDate,
    annualVotingOpensAt,
    annualVotingClosesAt,
    interimVotingOpensAt: readString(data.interimVotingOpensAt),
    interimVotingClosesAt: readString(data.interimVotingClosesAt),
    cycleBoundaryDate: readString(data.cycleBoundaryDate),
    updatedAt: readString(data.updatedAt),
    updatedBy: typeof data.updatedBy === "string" ? data.updatedBy : null,
    source: "persisted",
  };
}

export const LEGISLATIVE_SESSION_CONFIG_PATH = SESSION_CONFIG_PATH;
