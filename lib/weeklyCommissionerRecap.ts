import { canonicalAuctionTeams } from "@/lib/auction/canonicalTeamCatalog";
import { getLeagueInfo, getLeagueRosters, getLeagueUsers, getMatchups, getNFLState, LEAGUE_ID, type Matchup } from "@/lib/sleeper";

export const WEEKLY_RECAP_SCHEMA_VERSION = "weekly-commissioner-recap-local-preview-v1" as const;

export type WeeklyRecapTeam = {
  rosterId: number;
  franchiseId: string;
  teamName: string;
  ownerNames: string[];
  points: number;
  record: "1-0" | "0-1";
  pf: number;
  pa: number;
};

export type WeeklyRecapMatchup = {
  matchupId: number;
  winner: WeeklyRecapTeam;
  loser: WeeklyRecapTeam;
  margin: number;
  writeup: string;
};

export type WeeklyCommissionerRecap = {
  schemaVersion: typeof WEEKLY_RECAP_SCHEMA_VERSION;
  season: 2026;
  week: 1;
  generatedAt: string;
  title: string;
  dek: string;
  openingCommissionerTake: string;
  excerpt: string;
  scoreboard: WeeklyRecapMatchup[];
  honors: { highScore: WeeklyRecapTeam; lowScore: WeeklyRecapTeam; closestGame: WeeklyRecapMatchup; biggestBlowout: WeeklyRecapMatchup };
  toughLuck: string;
  standings: WeeklyRecapTeam[];
  week2WatchList: string[];
  closingTake: string;
  sourceMetadata: { leagueId: string; matchupSource: string; stateSource: string; currentSleeperWeek: number; currentRosterCount: number; currentUserCount: number; fetchedAt: string };
};

