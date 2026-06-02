// ---------------------------------------------------------
// File: /lib/sleeper/getTransactions.ts
// Purpose: Fetch Sleeper league transactions for a given week
// ---------------------------------------------------------

export async function getTransactions(week: number, leagueId: string) {
  const url = `https://api.sleeper.app/v1/league/${leagueId}/transactions/${week}`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to fetch transactions for week ${week}`);
  }

  return res.json();
}
