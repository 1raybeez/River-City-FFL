import type {
  OwnerFinancialSeason,
  PayoutOwnerAlias,
  PayoutOwnerWorkbookTotal,
  PayoutHistorySourceSheet,
} from "@/lib/finance/payoutHistoryTypes";

export const PAID_EARNINGS_SOURCE_SHEET: PayoutHistorySourceSheet =
  "Paid_Earnings";

export const RAY_JEFFREY_PAYOUT_ATTRIBUTION_NOTE =
  "Prestigio Mundial financials are recorded under Ray Long in the source workbook; franchise history is shared with Jeffrey Hudgins.";

export const JORDAN_SHAKE_N_BAKERS_PAYOUT_ATTRIBUTION_NOTE =
  "The Shake-N-Bakers financial attribution remains under Jordan Maslyn in the source workbook.";

export const LANDON_SPECIAL_BROWNIES_PAYOUT_ATTRIBUTION_NOTE =
  "Landon Elliott's rows represent his historical Special Brownies earnings and remain separate from Jordan Maslyn.";

export const payoutOwnerAliases = [
  { sourceLabel: "Tommy", ownerId: "tommy-moore" },
  { sourceLabel: "David", ownerId: "david-besedich" },
  { sourceLabel: "Jordan", ownerId: "jordan-maslyn" },
  { sourceLabel: "JD", ownerId: "jd-dowling" },
  { sourceLabel: "Aaron", ownerId: "aaron-hawkins" },
  { sourceLabel: "Rashad", ownerId: "rashad-gresham" },
  { sourceLabel: "Brian", ownerId: "brian-stevens" },
  { sourceLabel: "Wade", ownerId: "wade-cameron" },
  { sourceLabel: "Travis", ownerId: "travis-miller" },
  { sourceLabel: "Ray", ownerId: "ray-long" },
  { sourceLabel: "Doug", ownerId: "doug-fordham" },
  { sourceLabel: "Stan", ownerId: "stan-schoppe" },
  { sourceLabel: "Billy", ownerId: "billy-biddle" },
  { sourceLabel: "Landon", ownerId: "landon-elliott" },
  { sourceLabel: "Adam", ownerId: "adam-lind" },
  { sourceLabel: "Patrick", ownerId: "patrick-leahey" },
  { sourceLabel: "Chris", ownerId: "chris-barras" },
  { sourceLabel: "Ricky", ownerId: "ricky-taylor" },
  { sourceLabel: "Garet", ownerId: "garet-prior" },
  { sourceLabel: "Minnix", ownerId: "james-minnix" },
  { sourceLabel: "Gordie", ownerId: "gordie-gahagan" },
  { sourceLabel: "Bryan", ownerId: "bryan-doane" },
] satisfies PayoutOwnerAlias[];

interface PaidEarningsSeasonSourceRow {
  season: number;
  paid: number[];
  won: number[];
}

