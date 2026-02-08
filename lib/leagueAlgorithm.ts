/**
 * RIVER CITY FFL - OFFICIAL LEAGUE ALGORITHM
 * This file defines the "Personality" of the Trade Analyzer.
 * Adjusting these values changes how trades are scored without touching the Engine.
 */

export const RIVER_CITY_ALGORITHM = {
  // 1. PILLAR WEIGHTS (Must total 1.0)
  // These define the balance between winning now vs. building for the future.
  weights: {
    currentTalent: 0.55,    // Raw production (ADP/ECR/Points)
    keeperSurplus: 0.35,    // Value relative to cost (Talent - Salary)
    faab: 0.10,             // FAAB tie-breaker
  },

  // 2. MARKET DYNAMICS
  // Exponential power makes elite "Studs" worth significantly more than bench players.
  // A value of 1.30 means a 90-rated player is ~12x more valuable than a 15-rated player.
  marketMultiplier: 1.30, 

  // 3. ROSTER SPOT TAX
  // Points deducted from a team's net value for every extra player they receive.
  // This accounts for the "cost" of dropping players to make room for a 2-for-1 or 3-for-1.
  rosterSpotTax: 12.5, 

  // 4. HISTORICAL TOLERANCE BANDS
  // These map the "Value Gap" to the final 0-100 Fairness Score.
  // Calibrated based on River City's "Hands-Off" culture (approving almost everything).
  tolerance: {
    elite: 15,      // Gap < 15 = 100 Score (Clean Swap)
    fair: 40,       // Gap < 40 = 90 Score (Buddy Jesus Approved)
    lopsided: 80,   // Gap < 80 = 60 Score (Questionable)
    egregious: 150, // Gap < 150 = 30 Score (Veto Territory)
  },

  // 5. POSITIONAL PREMIUMS
  // Optional: Multiply a player's base value based on position scarcity.
  positionalPremiums: {
    QB: 1.1,  // Slight boost for QBs in 12-team leagues
    RB: 1.2,  // High scarcity
    WR: 1.0,  // Deepest position
    TE: 1.15, // Elite TEs are rare
  }
};

// Map of all historical League IDs for the Scraper script
export const LEAGUE_HISTORY_IDS: Record<number, string> = {
  2026: "1312149033254416384",
  2025: "1199749375539027968",
  2024: "1072545817749331968",
  2023: "997510104398315520",
  2022: "784542934581256192",
  2021: "677751457528762368",
  2020: "530115541505298432",
  2019: "466632190273253376",
  2018: "342868033913540608"
};