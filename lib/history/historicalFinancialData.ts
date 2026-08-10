export const HISTORICAL_FINANCIAL_SOURCE = {
  workbookPath:
    "data/source/historical/river-city-final-standings-and-payouts.xlsx",
  workbookFilename: "river-city-final-standings-and-payouts.xlsx",
  workbookSha256:
    "a042c3bba1789f2b39a5c36d3b51d494a1dc5b5074513162a754c54b692e288f",
} as const;

export type FinancialTransactionType = "dues" | "winnings" | "expense";

export type FinancialTransactionCategory =
  | "dues"
  | "weekly-prize"
  | "weekly-prize-rollover"
  | "fourth-place"
  | "third-place"
  | "runner-up"
  | "champion"
  | "loser-bracket-winner"
  | "division-winner"
  | "trophy-nameplate-expense"
  | "food-expense"
  | "championship-ring-expense";

export type FinancialPaymentState =
  | "paid"
  | "offset"
  | "forfeited-rolled"
  | "expense-paid";

export type FinancialFundingSource = "dues" | "separate" | null;
export type FinancialResolutionState = "explicit" | "commissioner-ruling";

export type HistoricalFinancialTransaction = {
  readonly transactionKey: string;
  readonly season: number;
  readonly transactionType: FinancialTransactionType;
  readonly category: FinancialTransactionCategory;
  readonly amount: number;
  readonly duesAssessedAmount: number;
  readonly duesPaidAmount: number;
  readonly recordedWinningsAmount: number;
  readonly cashPaidAmount: number;
  readonly outstandingAmount: number;
  readonly forfeitedRolledAmount: number;
  readonly financialOwnerId: string | null;
  readonly originatingFinancialOwnerId: string | null;
  readonly franchiseId: string | null;
  readonly rawOwnerLabel: string | null;
  readonly rawTeamLabel: string | null;
  readonly paymentState: FinancialPaymentState;
  readonly fundingSource: FinancialFundingSource;
  readonly sourceWorkbook: string;
  readonly sourceWorkbookSha256: string;
  readonly sourceSheet: string;
  readonly sourceCellRange: string;
  readonly description: string;
  readonly notes: readonly string[];
  readonly resolutionState: FinancialResolutionState;
};

type OwnerIdentity = {
  ownerId: string;
  franchiseId: string;
};

const OWNER_IDENTITIES: Readonly<Record<string, OwnerIdentity>> = {
  Aaron: { ownerId: "aaron-hawkins", franchiseId: "hawkins-heroes" },
  Adam: { ownerId: "adam-lind", franchiseId: "hotub-jellyfish" },
  Billy: { ownerId: "billy-biddle", franchiseId: "brilly" },
  Brian: { ownerId: "brian-stevens", franchiseId: "buckeye-nation" },
  Bryan: { ownerId: "bryan-doane", franchiseId: "drinkin-irish" },
  Chris: { ownerId: "chris-barras", franchiseId: "receding-zuerlein" },
  Dave: { ownerId: "david-besedich", franchiseId: "the-bearded-one" },
  David: { ownerId: "david-besedich", franchiseId: "the-bearded-one" },
  Doug: { ownerId: "doug-fordham", franchiseId: "hall-pass" },
  Garet: { ownerId: "garet-prior", franchiseId: "the-land-of-cleve" },
  Gordie: { ownerId: "gordie-gahagan", franchiseId: "freakshow-freaks" },
  JD: { ownerId: "jd-dowling", franchiseId: "the-art-of-war" },
  Jordan: { ownerId: "jordan-maslyn", franchiseId: "shake-n-bakers" },
  Landon: { ownerId: "landon-elliott", franchiseId: "special-brownies" },
  Minnix: {
    ownerId: "james-minnix",
    franchiseId: "hyde-the-russell-sprouts",
  },
  Patrick: { ownerId: "patrick-leahey", franchiseId: "deebow-and-arrow" },
  Rashad: {
    ownerId: "rashad-gresham",
    franchiseId: "the-gresham-empire",
  },
  "Ray/Jeffrey": {
    ownerId: "ray-long",
    franchiseId: "prestigio-mundial",
  },
  Ray: { ownerId: "ray-long", franchiseId: "prestigio-mundial" },
  Ricky: { ownerId: "ricky-taylor", franchiseId: "ricky-crickets" },
  Stan: { ownerId: "stan-schoppe", franchiseId: "tax-season" },
  Tommy: { ownerId: "tommy-moore", franchiseId: "the-shepherd" },
  Travis: { ownerId: "travis-miller", franchiseId: "kissed-by-a-freckle" },
  Wade: { ownerId: "wade-cameron", franchiseId: "the-wildcard" },
};

