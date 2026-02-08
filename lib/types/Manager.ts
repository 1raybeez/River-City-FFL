export enum ManagerStatus {
  Active = "Active",
  Retired = "Retired"
}

export enum DraftPreference {
  Rookies = "Rookies",
  Vets = "Vets"
}

export enum ValuePosition {
  QB = "QB", RB = "RB", WR = "WR", TE = "TE", K = "K", DEF = "DEF",
  Auctioneer = "Auctioneer" // Resolves "Auctioneer" error
}

export enum TeamCode {
  ATL = "ATL", BAL = "BAL", CAR = "CAR", CLE = "CLE", DET = "DET", GB = "GB", 
  MIN = "MIN", NO = "NO", NYG = "NYG", NYJ = "NYJ", PIT = "PIT", SF = "SF", 
  TB = "TB", WAS = "WAS"
}

export interface ManagerIdentity {
  shortName: string;
  fullName: string;
}

export interface ManagerProfile {
  status: ManagerStatus;
  teamName: string;
  photo: string | null;
  bio: string;
  philosophy: string;
  favoriteTeam: TeamCode;
  rookieOrVets: DraftPreference;
  location: string;
  fantasyStart: number;
}

export interface ActiveManager extends ManagerIdentity, ManagerProfile {
  roster: number;
  tookOver?: number | null;
  mode: string;
  preferredContact: string;
  contactValue: string;
  sleeperId: string;
  currentWinnings: number;
  roles?: string[]; // Kept for legacy arrays
  role?: string;    // Resolves "role" vs "roles" error
  coOwner?: { fullName: string } | null;
  championships: number;
  podiums: number;
  bestFinish: string;
  record?: string;
  valuePosition: ValuePosition;
  tradingScale?: number;
  favoritePlayer: number;
  rival: { name: string; image: string };
  toiletBowls: number;
}

export interface RetiredManager extends ManagerIdentity, ManagerProfile {
  record?: string;
  championships: number;
  podiums: number;
  bestFinish: string;
  role?: string;
}