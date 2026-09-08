import type { DraftReportV2Snapshot, V2Player } from "@/lib/draftReportV2/types";
import { calculateDraftQuality } from "@/lib/draftReportV2/draftQuality";
import { calculateDraftQualityCandidates } from "@/lib/draftReportV2/calibration";
import { DRAFT_QUALITY_WEIGHTS, POSITION_GROUP_WEIGHTS } from "@/lib/draftReportV2/types";

type CorePosition = "QB" | "RB" | "WR" | "TE";
const core: readonly CorePosition[] = ["QB", "RB", "WR", "TE"];
const flexPositions = new Set(["RB", "WR", "TE"]);
const round = (value: number) => Math.round(value * 100) / 100;
function best(players: readonly V2Player[], count: number, used = new Set<string>()) { return [...players].filter((player) => !used.has(player.playerId) && player.evidence.qualityScore !== null).sort((a, b) => (b.evidence.qualityScore ?? -1) - (a.evidence.qualityScore ?? -1) || a.playerId.localeCompare(b.playerId)).slice(0, count); }

export type V2Contribution = { playerId: string; playerName: string; position: string | null; evidenceScore: number | null; role: string; componentWeight: number; components: readonly string[] };
export type V2ContributionTeam = { franchiseId: string; rosterId: number; draftTimeTeamName: string; currentTeamName: string; components: Record<string, readonly V2Contribution[]>; allPlayers: readonly V2Contribution[] };

export function buildDraftQualityContributionMap(snapshot: DraftReportV2Snapshot) {
  const playerById = new Map(snapshot.players.map((player) => [player.playerId, player]));
  return snapshot.teams.map((team): V2ContributionTeam => {
    const players = team.playerIds.map((id) => playerById.get(id)).filter((player): player is V2Player => Boolean(player));
    const used = new Set<string>();
    const components: Record<string, V2Contribution[]> = { "STARTING LINEUP": [], "QB ROOM": [], "RB ROOM": [], "WR ROOM": [], "TE ROOM": [], "FLEX DIAGNOSTIC": [], DEPTH: [] };
    const add = (name: string, selected: readonly V2Player[], role: (player: V2Player, index: number) => string) => { const weight = selected.length ? round(1 / selected.length) : 0; components[name] = selected.map((player, index) => ({ playerId: player.playerId, playerName: player.playerName, position: player.position, evidenceScore: player.evidence.qualityScore, role: role(player, index), componentWeight: weight, components: [] })); };
    const lineup: V2Player[] = [];
    for (const position of core) { const selected = best(players.filter((player) => player.position === position), snapshot.rosterRequirements.requiredStarterSlots[position] ?? 0, used); selected.forEach((player) => used.add(player.playerId)); lineup.push(...selected); }
    const flex = best(players.filter((player) => flexPositions.has(player.position ?? "")), snapshot.rosterRequirements.flexSlots, used); flex.forEach((player) => used.add(player.playerId)); lineup.push(...flex);
    add("STARTING LINEUP", lineup, (_player, index) => index < lineup.length - flex.length ? `starter-${index + 1}` : `FLEX${index - (lineup.length - flex.length) + 1}`);
    for (const position of core) { const selected = best(players.filter((player) => player.position === position), (snapshot.rosterRequirements.requiredStarterSlots[position] ?? 0) + 1); add(`${position} ROOM`, selected, (player) => selected.indexOf(player) < (snapshot.rosterRequirements.requiredStarterSlots[position] ?? 0) ? "starter contribution" : "capped useful backup"); }
    add("FLEX DIAGNOSTIC", best(players.filter((player) => flexPositions.has(player.position ?? "")), snapshot.rosterRequirements.flexSlots + 1), (_player, index) => index === 0 ? "best FLEX option" : "eligible FLEX option");
    add("DEPTH", core.flatMap((position) => best(players.filter((player) => player.position === position), 2, used)), (player) => `capped depth ${player.position}`);
    const byPlayer = new Map<string, string[]>(); Object.entries(components).forEach(([name, rows]) => rows.forEach((row) => { byPlayer.set(row.playerId, [...(byPlayer.get(row.playerId) ?? []), name]); }));
    Object.values(components).forEach((rows) => rows.forEach((row) => { row.components = byPlayer.get(row.playerId) ?? []; }));
    return { franchiseId: team.franchiseId, rosterId: team.rosterId, draftTimeTeamName: team.historicalDraftTimeTeamName, currentTeamName: team.currentDisplayName, components, allPlayers: [...byPlayer.entries()].map(([playerId, names]) => { const player = playerById.get(playerId)!; return { playerId, playerName: player.playerName, position: player.position, evidenceScore: player.evidence.qualityScore, role: names.join(" + "), componentWeight: 0, components: names }; }).sort((a, b) => a.playerId.localeCompare(b.playerId)) };
  });
}

export function buildFormulaCReport(snapshot: DraftReportV2Snapshot) {
  const quality = calculateDraftQuality(snapshot);
  const formula = calculateDraftQualityCandidates(snapshot).find((candidate) => candidate.formula === "C");
  if (!formula) throw new Error("Formula C diagnostic is unavailable.");
  return formula.teams.map((team) => { const base = quality.teams.find((candidate) => candidate.franchiseId === team.franchiseId)!; const positionGroupScore = round(([base.components.qbRoom.score, base.components.rbRoom.score, base.components.wrRoom.score, base.components.teRoom.score].flatMap((score, index) => score === null ? [] : [score * Object.values(POSITION_GROUP_WEIGHTS)[index]]).reduce((sum, value) => sum + value, 0))); const contributions = { startingLineup: round((base.components.startingLineup.score ?? 0) * DRAFT_QUALITY_WEIGHTS.startingLineup), positionGroup: round(positionGroupScore * DRAFT_QUALITY_WEIGHTS.positionGroup), depth: round((base.components.depth.score ?? 0) * DRAFT_QUALITY_WEIGHTS.depth) }; return { franchiseId: team.franchiseId, starterScore: base.components.startingLineup.score, starterContribution: contributions.startingLineup, positionGroupScore, positionGroupContribution: contributions.positionGroup, depthScore: base.components.depth.score, depthContribution: contributions.depth, rawDraftQuality: round(contributions.startingLineup + contributions.positionGroup + contributions.depth), draftQualityRank: team.formulaRank, contributions }; });
}
