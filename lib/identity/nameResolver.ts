// /lib/identity/nameResolver.ts

import { activeManagers } from "@/lib/managers/activeManagers";
import { retiredManagers } from "@/lib/managers/retiredManagers";
import { ActiveManager, RetiredManager } from "@/lib/types/Manager";

// ---------------------------------------------
// 1. COMBINE ALL MANAGERS
// ---------------------------------------------
/**
 * We use a union type here so TypeScript knows these objects 
 * can contain sleeperId, role, etc.
 */
const ALL_MANAGERS: (ActiveManager | RetiredManager)[] = [
  ...activeManagers,
  ...retiredManagers
];

// ---------------------------------------------
// 2. BUILD LOOKUP MAPS
// ---------------------------------------------

// shortName → fullName
const SHORT_TO_FULL: Record<string, string> = {};
// fullName → shortName
const FULL_TO_SHORT: Record<string, string> = {};
// sleeperId → fullName
const SLEEPER_ID_TO_FULL: Record<string, string> = {};

ALL_MANAGERS.forEach((m) => {
  SHORT_TO_FULL[m.shortName] = m.fullName;
  FULL_TO_SHORT[m.fullName] = m.shortName;

  /**
   * Type Guard: Only ActiveManagers (and specific RetiredManagers) 
   * have a sleeperId. This check satisfies the TypeScript compiler.
   */
  if ('sleeperId' in m && m.sleeperId) {
    SLEEPER_ID_TO_FULL[m.sleeperId] = m.fullName;
  }
});

// ---------------------------------------------
// 3. RESOLVERS
// ---------------------------------------------

/**
 * Convert short name → full canonical name
 * Example: "Ray" → "Ray Long"
 */
export function resolveShortNameToFullName(shortName: string): string {
  return SHORT_TO_FULL[shortName] ?? shortName;
}

/**
 * Convert full name → short name
 * Example: "Ray Long" → "Ray"
 */
export function resolveFullNameToShortName(fullName: string): string {
  return FULL_TO_SHORT[fullName] ?? fullName;
}

/**
 * Convert Sleeper owner_id → full name
 * Example: "342828350391230464" → "Ray Long"
 */
export function resolveSleeperIdToFullName(
  ownerId: string
): string | undefined {
  return SLEEPER_ID_TO_FULL[ownerId];
}

/**
 * Convert any name variant → full canonical name
 * Accepts: short name, full name, legacy name
 */
export function resolveManagerKey(name: string): string {
  // If it's already a full name
  if (FULL_TO_SHORT[name]) return name;

  // If it's a short name
  if (SHORT_TO_FULL[name]) return SHORT_TO_FULL[name];

  // Fallback
  return name;
}

// ---------------------------------------------
// 4. TEAM NAME BUILDER (Sleeper API)
// ---------------------------------------------
export function buildTeamNameMap(
  rosters: any[],
  users: any[]
): Record<string, string> {
  const teamNames: Record<string, string> = {};

  const userMap: Record<string, string> = {};
  users.forEach((u) => {
    userMap[u.user_id] = u.metadata?.team_name || u.display_name;
  });

  rosters.forEach((ros) => {
    const fullName = SLEEPER_ID_TO_FULL[ros.owner_id];
    if (!fullName) return;

    const teamName = userMap[ros.owner_id] || "Unknown Team";
    teamNames[fullName] = teamName;
  });

  return teamNames;
}

// ---------------------------------------------
// 5. EXPORTS
// ---------------------------------------------
export const SLEEPER_ID_MAP = SLEEPER_ID_TO_FULL;
export const ALL_MANAGER_IDENTITIES = ALL_MANAGERS;