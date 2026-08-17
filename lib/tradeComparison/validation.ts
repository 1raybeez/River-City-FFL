import type { CurrentFranchiseRoster, TradeComparisonInput, TradeComparisonValidationError } from "./types";

export function validateTradeComparisonInput(input: TradeComparisonInput, rosters: readonly CurrentFranchiseRoster[]): TradeComparisonValidationError[] {
  const errors: TradeComparisonValidationError[] = [];
  const sides = [input?.sideA, input?.sideB].filter(Boolean);
  if (sides.length !== 2) {
    return [{ code: "INVALID_SIDE_COUNT", message: "Select exactly two franchises." }];
  }

  const sideA = input.sideA;
  const sideB = input.sideB;
  const franchiseA = rosters.find((roster) => roster.franchiseId === sideA.franchiseId);
  const franchiseB = rosters.find((roster) => roster.franchiseId === sideB.franchiseId);
  if (!franchiseA || !franchiseB) errors.push({ code: "UNKNOWN_FRANCHISE", message: "Select two recognized River City franchises." });
  if (sideA.franchiseId === sideB.franchiseId) errors.push({ code: "SAME_FRANCHISE", message: "Select two different franchises." });
  if ((franchiseA && !franchiseA.available) || (franchiseB && !franchiseB.available)) {
    errors.push({ code: "ROSTER_UNAVAILABLE", message: "Current roster data is unavailable for one or more selected franchises." });
  }
  if (sideA.playerIds.length === 0 || sideB.playerIds.length === 0) {
    errors.push({ code: "EMPTY_PACKAGE", message: "Select at least one current player on each side." });
  }

  const seen = new Set<string>();
  [sideA, sideB].forEach((side) => {
    const franchise = rosters.find((roster) => roster.franchiseId === side.franchiseId);
    const rostered = new Set(franchise?.players.map((player) => player.playerId) ?? []);
    const packageSeen = new Set<string>();
    side.playerIds.forEach((playerId) => {
      if (packageSeen.has(playerId)) errors.push({ code: "DUPLICATE_PLAYER", message: "A player cannot be selected more than once." });
      packageSeen.add(playerId);
      if (seen.has(playerId)) errors.push({ code: "DUPLICATE_PLAYER", message: "The same player cannot appear on both sides." });
      seen.add(playerId);
      if (franchise && franchise.available && !rostered.has(playerId)) {
        errors.push({ code: "PLAYER_NOT_ROSTERED", message: "Player is not currently rostered by the selected franchise." });
      }
    });
  });
  return errors;
}