type DuesSeason = {
  season: number;
  sheet: string;
  labels: readonly string[];
  sourceColumn: string;
  firstRow: number;
};

const DUES_SEASONS: readonly DuesSeason[] = [
  {
    season: 2016,
    sheet: "2016_Payouts",
    sourceColumn: "H",
    firstRow: 3,
    labels: [
      "Tommy",
      "Chris",
      "Gordie",
      "JD",
      "Garet",
      "Bryan",
      "Brian",
      "Wade",
      "Travis",
      "Ray",
      "Minnix",
      "Landon",
    ],
  },
  {
    season: 2017,
    sheet: "2017_Payouts",
    sourceColumn: "S",
    firstRow: 2,
    labels: [
      "Tommy",
      "Chris",
      "Jordan",
      "JD",
      "Garet",
      "Patrick",
      "Brian",
      "Wade",
      "Travis",
      "Ray",
      "Minnix",
      "Landon",
    ],
  },
  {
    season: 2018,
    sheet: "2018_Payouts",
    sourceColumn: "S",
    firstRow: 3,
    labels: [
      "Tommy",
      "Chris",
      "Jordan",
      "JD",
      "Billy",
      "Patrick",
      "Brian",
      "Wade",
      "Travis",
      "Ray",
      "Ricky",
      "Landon",
    ],
  },
  {
    season: 2019,
    sheet: "2019_Payouts",
    sourceColumn: "S",
    firstRow: 3,
    labels: [
      "Tommy",
      "David",
      "Jordan",
      "JD",
      "Billy",
      "Patrick",
      "Brian",
      "Wade",
      "Travis",
      "Ray/Jeffrey",
      "Doug",
      "Landon",
    ],
  },
  ...[2020, 2021].map((season) => ({
    season,
    sheet: `${season}_Payouts`,
    sourceColumn: "U",
    firstRow: 2,
    labels: [
      "Tommy",
      "David",
      "Jordan",
      "JD",
      "Billy",
      "Adam",
      "Brian",
      "Wade",
      "Travis",
      "Ray/Jeffrey",
      "Doug",
      "Landon",
    ],
  })),
  ...[2022, 2023, 2024].map((season) => ({
    season,
    sheet: `${season}_Payouts`,
    sourceColumn: "U",
    firstRow: 2,
    labels: [
      "Tommy",
      "David",
      "Jordan",
      "JD",
      "Billy",
      "Rashad",
      "Brian",
      "Wade",
      "Travis",
      "Ray/Jeffrey",
      "Doug",
      "Landon",
    ],
  })),
  {
    season: 2025,
    sheet: "2025_Payouts",
    sourceColumn: "U",
    firstRow: 2,
    labels: [
      "Tommy",
      "David",
      "Jordan",
      "JD",
      "Aaron",
      "Rashad",
      "Brian",
      "Wade",
      "Travis",
      "Ray/Jeffrey",
      "Doug",
      "Stan",
    ],
  },
];

type WeeklyRow = readonly [
  week: number,
  rawOwnerLabel: string,
  state?: "paid" | "offset" | "rolled",
  note?: string,
];

type WeeklySeason = {
  season: number;
  sheet: string;
  rate: number;
  firstRow: number;
  rolloverOwnerLabel: string | null;
  rolloverIncludedInSettlement?: boolean;
  rows: readonly WeeklyRow[];
};

