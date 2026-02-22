// /lib/types/Manager.ts

export enum ManagerStatus {
  Active = "Active",
  Retired = "Retired",
  Staff = "Staff",
}

export enum DraftPreference {
  Rookies = "Rookies",
  Vets = "Vets",
}

export enum ValuePosition {
  QB = "QB",
  RB = "RB",
  WR = "WR",
  TE = "TE",
  K = "K",
  DEF = "DEF",
}

export enum TeamCode {
  ATL = "ATL",
  CLE = "CLE",
  WAS = "WAS",
  MIN = "MIN",
  NO = "NO",
  GB = "GB",
  CAR = "CAR",
  NYG = "NYG",
  DET = "DET",
  SF = "SF",
  TB = "TB",
}

export interface CoOwner {
  fullName: string;
}

export interface RivalInfo {
  name: string;
  image: string;
}

export interface BaseManager {
  roster: number;
  shortName: string;
  fullName: string;
  status: ManagerStatus;
  teamName: string;
  tookOver: number | null;
  location: string;
  bio: string;
  photo: string;
  fantasyStart: number;
  favoriteTeam: TeamCode;
  mode: string;
  rival: RivalInfo;
  favoritePlayer: number;
  valuePosition: ValuePosition;
  rookieOrVets: DraftPreference;
  philosophy: string;
  preferredContact: string;
  contactValue: string;
  sleeperId: string;
  record: string;
  currentWinnings: number;
  championships: number;
  podiums: number;
  bestFinish: string;
  toiletBowls: number;
  role?: string;
  coOwner?: CoOwner;
}

//
// ⭐ Active managers get the Trade Aggression field
//
export interface ActiveManager extends BaseManager {
  status: ManagerStatus.Active;
  tradeAggression: number; // ← NEW FIELD
}

//
// ⭐ Retired managers DO NOT get tradeAggression
//
export interface RetiredManager extends BaseManager {
  status: ManagerStatus.Retired;
}

//
// ⭐ Staff (like Damon) DO NOT get tradeAggression
//
export interface StaffManager extends BaseManager {
  status: ManagerStatus.Staff;
}

export type Manager = ActiveManager | RetiredManager | StaffManager;
