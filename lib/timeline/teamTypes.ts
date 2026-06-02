// /lib/timeline/teamTypes.ts

export interface TeamRecord {
  wins: number;
  losses: number;
  ties: number;
  winPct: number;      // 0–1
  standing: number;    // 1 = best
}

export interface TeamInjuries {
  startersOut: number;
  totalInjuries: number;
  impactScore: number; // 0–10 scale
}

export interface KeeperValue {
  surplus: number;     // total keeper surplus
  count: number;
  avgSurplus: number;
}

export interface RosterAge {
  avgAge: number;
  veteranCount: number;
  youthCount: number;
}

export interface TradeHistory {
  tradesLast12Months: number;
  netTalentDelta: number;
  consolidationMoves: number;
  rebuildMoves: number;
}

export interface TeamData {
  ownerId: string;
  teamName: string;

  record: TeamRecord;
  powerRank: number;
  pointsFor: number;
  pointsAgainst: number;

  injuries: TeamInjuries;
  keeperValue: KeeperValue;
  rosterAge: RosterAge;
  tradeHistory: TradeHistory;

  multiYearFinishes: number[]; // e.g., [3, 5, 2, 1]
}