const WEEKLY_SEASONS: readonly WeeklySeason[] = [
  {
    season: 2016,
    sheet: "2016_Payouts",
    rate: 15,
    firstRow: 18,
    rolloverOwnerLabel: null,
    rows: [
      [1, "Tommy"], [2, "Landon"], [3, "Wade"], [4, "Minnix"],
      [5, "Wade"], [6, "Minnix"], [7, "Minnix"], [8, "Minnix"],
      [9, "Travis"], [10, "Tommy"], [11, "Ray"], [12, "Tommy"],
      [13, "Minnix"],
    ],
  },
  {
    season: 2017,
    sheet: "2017_Payouts",
    rate: 15,
    firstRow: 18,
    rolloverOwnerLabel: null,
    rows: [
      [1, "Tommy"], [2, "Chris"], [3, "JD"], [4, "Ray/Jeffrey"],
      [5, "Brian"], [6, "JD"], [7, "Wade"], [8, "Patrick"],
      [9, "Minnix"], [10, "JD"], [11, "Travis"], [12, "Garet"],
      [13, "Jordan"],
    ],
  },
  {
    season: 2018,
    sheet: "2018_Payouts",
    rate: 15,
    firstRow: 18,
    rolloverOwnerLabel: "Brian",
    rows: [
      [1, "JD"], [2, "Billy"], [3, "Chris"], [4, "Wade"],
      [5, "Jordan"], [6, "Jordan"], [7, "Jordan"], [8, "Patrick"],
      [9, "Tommy"], [10, "Brian", "rolled", "no write up/no payout"],
      [11, "Wade"], [12, "Brian", "rolled", "no write up/no payout"],
      [13, "Wade"],
    ],
  },
  {
    season: 2019,
    sheet: "2019_Payouts",
    rate: 15,
    firstRow: 18,
    rolloverOwnerLabel: "Wade",
    rows: [
      [1, "Ray/Jeffrey", "paid", "paid Jeffrey $7.50; commissioner did not pay himself"],
      [2, "Brian"], [3, "Patrick"], [4, "Travis"],
      [5, "Ray/Jeffrey", "paid", "paid Jeffrey $7.50; commissioner did not pay himself"],
      [6, "Billy"], [7, "Wade"],
      [8, "Brian", "rolled", "did not write recap; rolled into championship pot"],
      [9, "Tommy"], [10, "Wade"], [11, "Brian"],
      [12, "Brian", "rolled", "did not write recap; rolled into championship pot"],
      [13, "Wade"],
    ],
  },
  {
    season: 2020,
    sheet: "2020_Payouts",
    rate: 10,
    firstRow: 17,
    rolloverOwnerLabel: "JD",
    rows: [
      [1, "Ray/Jeffrey"], [2, "Brian"], [3, "Dave"], [4, "Jordan"],
      [5, "Ray/Jeffrey"], [6, "Ray/Jeffrey"], [7, "Dave"], [8, "Wade"],
      [9, "Ray/Jeffrey"], [10, "Jordan", "rolled", "no recap"],
      [11, "Brian"], [12, "Billy"], [13, "Dave"],
    ],
  },
  {
    season: 2021,
    sheet: "2021_Payouts",
    rate: 10,
    firstRow: 17,
    rolloverOwnerLabel: "Dave",
    rows: [
      [1, "Adam"], [2, "Landon"], [3, "Tommy"],
      [4, "Landon", "rolled", "No Recap"],
      [5, "Brian", "rolled", "No Recap"], [6, "Ray/Jeffrey"], [7, "JD"],
      [8, "Jordan", "rolled", "No Recap"],
      [9, "Brian", "rolled", "No Recap"],
      [10, "Adam", "rolled", "No Recap"], [11, "Adam"],
      [12, "Billy", "rolled", "No Recap"], [13, "Doug"],
      [14, "Ray/Jeffrey"],
    ],
  },
  {
    season: 2022,
    sheet: "2022_Payouts",
    rate: 10,
    firstRow: 17,
    rolloverOwnerLabel: "Tommy",
    rolloverIncludedInSettlement: true,
    rows: [
      [1, "David"], [2, "Billy"], [3, "Tommy"],
      [4, "Ray/Jeffrey", "paid", "paid Hudge full amount"],
      [5, "Tommy"], [6, "David"],
      [7, "Landon", "offset", "took away from what he owed"],
      [8, "David"], [9, "Doug"], [10, "Billy"],
      [11, "Billy", "rolled", "rolled into the pot"],
      [12, "Billy", "rolled", "rolled into the pot"],
      [13, "Doug"], [14, "David"],
    ],
  },
  {
    season: 2023,
    sheet: "2023_Payouts",
    rate: 10,
    firstRow: 17,
    rolloverOwnerLabel: "Tommy",
    rows: [
      [1, "Ray/Jeffrey", "paid", "paid half to Jeffrey; commissioner did not pay himself"],
      [2, "Travis"], [3, "Travis"], [4, "JD", "rolled", "unpaid; rolled to champion"],
      [5, "Ray/Jeffrey", "paid", "paid half to Jeffrey; commissioner did not pay himself"],
      [6, "JD", "rolled", "unpaid; rolled to champion"],
      [7, "Billy", "rolled", "unpaid; rolled to champion"], [8, "Brian"],
      [9, "David"], [10, "Tommy"],
      [11, "Ray/Jeffrey", "paid", "paid half to Jeffrey; commissioner did not pay himself"],
      [12, "JD", "rolled", "unpaid; rolled to champion"],
      [13, "Travis"], [14, "Travis"],
    ],
  },
  {
    season: 2024,
    sheet: "2024_Payouts",
    rate: 10,
    firstRow: 17,
    rolloverOwnerLabel: null,
    rows: [
      [1, "Tommy"], [2, "David"], [3, "Doug"], [4, "David"],
      [5, "Jordan"], [6, "Jordan"], [7, "Doug"], [8, "Wade"],
      [9, "Tommy"], [10, "Doug"], [11, "Doug"], [12, "Doug"],
      [13, "David"], [14, "JD"],
    ],
  },
  {
    season: 2025,
    sheet: "2025_Payouts",
    rate: 10,
    firstRow: 17,
    rolloverOwnerLabel: null,
    rows: [
      [1, "Rashad"], [2, "Brian"], [3, "David"], [4, "Travis"],
      [5, "JD"], [6, "David"], [7, "JD"], [8, "JD"], [9, "Jordan"],
      [10, "David"], [11, "Tommy"], [12, "Stan"], [13, "Jordan"],
      [14, "Rashad"],
    ],
  },
];

