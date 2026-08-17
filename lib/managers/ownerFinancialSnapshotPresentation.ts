import type {
  FinancialCoverage,
  OwnerFinancialSummary,
} from "@/lib/history/financialHistory";

export type OwnerFinancialSnapshotState =
  | "recorded-winnings"
  | "activity-without-winnings"
  | "attributed-to-primary-owner"
  | "no-archived-source"
  | "no-financial-summary";

export type OwnerFinancialSnapshotPresentation = Readonly<{
  ownerId: string;
  state: OwnerFinancialSnapshotState;
  title: string;
  recordedWinnings: number | null;
  recordedWinningsLabel: string | null;
  cashPaid: number | null;
  cashPaidLabel: string | null;
  activitySeasons: readonly number[];
  activityLabel: string | null;
  coverageStartSeason: 2016;
  coverageEndSeason: number;
  coverageLabel: string;
  statusMessage: string | null;
  attributionNote: string | null;
  scopeNote: string;
  financialHistoryHref: "/league-info/payouts";
}>;

type OwnerFinancialSnapshotInput = Readonly<{
  ownerId: string;
  ownerStatus: "active" | "retired" | "staff";
  careerFirstSeason: number | null;
  careerLatestSeason: number | null;
  summary: OwnerFinancialSummary | null;
  coverage: FinancialCoverage;
}>;

const ATTRIBUTION_NOTES: Readonly<Record<string, string>> = {
  "ray-long":
    "Official financial attribution for Prestigio Mundial is recorded through Ray.",
  "jeffrey-hudgins":
    "Prestigio Mundial financial payouts are recorded through primary financial owner Ray Long.",
  "jordan-maslyn":
    "Shake-N-Bakers financial attribution is recorded through Jordan beginning in 2025.",
  "landon-elliott":
    "2025 Shake-N-Bakers financial payouts are recorded through primary financial owner Jordan Maslyn.",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function activityLabel(seasons: readonly number[]) {
  if (seasons.length === 0) return null;
  return `${seasons.length} season${seasons.length === 1 ? "" : "s"} in the financial ledger`;
}

export function buildOwnerFinancialSnapshotPresentation(
  input: OwnerFinancialSnapshotInput
): OwnerFinancialSnapshotPresentation | null {
  if (input.ownerStatus === "staff") return null;

  const coverageLabel = `${input.coverage.firstSeason}–${input.coverage.latestSeason} reconciled records`;
  const base = {
    ownerId: input.ownerId,
    title: `Recorded Winnings (${input.coverage.firstSeason}–${input.coverage.latestSeason})`,
    coverageStartSeason: input.coverage.firstSeason,
    coverageEndSeason: input.coverage.latestSeason,
    coverageLabel,
    attributionNote: ATTRIBUTION_NOTES[input.ownerId] ?? null,
    scopeNote:
      "Official River City attribution only; private co-owner distributions are outside these records.",
    financialHistoryHref: "/league-info/payouts" as const,
  };

  if (!input.summary) {
    if (input.ownerId === "jeffrey-hudgins") {
      return {
        ...base,
        state: "attributed-to-primary-owner",
        recordedWinnings: null,
        recordedWinningsLabel: null,
        cashPaid: null,
        cashPaidLabel: null,
        activitySeasons: [],
        activityLabel: null,
        statusMessage:
          "No separate official owner total is recorded for Jeffrey during this coverage period.",
      };
    }

    const careerPredatesArchive =
      input.careerLatestSeason !== null &&
      input.careerLatestSeason < input.coverage.firstSeason;
    return {
      ...base,
      state: careerPredatesArchive
        ? "no-archived-source"
        : "no-financial-summary",
      recordedWinnings: null,
      recordedWinningsLabel: null,
      cashPaid: null,
      cashPaidLabel: null,
      activitySeasons: [],
      activityLabel: null,
      statusMessage: careerPredatesArchive
        ? "This owner's competitive seasons predate the archived financial source, which begins in 2016."
        : "No recorded winnings are available for this owner during the 2016–2025 financial coverage period.",
    };
  }

  const hasWinnings = input.summary.recordedWinnings > 0;
  return {
    ...base,
    state: hasWinnings
      ? "recorded-winnings"
      : "activity-without-winnings",
    recordedWinnings: input.summary.recordedWinnings,
    recordedWinningsLabel: hasWinnings
      ? formatCurrency(input.summary.recordedWinnings)
      : null,
    cashPaid: input.summary.cashPaid,
    cashPaidLabel:
      input.summary.cashPaid !== input.summary.recordedWinnings
        ? `Cash paid: ${formatCurrency(input.summary.cashPaid)}`
        : null,
    activitySeasons: input.summary.seasons,
    activityLabel: activityLabel(input.summary.seasons),
    statusMessage: hasWinnings
      ? null
      : "No recorded winnings during the 2016–2025 financial coverage period.",
  };
}
