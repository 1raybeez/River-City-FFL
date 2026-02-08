// lib/leagueAlgorithm.ts

export const RIVER_CITY_ALGORITHM = {
  // 1. THE WEIGHTS (Total must be 1.0 or 100%)
  weights: {
    currentYearValue: 0.50,  // How much we care about points right now (Sleeper ADP/ECR)
    keeperSurplus: 0.40,     // How much we care about long-term value (Talent - Cost)
    faabTieBreaker: 0.10     // How much FAAB influences the deal
  },

  // 2. THE MARKET MULTIPLIER (The "Chase vs Nix" Fix)
  // Elite players (Top 20) are exponentially more valuable.
  // We apply this to prevent "3 nickels for a quarter" trades from scoring high.
  marketMultiplier: 1.25,

  // 3. THE ROSTER SPOT TAX
  // Every extra player received in a trade "costs" the team.
  // If you get 2 players for 1, you have to drop someone.
  rosterSpotTax: 12.5, // Deduct 12.5 points from net gain per extra player

  // 4. HISTORICAL TOLERANCE (The "Hands-Off" Culture)
  // Based on your history, the league approves almost everything.
  // This maps the "Raw Imbalance" to the "Fairness Score".
  bands: {
    elite: 90,     // 0-15 point gap
    fair: 75,      // 16-35 point gap
    lopsided: 55,  // 36-60 point gap
    egregious: 30  // 60+ point gap (Buddy Jesus Veto territory)
  }
};