type AwardSeed = readonly [
  category: FinancialTransactionCategory,
  rawOwnerLabel: string,
  amount: number,
  sourceCellRange: string,
  note?: string,
];

type AwardSeason = {
  season: number;
  sheet: string;
  rows: readonly AwardSeed[];
};

const AWARD_SEASONS: readonly AwardSeason[] = [
  { season: 2016, sheet: "2016_Payouts", rows: [
    ["fourth-place", "Gordie", 50, "A31:D31"],
    ["third-place", "Ray", 50, "A32:D32"],
    ["runner-up", "Minnix", 105, "A33:D33"],
    ["champion", "Tommy", 200, "A34:D34"],
  ] },
  { season: 2017, sheet: "2017_Payouts", rows: [
    ["fourth-place", "Travis", 50, "A31:D31"],
    ["third-place", "Minnix", 50, "A32:D32"],
    ["runner-up", "JD", 105, "A33:D33"],
    ["champion", "Tommy", 195, "A34:F34", "row marked paid; settlement note references Landon's entry"],
  ] },
  { season: 2018, sheet: "2018_Payouts", rows: [
    ["fourth-place", "Jordan", 50, "A31:E31"],
    ["third-place", "Ray", 50, "A32:E32"],
    ["runner-up", "Tommy", 100, "A33:E33"],
    ["champion", "Brian", 200, "A34:E34"],
  ] },
  { season: 2019, sheet: "2019_Payouts", rows: [
    ["fourth-place", "Patrick", 50, "A31:D31"],
    ["third-place", "Brian", 50, "A32:D32"],
    ["runner-up", "Travis", 100, "A33:D33"],
    ["champion", "Wade", 200, "A34:D34"],
  ] },
  { season: 2020, sheet: "2020_Payouts", rows: [
    ["loser-bracket-winner", "Jordan", 25, "A31:D31"],
    ["fourth-place", "Brian", 25, "A32:D32"],
    ["third-place", "Dave", 75, "A33:D33"],
    ["runner-up", "Landon", 100, "A34:D34"],
    ["champion", "JD", 240, "A35:D35"],
  ] },
  { season: 2021, sheet: "2021_Payouts", rows: [
    ["loser-bracket-winner", "Billy", 25, "A32:D32"],
    ["fourth-place", "Wade", 25, "A33:D33"],
    ["third-place", "Adam", 75, "A34:D34"],
    ["runner-up", "JD", 100, "A35:D35"],
    ["champion", "Dave", 230, "A36:D36"],
  ] },
  { season: 2022, sheet: "2022_Payouts", rows: [
    ["loser-bracket-winner", "Ray/Jeffrey", 25, "A32:F32", "paid what we owed"],
    ["fourth-place", "Billy", 25, "A33:D33"],
    ["third-place", "Brian", 75, "A34:D34"],
    ["runner-up", "Dave", 175, "A35:D35", "explicit Damar settlement transaction"],
    ["champion", "Tommy", 175, "A36:D36", "explicit Damar settlement transaction; includes the $20 championship-pot rollover"],
  ] },
  { season: 2023, sheet: "2023_Payouts", rows: [
    ["fourth-place", "JD", 50, "A32:D32"],
    ["third-place", "Ray/Jeffrey", 75, "A33:D33"],
    ["runner-up", "Brian", 100, "A34:D34"],
    ["champion", "Tommy", 230, "A35:D35"],
  ] },
  { season: 2024, sheet: "2024_Payouts", rows: [
    ["fourth-place", "Dave", 50, "A32:D32"],
    ["third-place", "Doug", 75, "A33:D33"],
    ["runner-up", "Wade", 100, "A34:D34"],
    ["champion", "Jordan", 230, "A35:D35"],
  ] },
  { season: 2025, sheet: "2025_Payouts", rows: [
    ["division-winner", "JD", 25, "A32:D32"],
    ["division-winner", "Aaron", 25, "A33:D33"],
    ["division-winner", "Rashad", 25, "A34:D34"],
    ["third-place", "JD", 50, "A35:D35"],
    ["runner-up", "Travis", 100, "A36:D36"],
    ["champion", "Aaron", 219, "A37:D37"],
  ] },
];

