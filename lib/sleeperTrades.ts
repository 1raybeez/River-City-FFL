import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase"; // Adjust this if your firebase file exports 'firestore'

// Your specific League IDs by season
export const LEAGUE_IDS: Record<number, string> = {
  2019: "466663208728391680",
  2020: "583513420586848256",
  2021: "732007617403125760",
  2022: "864186418971418624",
  2023: "991050212048510976",
  2024: "1050800645063065600",
  2025: "1126004844838466764",
  2026: "1126004844838466764" // Update this when the 2026 league is created
};

/**
 * Fetches all NFL players from Sleeper and merges them with 
 * custom valuation data from your Firestore database.
 */
export async function getAllPlayers() {
  try {
    // 1. Fetch raw data from Sleeper (Cached by browser for performance)
    const response = await fetch("https://api.sleeper.app/v1/players/nfl");
    const sleeperPlayers = await response.json();

    // 2. Fetch your custom valuations from Firestore
    // This looks for your calculated River City FFL scores
    const valuationSnap = await getDocs(collection(db, "player_stats"));
    const valuations: Record<string, any> = {};
    
    valuationSnap.forEach((doc) => {
      valuations[doc.id] = doc.data();
    });

    // 3. Merge the data
    const mergedPlayers: Record<string, any> = {};
    
    Object.keys(sleeperPlayers).forEach((id) => {
      const sleeperData = sleeperPlayers[id];
      const customData = valuations[id] || {};

      mergedPlayers[id] = {
        ...sleeperData,
        // Use your engine's score if available, otherwise 0
        totalValueScore: customData.totalValueScore || 0,
        keeperCost: customData.keeperCost || 0,
        // Ensure full_name exists (some Sleeper entries are weird)
        full_name: sleeperData.full_name || `${sleeperData.first_name} ${sleeperData.last_name}`
      };
    });

    return mergedPlayers;
  } catch (error) {
    console.error("Error fetching or merging player data:", error);
    return {};
  }
}

/**
 * Fetches the rosters for a specific league ID.
 */
export async function getLeagueRosters(leagueId: string) {
  try {
    const response = await fetch(`https://api.sleeper.app/v1/league/${leagueId}/rosters`);
    if (!response.ok) throw new Error("Failed to fetch rosters");
    return await response.json();
  } catch (error) {
    console.error("Error fetching rosters:", error);
    return [];
  }
}

/**
 * Fetches league users (managers) to map names to IDs.
 */
export async function getLeagueUsers(leagueId: string) {
  try {
    const response = await fetch(`https://api.sleeper.app/v1/league/${leagueId}/users`);
    if (!response.ok) throw new Error("Failed to fetch league users");
    return await response.json();
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
}