const paidEarningsSeasonSourceRows = [
  {
    season: 2025,
    paid: [50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    won: [10, 30, 10, 30, 0, 10, 10, 0, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  {
    season: 2024,
    paid: [50, 50, 50, 50, 0, 50, 50, 50, 50, 50, 50, 0, 50, 50, 0, 0, 0, 0, 0, 0, 0, 0],
    won: [20, 80, 250, 10, 0, 0, 0, 110, 0, 0, 125, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  {
    season: 2023,
    paid: [50, 50, 50, 50, 0, 50, 50, 50, 50, 50, 50, 0, 50, 50, 0, 0, 0, 0, 0, 0, 0, 0],
    won: [240, 10, 0, 80, 0, 0, 110, 0, 40, 105, 0, 0, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  {
    season: 2022,
    paid: [50, 50, 50, 50, 0, 50, 50, 50, 50, 50, 50, 0, 50, 50, 0, 0, 0, 0, 0, 0, 0, 0],
    won: [195, 215, 0, 0, 0, 0, 50, 0, 0, 35, 20, 0, 45, 10, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  {
    season: 2021,
    paid: [50, 50, 50, 50, 0, 0, 50, 50, 50, 50, 50, 0, 50, 50, 50, 0, 0, 0, 0, 0, 0, 0],
    won: [10, 230, 10, 110, 0, 0, 20, 25, 0, 20, 10, 0, 35, 20, 105, 0, 0, 0, 0, 0, 0, 0],
  },
  {
    season: 2020,
    paid: [50, 50, 50, 50, 0, 0, 50, 50, 50, 50, 50, 0, 50, 50, 50, 0, 0, 0, 0, 0, 0, 0],
    won: [0, 105, 45, 240, 0, 0, 45, 10, 0, 40, 0, 0, 0, 100, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  {
    season: 2019,
    paid: [50, 50, 50, 50, 0, 0, 50, 50, 50, 50, 50, 0, 50, 50, 0, 50, 0, 0, 0, 0, 0, 0],
    won: [15, 0, 0, 0, 0, 0, 110, 145, 65, 30, 0, 0, 15, 0, 0, 65, 0, 0, 0, 0, 0, 0],
  },
  {
    season: 2018,
    paid: [50, 0, 50, 50, 0, 0, 50, 50, 50, 50, 0, 0, 50, 50, 0, 50, 50, 50, 0, 0, 0, 0],
    won: [115, 0, 95, 15, 0, 0, 130, 45, 0, 50, 0, 0, 15, 100, 0, 15, 15, 0, 0, 0, 0, 0],
  },
  {
    season: 2017,
    paid: [50, 0, 50, 50, 0, 0, 50, 50, 50, 50, 0, 0, 0, 50, 0, 0, 50, 0, 50, 50, 0, 0],
    won: [210, 0, 15, 150, 0, 0, 15, 15, 65, 15, 0, 0, 0, 0, 0, 0, 15, 0, 15, 65, 0, 0],
  },
  {
    season: 2016,
    paid: [50, 0, 0, 50, 0, 0, 50, 50, 50, 50, 50, 0, 0, 50, 0, 0, 50, 0, 50, 50, 50, 50],
    won: [245, 0, 0, 0, 0, 0, 0, 30, 15, 65, 0, 0, 0, 15, 0, 0, 0, 0, 0, 180, 50, 0],
  },
] satisfies PaidEarningsSeasonSourceRow[];

function getAttributionNotes(ownerId: string) {
  if (ownerId === "ray-long") {
    return [RAY_JEFFREY_PAYOUT_ATTRIBUTION_NOTE];
  }

  if (ownerId === "jordan-maslyn") {
    return [JORDAN_SHAKE_N_BAKERS_PAYOUT_ATTRIBUTION_NOTE];
  }

  if (ownerId === "landon-elliott") {
    return [LANDON_SPECIAL_BROWNIES_PAYOUT_ATTRIBUTION_NOTE];
  }

  return undefined;
}

export const ownerFinancialSeasons: OwnerFinancialSeason[] =
  paidEarningsSeasonSourceRows.flatMap((seasonRow) =>
    payoutOwnerAliases.map((alias, ownerIndex) => {
      const duesPaid = seasonRow.paid[ownerIndex] ?? 0;
      const grossWon = seasonRow.won[ownerIndex] ?? 0;
      const notes = getAttributionNotes(alias.ownerId);

      return {
        season: seasonRow.season,
        ownerId: alias.ownerId,
        sourceLabel: alias.sourceLabel,
        duesPaid,
        grossWon,
        netEarnings: grossWon - duesPaid,
        sourceSheet: PAID_EARNINGS_SOURCE_SHEET,
        ...(notes ? { notes } : {}),
      };
    })
  );

export const paidEarningsWorkbookTotals = [
  { sourceLabel: "Tommy", ownerId: "tommy-moore", totalDuesPaid: 500, totalGrossWon: 1060, totalNetEarnings: 560 },
  { sourceLabel: "David", ownerId: "david-besedich", totalDuesPaid: 350, totalGrossWon: 670, totalNetEarnings: 320 },
  { sourceLabel: "Jordan", ownerId: "jordan-maslyn", totalDuesPaid: 450, totalGrossWon: 425, totalNetEarnings: -25 },
  { sourceLabel: "JD", ownerId: "jd-dowling", totalDuesPaid: 500, totalGrossWon: 635, totalNetEarnings: 135 },
  { sourceLabel: "Aaron", ownerId: "aaron-hawkins", totalDuesPaid: 50, totalGrossWon: 0, totalNetEarnings: -50 },
  { sourceLabel: "Rashad", ownerId: "rashad-gresham", totalDuesPaid: 200, totalGrossWon: 10, totalNetEarnings: -190 },
  { sourceLabel: "Brian", ownerId: "brian-stevens", totalDuesPaid: 500, totalGrossWon: 490, totalNetEarnings: -10 },
  { sourceLabel: "Wade", ownerId: "wade-cameron", totalDuesPaid: 500, totalGrossWon: 380, totalNetEarnings: -120 },
  { sourceLabel: "Travis", ownerId: "travis-miller", totalDuesPaid: 500, totalGrossWon: 195, totalNetEarnings: -305 },
  { sourceLabel: "Ray", ownerId: "ray-long", totalDuesPaid: 500, totalGrossWon: 360, totalNetEarnings: -140 },
  { sourceLabel: "Doug", ownerId: "doug-fordham", totalDuesPaid: 400, totalGrossWon: 155, totalNetEarnings: -245 },
  { sourceLabel: "Stan", ownerId: "stan-schoppe", totalDuesPaid: 50, totalGrossWon: 0, totalNetEarnings: -50 },
  { sourceLabel: "Billy", ownerId: "billy-biddle", totalDuesPaid: 350, totalGrossWon: 120, totalNetEarnings: -230 },
  { sourceLabel: "Landon", ownerId: "landon-elliott", totalDuesPaid: 450, totalGrossWon: 245, totalNetEarnings: -205 },
  { sourceLabel: "Adam", ownerId: "adam-lind", totalDuesPaid: 100, totalGrossWon: 105, totalNetEarnings: 5 },
  { sourceLabel: "Patrick", ownerId: "patrick-leahey", totalDuesPaid: 100, totalGrossWon: 80, totalNetEarnings: -20 },
  { sourceLabel: "Chris", ownerId: "chris-barras", totalDuesPaid: 150, totalGrossWon: 30, totalNetEarnings: -120 },
  { sourceLabel: "Ricky", ownerId: "ricky-taylor", totalDuesPaid: 50, totalGrossWon: 0, totalNetEarnings: -50 },
  { sourceLabel: "Garet", ownerId: "garet-prior", totalDuesPaid: 100, totalGrossWon: 15, totalNetEarnings: -85 },
  { sourceLabel: "Minnix", ownerId: "james-minnix", totalDuesPaid: 100, totalGrossWon: 245, totalNetEarnings: 145 },
  { sourceLabel: "Gordie", ownerId: "gordie-gahagan", totalDuesPaid: 50, totalGrossWon: 50, totalNetEarnings: 0 },
  { sourceLabel: "Bryan", ownerId: "bryan-doane", totalDuesPaid: 50, totalGrossWon: 0, totalNetEarnings: -50 },
] satisfies PayoutOwnerWorkbookTotal[];