type ExpenseSeed = {
  season: number;
  sheet: string;
  category: Extract<FinancialTransactionCategory,
    | "trophy-nameplate-expense"
    | "food-expense"
    | "championship-ring-expense">;
  amount: number;
  sourceCellRange: string;
  rawOwnerLabel: string | null;
  fundingSource: Exclude<FinancialFundingSource, null>;
  resolutionState: FinancialResolutionState;
  notes: readonly string[];
};

const EXPENSES: readonly ExpenseSeed[] = [
  ...[
    [2017, "2017_Payouts", "S14;C35"],
    [2018, "2018_Payouts", "S15;C35"],
    [2019, "2019_Payouts", "S15;C35"],
  ].map(([season, sheet, sourceCellRange]) => ({
    season: season as number,
    sheet: sheet as string,
    category: "trophy-nameplate-expense" as const,
    amount: 5,
    sourceCellRange: sourceCellRange as string,
    rawOwnerLabel: null,
    fundingSource: "dues" as const,
    resolutionState: "commissioner-ruling" as const,
    notes: ["Commissioner-confirmed trophy nameplate expense represented by the $600-to-$595 gap."],
  })),
  { season: 2020, sheet: "2020_Payouts", category: "trophy-nameplate-expense", amount: 5, sourceCellRange: "A30:D30", rawOwnerLabel: "N/A", fundingSource: "dues", resolutionState: "explicit", notes: [] },
  { season: 2021, sheet: "2021_Payouts", category: "trophy-nameplate-expense", amount: 5, sourceCellRange: "A31:C31", rawOwnerLabel: "Dave", fundingSource: "dues", resolutionState: "explicit", notes: [] },
  { season: 2022, sheet: "2022_Payouts", category: "trophy-nameplate-expense", amount: 5, sourceCellRange: "A31:C31", rawOwnerLabel: "Tommy/Dave", fundingSource: "dues", resolutionState: "explicit", notes: ["Shared physical nameplate expense; not owner winnings."] },
  { season: 2023, sheet: "2023_Payouts", category: "trophy-nameplate-expense", amount: 5, sourceCellRange: "A31:C31", rawOwnerLabel: "Tommy", fundingSource: "dues", resolutionState: "explicit", notes: [] },
  { season: 2024, sheet: "2024_Payouts", category: "trophy-nameplate-expense", amount: 5, sourceCellRange: "A31:C31", rawOwnerLabel: "Jordan", fundingSource: "dues", resolutionState: "explicit", notes: [] },
  { season: 2024, sheet: "2024_Payouts", category: "food-expense", amount: 60, sourceCellRange: "W1:X14", rawOwnerLabel: "Damon Food", fundingSource: "separate", resolutionState: "commissioner-ruling", notes: ["Twelve separate $5 food contributions fund this event expense; excluded from dues and winnings."] },
  { season: 2025, sheet: "2025_Payouts", category: "championship-ring-expense", amount: 16, sourceCellRange: "A31:D31", rawOwnerLabel: "Aaron", fundingSource: "dues", resolutionState: "commissioner-ruling", notes: ["Actual championship ring cost; associated with Aaron's title but not Aaron cash winnings."] },
];

