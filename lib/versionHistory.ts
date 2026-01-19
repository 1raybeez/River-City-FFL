export interface RuleChange {
  rule: string;
  description: string;
}

export interface VersionEntry {
  version: string;
  date: string;
  changes: RuleChange[];
}

const versionHistory: VersionEntry[] = [
  {
    version: "7",
    date: "03/22/25",
    changes: [
      { rule: "2.1.3", description: "Modified Rookie Hazing to only buy drinks if at a bar (Passed 12-0)[cite: 642]." },
      { rule: "5.2.1", description: "Restricted owners from trading FAAB in the offseason (Passed 12-0)[cite: 645]." }
    ]
  },
  {
    version: "6",
    date: "03/03/24",
    changes: [
      { rule: "4.1", description: "Keepers lock when the draft begins (Passed 8-4)[cite: 642]." },
      { rule: "4.2", description: "Max 2 keepers, 1 per position, starting 2025 (Passed 7-5)[cite: 642]." },
      { rule: "1.6.1", description: "Weekly high score payout doesn't require a recap (Passed 11-1)[cite: 642]." },
      { rule: "1.6.2", description: "Removed 4th place payout; added $25 per division winner (Passed 9-3, 12-0)[cite: 642]." },
      { rule: "2.2.1", description: "Toilet Bowl loser only responsible for apology letter (Passed 12-0)[cite: 642]." },
      { rule: "1.2", description: "Auctioneer fee set to $5 for dinner/drinks (Passed 12-0)[cite: 642]." },
      { rule: "5.2.2", description: "Established 1 Veto Flag per owner per season (Passed 9-3)[cite: 642]." }
    ]
  },
  {
    version: "4",
    date: "04/29/22",
    changes: [
      { rule: "1.6", description: "Toilet Bowl loser responsible for last place hazing (Passed 11-1)[cite: 641]." },
      { rule: "2.2.4", description: "Increased IR slots from 1 to 2 (Passed 7-5)[cite: 641]." },
      { rule: "4.2", description: "Added Special Teams Player TD (Passed 10-2)[cite: 642]." },
      { rule: "2.5.5", description: "Allowed $0 bids on Free Agency (Passed 8-4)[cite: 642]." }
    ]
  },
  {
    version: "2",
    date: "03/31/20",
    changes: [
      { rule: "2", description: "New payout structure with $240 Champ prize (Passed 10-0)[cite: 641]." },
      { rule: "11a/b", description: "Updated Rookie and Last Place punishments (Passed 9-1, 10-0)[cite: 641]." },
      { rule: "6b/c", description: "Loser Bracket winner gets #1 nomination; snake order set (Passed 10-0)[cite: 641]." }
    ]
  },
  {
    version: "1",
    date: "08/14/19",
    changes: [
      { rule: "6a/3d", description: "Budget increased to $200; keeper value to $10 (Passed 7-4)[cite: 641]." },
      { rule: "9a", description: "Commish can immediately approve trades unless challenged (Passed 8-3)[cite: 641]." },
      { rule: "8b", description: "Allowed trading IR players without dropping others (Passed 7-4)[cite: 641]." }
    ]
  }
];

export default versionHistory;