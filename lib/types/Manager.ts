// /lib/types/Manager.ts

export const ManagerStatus = {
  Active: "Active",
  Retired: "Retired",
  Staff: "Staff",
} as const;
export type ManagerStatus = (typeof ManagerStatus)[keyof typeof ManagerStatus];

export const DraftPreference = {
  Rookies: "Rookies",
  Vets: "Vets",
} as const;
export type DraftPreference =
  (typeof DraftPreference)[keyof typeof DraftPreference];

export const ValuePosition = {
  QB: "QB",
  RB: "RB",
  WR: "WR",
  TE: "TE",
  K: "K",
  DEF: "DEF",
} as const;
export type ValuePosition = (typeof ValuePosition)[keyof typeof ValuePosition];

export const TeamCode = {
  ATL: "ATL",
  CLE: "CLE",
  WAS: "WAS",
  MIN: "MIN",
  NO: "NO",
  GB: "GB",
  CAR: "CAR",
  NYG: "NYG",
  DET: "DET",
  SF: "SF",
  TB: "TB",
  PIT: "PIT",
} as const;
export type TeamCode = (typeof TeamCode)[keyof typeof TeamCode];

export interface CoOwner {
  fullName: string;
}

export interface RivalInfo {
  name: string;
  image: string;
}

export interface BaseManager {
  roster?: number;
  shortName: string;
  fullName: string;
  status: ManagerStatus;
  teamName: string;
  tookOver?: number | null;
  location?: string;
  bio: string;
  photo: string | null;
  fantasyStart?: number;
  favoriteTeam?: TeamCode;
  mode?: string;
  rival?: RivalInfo;
  favoritePlayer?: number;
  valuePosition?: ValuePosition;
  rookieOrVets?: DraftPreference;
  philosophy: string;
  preferredContact?: string;
  contactValue?: string;
  sleeperId?: string;
  record?: string;
  currentWinnings?: number;
  championships: number;
  podiums: number;
  bestFinish: string;
  toiletBowls?: number;
  role?: string;
  coOwner?: CoOwner;
}

//
// ⭐ Active managers get the Trade Aggression field
//
export interface ActiveManager extends BaseManager {
  roster: number;
  status: typeof ManagerStatus.Active;
  tookOver: number | null;
  location: string;
  photo: string;
  fantasyStart: number;
  favoriteTeam: TeamCode;
  mode: string;
  rival: RivalInfo;
  favoritePlayer: number;
  valuePosition: ValuePosition;
  rookieOrVets: DraftPreference;
  preferredContact: string;
  contactValue: string;
  sleeperId: string;
  record: string;
  currentWinnings: number;
  toiletBowls: number;
  tradeAggression: number; // ← NEW FIELD
}

//
// ⭐ Retired managers DO NOT get tradeAggression
//
export interface RetiredManager extends BaseManager {
  status: typeof ManagerStatus.Retired;
}

//
// ⭐ Staff (like Damon) DO NOT get tradeAggression
//
export interface StaffManager extends BaseManager {
  status: typeof ManagerStatus.Staff;
}

export type Manager = ActiveManager | RetiredManager | StaffManager;