function identity(rawOwnerLabel: string) {
  const resolved = OWNER_IDENTITIES[rawOwnerLabel];
  if (!resolved) throw new Error(`Unresolved financial owner label: ${rawOwnerLabel}`);
  return resolved;
}

function commonSource(season: number, sheet: string, sourceCellRange: string) {
  return {
    season,
    sourceWorkbook: HISTORICAL_FINANCIAL_SOURCE.workbookFilename,
    sourceWorkbookSha256: HISTORICAL_FINANCIAL_SOURCE.workbookSha256,
    sourceSheet: sheet,
    sourceCellRange,
    rawTeamLabel: null,
    outstandingAmount: 0,
  } as const;
}

function buildDuesTransactions(): HistoricalFinancialTransaction[] {
  return DUES_SEASONS.flatMap((season) =>
    season.labels.map((rawOwnerLabel, index) => {
      const owner = identity(rawOwnerLabel);
      const row = season.firstRow + index;
      const notes: string[] = [];
      if (season.season === 2020 && owner.ownerId === "ray-long") {
        notes.push("Workbook note records private Ray/Jeffrey dues mechanics; official league attribution remains Ray.");
      }
      if (season.season === 2017 && owner.ownerId === "landon-elliott") {
        notes.push("Workbook settlement note says Landon paid Tommy; annual paid ledger records the dues settled.");
      }

      return {
        ...commonSource(
          season.season,
          season.sheet,
          `${season.sourceColumn}${row}`
        ),
        transactionKey: `${season.season}:dues:${owner.ownerId}`,
        transactionType: "dues",
        category: "dues",
        amount: 50,
        duesAssessedAmount: 50,
        duesPaidAmount: 50,
        recordedWinningsAmount: 0,
        cashPaidAmount: 0,
        forfeitedRolledAmount: 0,
        financialOwnerId: owner.ownerId,
        originatingFinancialOwnerId: owner.ownerId,
        franchiseId: owner.franchiseId,
        rawOwnerLabel,
        paymentState: "paid",
        fundingSource: null,
        description: `${season.season} league entry fee`,
        notes,
        resolutionState: "explicit",
      } satisfies HistoricalFinancialTransaction;
    })
  );
}

