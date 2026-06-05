import {
  writeBatch,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
  type DocumentData,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { activeManagers } from "@/lib/managers/activeManagers";

export const FINANCE_SEASONS_COLLECTION = "finance_seasons";
export const FINANCE_RULES_COLLECTION = "finance_rules";
export const FINANCE_OWNERS_SUBCOLLECTION = "owners";
export const FINANCE_AWARDS_SUBCOLLECTION = "awards";

export type FinanceSeasonStatus = "current" | "archived";

export type FinanceAchievementTag =
  | "Paid"
  | "Owes Dues"
  | "Weekly Winner"
  | "Division Winner"
  | "Champion"
  | "Runner-Up"
  | "3rd Place";

export type FinanceAwardType =
  | "weekly_high_score"
  | "division_winner"
  | "champion"
  | "runner_up"
  | "third_place"
  | "adjustment";

export type FinanceAwardSource = "manual" | "sleeper";

export type FinanceDateValue = string | Date | Timestamp | null;

export interface FinanceSeason {
  id: string;
  seasonYear: number;
  status: FinanceSeasonStatus;
  entryFee: number;
  expectedManagers: number;
  prizePool: number;
  weeklyPrizeTotalAwarded: number;
  divisionPrizeTotalAwarded: number;
  championshipPotRemaining: number;
  ringDeduction: number;
  nameplateDeduction: number;
  notes: string[];
  createdAt: FinanceDateValue;
  updatedAt: FinanceDateValue;
  archivedAt?: FinanceDateValue;
}

export interface FinanceOwnerLedgerEntry {
  id: string;
  managerId: string;
  sleeperUserId?: string;
  rosterId?: number;
  displayName: string;
  teamName: string;
  avatar?: string | null;
  paid: boolean;
  entryFee: number;
  duesPaidAt?: FinanceDateValue;
  winnings: number;
  netPosition: number;
  achievementTags: FinanceAchievementTag[];
  updatedAt?: FinanceDateValue;
}

export interface FinanceAward {
  id: string;
  type: FinanceAwardType;
  managerId: string;
  amount: number;
  label: string;
  source: FinanceAwardSource;
  week?: number;
  locked?: boolean;
  createdAt?: FinanceDateValue;
  updatedAt?: FinanceDateValue;
}

export interface FinanceRules {
  id: string;
  seasonYear: number;
  leagueFee: number;
  weeklyHighScore: number;
  divisionWinner: number;
  champion: number;
  championIsApproximate: boolean;
  championCalculation: string;
  runnerUp: number;
  thirdPlace: number;
  ringDeduction: number;
  ringDeductionIsApproximate: boolean;
  nameplateDeduction: number;
  nameplateDeductionIsApproximate: boolean;
  notes: string[];
  updatedAt?: FinanceDateValue;
}

export interface FinanceSeasonSeedConfig {
  seasonYear: number;
  entryFee: number;
  prizePool: number;
  expectedManagers: number;
  status: FinanceSeasonStatus;
}

export interface FinanceManagerIdentity {
  managerId: string;
  sleeperUserId?: string;
  rosterId?: number;
  displayName: string;
  teamName: string;
  avatar?: string | null;
}

export const DEFAULT_2026_FINANCE_SEASON: FinanceSeasonSeedConfig = {
  seasonYear: 2026,
  entryFee: 50,
  prizePool: 600,
  expectedManagers: 12,
  status: "current",
};

export const DEFAULT_2026_FINANCE_RULES = {
  leagueFee: 50,
  weeklyHighScore: 10,
  divisionWinner: 25,
  champion: 219,
  championIsApproximate: true,
  championCalculation:
    "Approximate champion payout. Final champion payout should be calculated from the remaining prize pool after fixed payouts and final ring/nameplate costs.",
  runnerUp: 100,
  thirdPlace: 50,
  ringDeduction: 0,
  ringDeductionIsApproximate: true,
  nameplateDeduction: 0,
  nameplateDeductionIsApproximate: true,
  notes: [
    "All financial information is official on the Payouts page.",
    "Current season ledger starts fresh with all managers unpaid and winnings at $0.",
    "Champion payout is an estimate until final season costs and fixed payouts are known.",
    "Ring and nameplate deductions are flexible estimates until final purchase costs are confirmed.",
  ],
};

function getManagerId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getActiveFinanceManagerIdentities(): FinanceManagerIdentity[] {
  return activeManagers.map((manager) => ({
    managerId: getManagerId(manager.fullName),
    sleeperUserId: manager.sleeperId,
    rosterId: manager.roster,
    displayName: manager.fullName,
    teamName: manager.teamName,
    avatar: manager.photo,
  }));
}

function getNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function getString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function getStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function getDateValue(value: unknown): FinanceDateValue {
  if (
    typeof value === "string" ||
    value instanceof Date ||
    value === null ||
    (typeof value === "object" && value !== null && "seconds" in value)
  ) {
    return value as FinanceDateValue;
  }

  return null;
}

function getSeasonStatus(value: unknown): FinanceSeasonStatus {
  return value === "archived" ? "archived" : "current";
}

function getAwardType(value: unknown): FinanceAwardType {
  const validTypes: FinanceAwardType[] = [
    "weekly_high_score",
    "division_winner",
    "champion",
    "runner_up",
    "third_place",
    "adjustment",
  ];

  return validTypes.includes(value as FinanceAwardType)
    ? (value as FinanceAwardType)
    : "adjustment";
}

function getAwardSource(value: unknown): FinanceAwardSource {
  return value === "sleeper" ? "sleeper" : "manual";
}

function getAchievementTags(value: unknown): FinanceAchievementTag[] {
  const validTags: FinanceAchievementTag[] = [
    "Paid",
    "Owes Dues",
    "Weekly Winner",
    "Division Winner",
    "Champion",
    "Runner-Up",
    "3rd Place",
  ];

  return getStringArray(value).filter((tag): tag is FinanceAchievementTag =>
    validTags.includes(tag as FinanceAchievementTag)
  );
}

function mapFinanceSeason(id: string, data: DocumentData): FinanceSeason {
  const parsedYear = Number.parseInt(id, 10);

  return {
    id,
    seasonYear: getNumber(data.seasonYear, Number.isNaN(parsedYear) ? 0 : parsedYear),
    status: getSeasonStatus(data.status),
    entryFee: getNumber(data.entryFee),
    expectedManagers: getNumber(data.expectedManagers),
    prizePool: getNumber(data.prizePool),
    weeklyPrizeTotalAwarded: getNumber(data.weeklyPrizeTotalAwarded),
    divisionPrizeTotalAwarded: getNumber(data.divisionPrizeTotalAwarded),
    championshipPotRemaining: getNumber(data.championshipPotRemaining),
    ringDeduction: getNumber(data.ringDeduction),
    nameplateDeduction: getNumber(data.nameplateDeduction),
    notes: getStringArray(data.notes),
    createdAt: getDateValue(data.createdAt),
    updatedAt: getDateValue(data.updatedAt),
    archivedAt: getDateValue(data.archivedAt),
  };
}

function mapFinanceOwner(id: string, data: DocumentData): FinanceOwnerLedgerEntry {
  const paid = data.paid === true;
  const entryFee = getNumber(data.entryFee);
  const winnings = getNumber(data.winnings);
  const derivedNetPosition = winnings - (paid ? entryFee : 0);

  return {
    id,
    managerId: getString(data.managerId, id),
    sleeperUserId: getString(data.sleeperUserId) || undefined,
    rosterId: typeof data.rosterId === "number" ? data.rosterId : undefined,
    displayName: getString(data.displayName, "Unknown Manager"),
    teamName: getString(data.teamName, "Unknown Team"),
    avatar: typeof data.avatar === "string" ? data.avatar : null,
    paid,
    entryFee,
    duesPaidAt: getDateValue(data.duesPaidAt),
    winnings,
    netPosition: getNumber(data.netPosition, derivedNetPosition),
    achievementTags: getAchievementTags(data.achievementTags),
    updatedAt: getDateValue(data.updatedAt),
  };
}

function mapFinanceAward(id: string, data: DocumentData): FinanceAward {
  return {
    id,
    type: getAwardType(data.type),
    managerId: getString(data.managerId),
    amount: getNumber(data.amount),
    label: getString(data.label),
    source: getAwardSource(data.source),
    week: typeof data.week === "number" ? data.week : undefined,
    locked: typeof data.locked === "boolean" ? data.locked : undefined,
    createdAt: getDateValue(data.createdAt),
    updatedAt: getDateValue(data.updatedAt),
  };
}

function mapFinanceRules(id: string, data: DocumentData): FinanceRules {
  const parsedYear = Number.parseInt(id, 10);

  return {
    id,
    seasonYear: getNumber(data.seasonYear, Number.isNaN(parsedYear) ? 0 : parsedYear),
    leagueFee: getNumber(data.leagueFee),
    weeklyHighScore: getNumber(data.weeklyHighScore),
    divisionWinner: getNumber(data.divisionWinner),
    champion: getNumber(data.champion),
    championIsApproximate: data.championIsApproximate === true,
    championCalculation: getString(data.championCalculation),
    runnerUp: getNumber(data.runnerUp),
    thirdPlace: getNumber(data.thirdPlace),
    ringDeduction: getNumber(data.ringDeduction),
    ringDeductionIsApproximate: data.ringDeductionIsApproximate === true,
    nameplateDeduction: getNumber(data.nameplateDeduction),
    nameplateDeductionIsApproximate:
      data.nameplateDeductionIsApproximate === true,
    notes: getStringArray(data.notes),
    updatedAt: getDateValue(data.updatedAt),
  };
}

export async function getCurrentFinanceSeason() {
  const seasonsQuery = query(
    collection(db, FINANCE_SEASONS_COLLECTION),
    where("status", "==", "current"),
    limit(1)
  );
  const snapshot = await getDocs(seasonsQuery);
  const seasonDoc = snapshot.docs[0];

  return seasonDoc ? mapFinanceSeason(seasonDoc.id, seasonDoc.data()) : null;
}

export async function getFinanceSeason(seasonYear: number | string) {
  const seasonRef = doc(db, FINANCE_SEASONS_COLLECTION, String(seasonYear));
  const seasonSnap = await getDoc(seasonRef);

  return seasonSnap.exists()
    ? mapFinanceSeason(seasonSnap.id, seasonSnap.data())
    : null;
}

export async function getFinanceOwnerLedger(seasonYear: number | string) {
  const ownersRef = collection(
    db,
    FINANCE_SEASONS_COLLECTION,
    String(seasonYear),
    FINANCE_OWNERS_SUBCOLLECTION
  );
  const snapshot = await getDocs(ownersRef);

  return snapshot.docs
    .map((ownerDoc) => mapFinanceOwner(ownerDoc.id, ownerDoc.data()))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export async function getFinanceAwards(seasonYear: number | string) {
  const awardsRef = collection(
    db,
    FINANCE_SEASONS_COLLECTION,
    String(seasonYear),
    FINANCE_AWARDS_SUBCOLLECTION
  );
  const snapshot = await getDocs(awardsRef);

  return snapshot.docs.map((awardDoc) =>
    mapFinanceAward(awardDoc.id, awardDoc.data())
  );
}

export async function getFinanceRules(seasonYear: number | string) {
  const rulesRef = doc(db, FINANCE_RULES_COLLECTION, String(seasonYear));
  const rulesSnap = await getDoc(rulesRef);

  return rulesSnap.exists()
    ? mapFinanceRules(rulesSnap.id, rulesSnap.data())
    : null;
}

export function buildFinanceSeasonSeedData(
  config: FinanceSeasonSeedConfig = DEFAULT_2026_FINANCE_SEASON
) {
  return {
    seasonYear: config.seasonYear,
    status: config.status,
    entryFee: config.entryFee,
    expectedManagers: config.expectedManagers,
    prizePool: config.prizePool,
    weeklyPrizeTotalAwarded: 0,
    divisionPrizeTotalAwarded: 0,
    championshipPotRemaining: config.prizePool,
    ringDeduction: 0,
    nameplateDeduction: 0,
    notes: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

export function buildFinanceRulesSeedData(
  seasonYear = DEFAULT_2026_FINANCE_SEASON.seasonYear
) {
  return {
    seasonYear,
    ...DEFAULT_2026_FINANCE_RULES,
    updatedAt: serverTimestamp(),
  };
}

export function buildFinanceOwnerSeedData(
  manager: FinanceManagerIdentity,
  entryFee = DEFAULT_2026_FINANCE_SEASON.entryFee
) {
  return {
    managerId: manager.managerId,
    sleeperUserId: manager.sleeperUserId ?? null,
    rosterId: manager.rosterId ?? null,
    displayName: manager.displayName,
    teamName: manager.teamName,
    avatar: manager.avatar ?? null,
    paid: false,
    entryFee,
    duesPaidAt: null,
    winnings: 0,
    netPosition: 0,
    achievementTags: ["Owes Dues"] satisfies FinanceAchievementTag[],
    updatedAt: serverTimestamp(),
  };
}

export async function writeFinanceSeason(
  config: FinanceSeasonSeedConfig = DEFAULT_2026_FINANCE_SEASON
) {
  const seasonRef = doc(
    db,
    FINANCE_SEASONS_COLLECTION,
    String(config.seasonYear)
  );

  await setDoc(seasonRef, buildFinanceSeasonSeedData(config), { merge: true });
}

export async function writeFinanceRules(
  seasonYear = DEFAULT_2026_FINANCE_SEASON.seasonYear
) {
  const rulesRef = doc(db, FINANCE_RULES_COLLECTION, String(seasonYear));

  await setDoc(rulesRef, buildFinanceRulesSeedData(seasonYear), { merge: true });
}

export async function writeFinanceOwnerLedger(
  seasonYear = DEFAULT_2026_FINANCE_SEASON.seasonYear,
  managers: FinanceManagerIdentity[] = getActiveFinanceManagerIdentities(),
  entryFee = DEFAULT_2026_FINANCE_SEASON.entryFee
) {
  const batch = writeBatch(db);

  managers.forEach((manager) => {
    const ownerRef = doc(
      db,
      FINANCE_SEASONS_COLLECTION,
      String(seasonYear),
      FINANCE_OWNERS_SUBCOLLECTION,
      manager.managerId
    );

    batch.set(ownerRef, buildFinanceOwnerSeedData(manager, entryFee), {
      merge: true,
    });
  });

  await batch.commit();
}

export async function initializeFinanceSeason(
  config: FinanceSeasonSeedConfig = DEFAULT_2026_FINANCE_SEASON,
  managers: FinanceManagerIdentity[] = getActiveFinanceManagerIdentities()
) {
  const batch = writeBatch(db);
  const seasonRef = doc(
    db,
    FINANCE_SEASONS_COLLECTION,
    String(config.seasonYear)
  );
  const rulesRef = doc(db, FINANCE_RULES_COLLECTION, String(config.seasonYear));

  batch.set(seasonRef, buildFinanceSeasonSeedData(config), { merge: true });
  batch.set(rulesRef, buildFinanceRulesSeedData(config.seasonYear), {
    merge: true,
  });

  managers.forEach((manager) => {
    const ownerRef = doc(
      db,
      FINANCE_SEASONS_COLLECTION,
      String(config.seasonYear),
      FINANCE_OWNERS_SUBCOLLECTION,
      manager.managerId
    );

    batch.set(ownerRef, buildFinanceOwnerSeedData(manager, config.entryFee), {
      merge: true,
    });
  });

  await batch.commit();
}
