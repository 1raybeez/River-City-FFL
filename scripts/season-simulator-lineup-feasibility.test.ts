import assert from "node:assert/strict";
import { findLegalProjectedLineup, type ProjectedLineupCandidate } from "../lib/seasonSimulator/lineupFeasibility";

const player = (playerId: string, position: ProjectedLineupCandidate["position"]): ProjectedLineupCandidate => ({ playerId, playerName: playerId, position, projectedPoints: 1 });
const legal = [player("qb", "QB"), player("rb", "RB"), player("wr1", "WR"), player("wr2", "WR"), player("te", "TE"), player("flex", "RB"), player("k", "K"), player("def", "DEF")];

assert.ok(findLegalProjectedLineup(legal));
assert.equal(findLegalProjectedLineup(legal.filter(candidate => candidate.position !== "K")), null);
assert.ok(findLegalProjectedLineup(legal.filter(candidate => candidate.playerId !== "flex").concat(player("flex-wr", "WR"))));
assert.equal(findLegalProjectedLineup(legal.filter(candidate => candidate.playerId !== "flex")), null);
console.log("Season simulator lineup feasibility tests passed.");