function buildWeeklyTransactions(): HistoricalFinancialTransaction[] {
  return WEEKLY_SEASONS.flatMap((season) =>
    season.rows.map(([week, rawOwnerLabel, rawState = "paid", note], index) => {
      const origin = identity(rawOwnerLabel);
      const isRolled = rawState === "rolled";
      const recipient = isRolled
        ? identity(season.rolloverOwnerLabel ?? rawOwnerLabel)
        : origin;
      const rolloverAlreadyIncluded =
        isRolled && season.rolloverIncludedInSettlement === true;
      const notes = note ? [note] : [];
      if (isRolled) {
        notes.push(
          rolloverAlreadyIncluded
            ? "Destination is Tommy; amount is already contained in the corrected explicit 2022 settlement and is not counted twice."
            : `Commissioner ruling redirects this forfeited prize to ${season.rolloverOwnerLabel}.`
        );
      }
      if (origin.ownerId === "ray-long") {
        notes.push("Official Prestigio financial attribution routes through Ray; private co-owner transfers are excluded.");
      }

      const recordedAmount = rolloverAlreadyIncluded ? 0 : season.rate;
      return {
        ...commonSource(
          season.season,
          season.sheet,
          `A${season.firstRow + index}:F${season.firstRow + index}`
        ),
        transactionKey: `${season.season}:weekly:${week}:${origin.ownerId}`,
        transactionType: "winnings",
        category: isRolled ? "weekly-prize-rollover" : "weekly-prize",
        amount: season.rate,
        duesAssessedAmount: 0,
        duesPaidAmount: 0,
        recordedWinningsAmount: recordedAmount,
        cashPaidAmount: recordedAmount,
        forfeitedRolledAmount: isRolled ? season.rate : 0,
        financialOwnerId: recipient.ownerId,
        originatingFinancialOwnerId: origin.ownerId,
        franchiseId: recipient.franchiseId,
        rawOwnerLabel,
        paymentState:
          rawState === "offset"
            ? "offset"
            : isRolled
              ? "forfeited-rolled"
              : "paid",
        fundingSource: null,
        description: `${season.season} Week ${week} high-score prize`,
        notes,
        resolutionState: isRolled ? "commissioner-ruling" : "explicit",
      } satisfies HistoricalFinancialTransaction;
    })
  );
}

function buildAwardTransactions(): HistoricalFinancialTransaction[] {
  return AWARD_SEASONS.flatMap((season) =>
    season.rows.map(([category, rawOwnerLabel, amount, sourceCellRange, note]) => {
      const owner = identity(rawOwnerLabel);
      const notes = note ? [note] : [];
      if (owner.ownerId === "ray-long") {
        notes.push("Official Prestigio financial attribution routes through Ray; Jeffrey receives no duplicate total.");
      }
      if (season.season === 2025 && owner.ownerId === "jordan-maslyn") {
        notes.push("Official Shake-N-Bakers financial attribution routes through Jordan; Landon receives no duplicate total.");
      }

      return {
        ...commonSource(season.season, season.sheet, sourceCellRange),
        transactionKey: `${season.season}:award:${category}:${owner.ownerId}`,
        transactionType: "winnings",
        category,
        amount,
        duesAssessedAmount: 0,
        duesPaidAmount: 0,
        recordedWinningsAmount: amount,
        cashPaidAmount: amount,
        forfeitedRolledAmount: 0,
        financialOwnerId: owner.ownerId,
        originatingFinancialOwnerId: owner.ownerId,
        franchiseId: owner.franchiseId,
        rawOwnerLabel,
        paymentState: "paid",
        fundingSource: null,
        description: `${season.season} ${category.replaceAll("-", " ")}`,
        notes,
        resolutionState: "explicit",
      } satisfies HistoricalFinancialTransaction;
    })
  );
}

function buildExpenseTransactions(): HistoricalFinancialTransaction[] {
  return EXPENSES.map((expense) => ({
    ...commonSource(expense.season, expense.sheet, expense.sourceCellRange),
    transactionKey: `${expense.season}:expense:${expense.category}`,
    transactionType: "expense",
    category: expense.category,
    amount: expense.amount,
    duesAssessedAmount: 0,
    duesPaidAmount: 0,
    recordedWinningsAmount: 0,
    cashPaidAmount: 0,
    forfeitedRolledAmount: 0,
    financialOwnerId: null,
    originatingFinancialOwnerId: null,
    franchiseId: null,
    rawOwnerLabel: expense.rawOwnerLabel,
    paymentState: "expense-paid",
    fundingSource: expense.fundingSource,
    description: `${expense.season} ${expense.category.replaceAll("-", " ")}`,
    notes: [...expense.notes],
    resolutionState: expense.resolutionState,
  }));
}

export const HISTORICAL_FINANCIAL_TRANSACTIONS: readonly HistoricalFinancialTransaction[] = [
  ...buildDuesTransactions(),
  ...buildWeeklyTransactions(),
  ...buildAwardTransactions(),
  ...buildExpenseTransactions(),
];