function score(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function format(value: number) { return value.toFixed(2); }

function teamForRoster(rosterId: number, points: number, record: "1-0" | "0-1", pf: number, pa: number): WeeklyRecapTeam {
  const canonical = canonicalAuctionTeams.find((team) => team.rosterId === rosterId);
  if (!canonical) throw new Error(`Sleeper roster ${rosterId} is not in River City's canonical 2026 team catalog.`);
  return { rosterId, franchiseId: canonical.franchiseId, teamName: canonical.teamName, ownerNames: [...canonical.ownerNames], points, record, pf, pa };
}

function matchupRows(matchups: Matchup[]) {
  const grouped = new Map<number, Matchup[]>();
  for (const row of matchups) {
    if (!Number.isInteger(row.matchup_id)) throw new Error("Week 1 Sleeper data contains a matchup without a matchup ID.");
    const rows = grouped.get(row.matchup_id as number) ?? [];
    rows.push(row);
    grouped.set(row.matchup_id as number, rows);
  }
  if (grouped.size !== 6 || [...grouped.values()].some((rows) => rows.length !== 2)) throw new Error("Week 1 Sleeper data does not contain exactly six two-team matchups.");
  return [...grouped.entries()].sort(([a], [b]) => a - b).map(([matchupId, rows]) => {
    const first = score(rows[0].points); const second = score(rows[1].points);
    if (first === null || second === null || first === second) throw new Error(`Week 1 matchup ${matchupId} is not a finalized, non-tied result.`);
    const winnerRow = first > second ? rows[0] : rows[1]; const loserRow = first > second ? rows[1] : rows[0];
    return { matchupId, winnerRow, loserRow, margin: Math.abs(first - second) };
  });
}

function scheduleRows(matchups: Matchup[]) {
  const grouped = new Map<number, Matchup[]>();
  for (const row of matchups) {
    if (!Number.isInteger(row.matchup_id)) throw new Error("Week 2 Sleeper data contains a matchup without a matchup ID.");
    const rows = grouped.get(row.matchup_id as number) ?? [];
    rows.push(row);
    grouped.set(row.matchup_id as number, rows);
  }
  if (grouped.size !== 6 || [...grouped.values()].some((rows) => rows.length !== 2)) throw new Error("Week 2 Sleeper data does not contain exactly six two-team matchups.");
  return [...grouped.entries()].sort(([a], [b]) => a - b).map(([matchupId, rows]) => ({ matchupId, firstRow: rows[0], secondRow: rows[1] }));
}

function matchupWriteup(winner: WeeklyRecapTeam, loser: WeeklyRecapTeam, margin: number) {
  const pair = new Set([winner.teamName, loser.teamName]);
  if (pair.has("The Shake-N-Bakers") && pair.has("Kissed by a Freckle")) return `The Shake-N-Bakers led everybody with 134.26, but Kissed by a Freckle put 124.36 on the board and made Jordan and Landon earn every bit of the escape. It was the marquee game, the week's closest margin at ${format(margin)}, and a brutal draw for Travis to open 0-1.`;
  if (pair.has("Buckeye Nation") && pair.has("The Art of War")) return `Buckeye Nation posted Week 1's second-highest score and gave The Art of War no room to workshop a comeback. JD's 108.74 was a legitimately good losing score; unfortunately for him, Brian showed up with 129.82.`;
  if (pair.has("The Shepherd") && pair.has("The Gresham Empire")) return `The Shepherd put 105.26 on the board and kept The Gresham Empire at arm's length all afternoon. Rashad's 88.20 never quite found a second gear, leaving Tommy with a 17.06-point opening win.`;
  if (pair.has("Tax Season") && pair.has("Hall Pass")) return `Tax Season filed a winning return in the opener, clearing Hall Pass by ${format(margin)} points. Stan gets the 1-0 receipt; Hall Pass leaves with a score that was not disastrous, just inconveniently paired.`;
  if (pair.has("The Wildcard") && pair.has("Prestigio Mundial")) return `The Wildcard got to 104.20 and kept Prestigio Mundial from finding a foothold. Ray and Jeffrey finished at 86.06, so Wade takes the 1-0 start while Prestigio goes back to the lineup board looking for a bounce-back.`;
  if (pair.has("Hawkins Heroes") && pair.has("The Bearded One")) return `Hawkins Heroes won 91.20 to 63.32, an unusual scoreline for the week's largest winning margin. Aaron gets the blowout badge, while David Besedich can tell himself Week 1 is only one data point.`;
  return `${winner.teamName} beat ${loser.teamName} by ${format(margin)} points in the Week 1 opener.`;
}

export async function buildWeeklyCommissionerRecap(): Promise<WeeklyCommissionerRecap> {
  const fetchedAt = new Date().toISOString();
  const [state, league, weekOne, weekTwo, rosters, users] = await Promise.all([getNFLState(), getLeagueInfo(LEAGUE_ID, { fresh: true }), getMatchups(1, LEAGUE_ID), getMatchups(2, LEAGUE_ID), getLeagueRosters(LEAGUE_ID, { fresh: true }), getLeagueUsers(LEAGUE_ID, { fresh: true })]);
  const raw = matchupRows(weekOne);
  const scores = raw.flatMap(({ winnerRow, loserRow }) => [score(winnerRow.points) as number, score(loserRow.points) as number]);
  const pf = new Map<number, number>(); const pa = new Map<number, number>();
  raw.forEach(({ winnerRow, loserRow }) => { pf.set(winnerRow.roster_id, score(winnerRow.points) as number); pf.set(loserRow.roster_id, score(loserRow.points) as number); pa.set(winnerRow.roster_id, score(loserRow.points) as number); pa.set(loserRow.roster_id, score(winnerRow.points) as number); });
  const rows = raw.map(({ matchupId, winnerRow, loserRow, margin }) => {
    const winner = teamForRoster(winnerRow.roster_id, score(winnerRow.points) as number, "1-0", pf.get(winnerRow.roster_id) as number, pa.get(winnerRow.roster_id) as number);
    const loser = teamForRoster(loserRow.roster_id, score(loserRow.points) as number, "0-1", pf.get(loserRow.roster_id) as number, pa.get(loserRow.roster_id) as number);
    return { matchupId, winner, loser, margin, writeup: matchupWriteup(winner, loser, margin) };
  });
  const standings = rows.flatMap((row) => [row.winner, row.loser]).sort((a, b) => (a.record === b.record ? b.pf - a.pf || a.teamName.localeCompare(b.teamName) : a.record === "1-0" ? -1 : 1));
  const highScore = standings.reduce((best, team) => team.points > best.points ? team : best, standings[0]);
  const lowScore = standings.reduce((worst, team) => team.points < worst.points ? team : worst, standings[0]);
  const closestGame = rows.reduce((best, row) => row.margin < best.margin ? row : best, rows[0]);
  const biggestBlowout = rows.reduce((best, row) => row.margin > best.margin ? row : best, rows[0]);
  const weekTwoRows = scheduleRows(weekTwo);
  const week2WatchList = weekTwoRows.map(({ firstRow, secondRow }) => {
    const first = canonicalAuctionTeams.find((team) => team.rosterId === firstRow.roster_id)?.teamName ?? `Roster ${firstRow.roster_id}`;
    const second = canonicalAuctionTeams.find((team) => team.rosterId === secondRow.roster_id)?.teamName ?? `Roster ${secondRow.roster_id}`;
    const firstRecord = standings.find((team) => team.teamName === first)?.record; const secondRecord = standings.find((team) => team.teamName === second)?.record;
    const pair = new Set([first, second]);
    if (pair.has("The Shake-N-Bakers") && pair.has("Hawkins Heroes")) return `${first} (${firstRecord}) vs ${second} (${secondRecord}) — the first 1-0 collision of the season.`;
    if (pair.has("The Wildcard") && pair.has("Buckeye Nation")) return `${first} (${firstRecord}) vs ${second} (${secondRecord}) — another unbeaten meeting, with Buckeye bringing the league's second-highest Week 1 score.`;
    if (pair.has("Kissed by a Freckle") && pair.has("The Bearded One")) return `${first} (${firstRecord}) vs ${second} (${secondRecord}) — both are seeking their first win, but Travis arrives after a 124.36-point heartbreak.`;
    if (pair.has("Prestigio Mundial") && pair.has("The Art of War")) return `${first} (${firstRecord}) vs ${second} (${secondRecord}) — both enter 0-1 for different reasons: The Art of War lost with 108.74, while Prestigio Mundial needs a bounce-back from 86.06.`;
    if (pair.has("Tax Season") && pair.has("The Gresham Empire")) return `${first} (${firstRecord}) vs ${second} (${secondRecord}) — Tax Season gets its first chance to protect the 1-0 receipt.`;
    if (pair.has("The Shepherd") && pair.has("Hall Pass")) return `${first} (${firstRecord}) vs ${second} (${secondRecord}) — The Shepherd tries to extend its early lead while Hall Pass hunts a cleaner matchup.`;
    return `${first} (${firstRecord}) vs ${second} (${secondRecord}).`;
  });
  const thirdHighestLoser = [...standings].sort((a, b) => b.points - a.points).find((team) => team.record === "0-1");
  return {
    schemaVersion: WEEKLY_RECAP_SCHEMA_VERSION, season: 2026, week: 1, generatedAt: fetchedAt,
    title: "WEEK 1: WELCOME BACK TO THE CHAOS", dek: "Six teams started fast, six teams started searching, and The Shake-N-Bakers set the opening-week pace.",
    openingCommissionerTake: "2026 is underway, and the matchup draw has already reminded us who is really in charge. The Shake-N-Bakers led everybody with 134.26, while Kissed by a Freckle discovered the cruelty of fantasy football by scoring 124.36 and starting 0-1. Six managers are undefeated; the other six are already pretending there is plenty of season left.",
    excerpt: "The Shake-N-Bakers led Week 1 with 134.26, while Kissed by a Freckle scored 124.36 and still opened 0-1 in the first lesson of the 2026 matchup lottery.", scoreboard: rows,
    honors: { highScore, lowScore, closestGame, biggestBlowout },
    toughLuck: thirdHighestLoser ? `${thirdHighestLoser.teamName} had the third-highest score of the week (${format(thirdHighestLoser.points)}) and still opened 0-1. Third-highest score in the league. Still 0-1. Fantasy football remains a cruel and stupid game.` : "",
    standings, week2WatchList,
    closingTake: "The correction buffer means the Week 1 high score is a fact for this recap, not yet a finalized Home Weekly Spotlight publication. Week 2 now gets the floor; the Power Rankings remain a separate measure of current roster strength, not a reward for last Sunday's result.",
    sourceMetadata: { leagueId: LEAGUE_ID, matchupSource: "Sleeper /league/{leagueId}/matchups/{week}", stateSource: "Sleeper /state/nfl", currentSleeperWeek: Number(state.week) || 0, currentRosterCount: rosters.length, currentUserCount: users.length, fetchedAt },
  };
}
