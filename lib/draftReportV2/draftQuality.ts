import type { DraftReportV2Snapshot, DraftQualityTeam, RankedComponent, V2Player } from "@/lib/draftReportV2/types";

type Position = "QB" | "RB" | "WR" | "TE";
const CORE: readonly Position[] = ["QB", "RB", "WR", "TE"];
const FLEX = new Set(["RB", "WR", "TE"]);
const round = (value: number) => Math.round(value * 100) / 100;

function rank(value: number | null, values: readonly (number | null)[]) {
  return value === null ? null : values.filter((candidate): candidate is number => candidate !== null && candidate > value).length + 1;
}
function component(score: number | null): RankedComponent { return { score: score === null ? null : round(score), leagueRank: null }; }
function best(players: readonly V2Player[], count: number, used = new Set<string>()) { return [...players].filter((player) => !used.has(player.playerId) && player.evidence.qualityScore !== null).sort((a, b) => (b.evidence.qualityScore ?? -1) - (a.evidence.qualityScore ?? -1) || a.playerId.localeCompare(b.playerId)).slice(0, count); }
function average(players: readonly V2Player[]) { const values = players.flatMap((player) => player.evidence.qualityScore === null ? [] : [player.evidence.qualityScore]); return values.length ? round(values.reduce((sum, value) => sum + value, 0) / values.length) : null; }
function averageScores(values: readonly (number | null)[]) { const covered = values.filter((value): value is number => value !== null); return covered.length ? round(covered.reduce((sum, value) => sum + value, 0) / covered.length) : null; }

export function calculateDraftQuality(snapshot: DraftReportV2Snapshot) {
  const playerById = new Map(snapshot.players.map((player) => [player.playerId, player]));
  const preliminary: DraftQualityTeam[] = snapshot.teams.map((team) => {
    const players = team.playerIds.map((id) => playerById.get(id)).filter((player): player is V2Player => Boolean(player));
    const used = new Set<string>();
    const lineup: { slot: string; playerId: string | null; playerName: string | null; qualityScore: number | null }[] = [];
    for (const position of CORE) {
      const required = snapshot.rosterRequirements.requiredStarterSlots[position] ?? 0;
      best(players.filter((player) => player.position === position), required, used).forEach((player, index) => { used.add(player.playerId); lineup.push({ slot: `${position}${index + 1}`, playerId: player.playerId, playerName: player.playerName, qualityScore: player.evidence.qualityScore }); });
    }
    const flexRequired = snapshot.rosterRequirements.flexSlots;
    best(players.filter((player) => FLEX.has(player.position ?? "")), flexRequired, used).forEach((player, index) => { used.add(player.playerId); lineup.push({ slot: `FLEX${index + 1}`, playerId: player.playerId, playerName: player.playerName, qualityScore: player.evidence.qualityScore }); });
    const room = (position: Position) => best(players.filter((player) => player.position === position), (snapshot.rosterRequirements.requiredStarterSlots[position] ?? 0) + 1);
    const flexPlayers = best(players.filter((player) => FLEX.has(player.position ?? "")), flexRequired + 1);
    const depthPlayers = CORE.flatMap((position) => best(players.filter((player) => player.position === position), 2, used));
    const components = { startingLineup: component(average(lineup.flatMap((row) => row.playerId ? [playerById.get(row.playerId)!] : []))), qbRoom: component(average(room("QB"))), rbRoom: component(average(room("RB"))), wrRoom: component(average(room("WR"))), teRoom: component(average(room("TE"))), flex: component(average(flexPlayers)), depth: component(average(depthPlayers)) };
    const qualityParts = [components.startingLineup.score, components.qbRoom.score, components.rbRoom.score, components.wrRoom.score, components.teRoom.score, components.flex.score, components.depth.score].filter((value): value is number => value !== null);
    const draftQuality = component(averageScores(qualityParts));
    const coverage = players.length === 0 ? "MISSING" : players.every((player) => player.evidence.qualityScore !== null) ? "COMPLETE" : "PARTIAL";
    return { franchiseId: team.franchiseId, rosterId: team.rosterId, teamName: team.currentDisplayName, startingLineup: lineup, components, draftQuality, coverage, biggestStrength: "", biggestWeakness: "" };
  });
  const keys = ["startingLineup", "qbRoom", "rbRoom", "wrRoom", "teRoom", "flex", "depth"] as const;
  for (const key of keys) { const scores = preliminary.map((team) => team.components[key].score); preliminary.forEach((team) => { team.components[key].leagueRank = rank(team.components[key].score, scores); }); }
  const qualityScores = preliminary.map((team) => team.draftQuality.score);
  preliminary.forEach((team) => { team.draftQuality.leagueRank = rank(team.draftQuality.score, qualityScores); });
  const labels: Record<(typeof keys)[number], string> = { startingLineup: "STARTING LINEUP", qbRoom: "QB ROOM", rbRoom: "RB ROOM", wrRoom: "WR ROOM", teRoom: "TE ROOM", flex: "FLEX", depth: "DEPTH" };
  preliminary.forEach((team) => { const ordered = [...keys].sort((a, b) => (team.components[a].leagueRank ?? 99) - (team.components[b].leagueRank ?? 99) || a.localeCompare(b)); const strength = ordered[0]; const weakness = ordered[ordered.length - 1]; team.biggestStrength = strength ? `${labels[strength]} — #${team.components[strength].leagueRank ?? "?"} IN LEAGUE` : "EVIDENCE COVERAGE UNAVAILABLE"; team.biggestWeakness = weakness ? `${labels[weakness]} — #${team.components[weakness].leagueRank ?? "?"} IN LEAGUE` : "EVIDENCE COVERAGE UNAVAILABLE"; });
  return { modelVersion: "draft-quality-v1" as const, formula: "Draft Quality diagnostic = equal-weight mean of optimized starting lineup, QB/RB/WR/TE rooms, FLEX, and capped depth. Components are player-quality-only and price-free; final grade is not defined.", teams: preliminary.sort((a, b) => (a.draftQuality.leagueRank ?? 99) - (b.draftQuality.leagueRank ?? 99) || a.franchiseId.localeCompare(b.franchiseId)) };
}
