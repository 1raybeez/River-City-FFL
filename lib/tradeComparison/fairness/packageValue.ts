import type { FairnessPlayer } from "./types";

export const STUD_PREMIUM_THRESHOLD = 40;
export const STUD_PREMIUM = 5;
export const SECONDARY_PLAYER_MULTIPLIER = 0.85;
export const POSITIVE_KEEPER_SURPLUS_MULTIPLIER = 1.1;
export const NEGATIVE_KEEPER_SURPLUS_MULTIPLIER = 0.7;
export const KEEPER_SURPLUS_WEIGHT = 0.6;
export const FAAB_WEIGHT = 0.05;
export const ROSTER_TAX_PER_EXTRA_PLAYER = 1.5;

export function adjustedTalent(players: readonly FairnessPlayer[]) {
  return [...players]
    .sort((left, right) => (right.value ?? 0) - (left.value ?? 0))
    .reduce((total, player, index) => {
      const value = player.value ?? 0;
      if (index === 0) return total + value + (value > STUD_PREMIUM_THRESHOLD ? STUD_PREMIUM : 0);
      return total + value * SECONDARY_PLAYER_MULTIPLIER;
    }, 0);
}

export function adjustedKeeperSurplus(player: FairnessPlayer) {
  const surplus = (player.value ?? 0) - (player.keeperCost ?? 0);
  return surplus > 0
    ? surplus * POSITIVE_KEEPER_SURPLUS_MULTIPLIER
    : surplus * NEGATIVE_KEEPER_SURPLUS_MULTIPLIER;
}

export function keeperSurplus(players: readonly FairnessPlayer[]) {
  return players.reduce((total, player) => total + adjustedKeeperSurplus(player), 0);
}

export function rosterTax(playersSent: readonly FairnessPlayer[], playersReceived: readonly FairnessPlayer[]) {
  return Math.max(playersReceived.length - playersSent.length, 0) * ROSTER_TAX_PER_EXTRA_PLAYER;
}
