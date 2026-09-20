import assert from "node:assert/strict";
import { qualifyCanonicalPlayoffs, simulateCanonicalPlayoffBracket } from "../lib/predictor/playoffEngine";

const teams = Array.from({ length: 12 }, (_, index) => ({ franchiseId: `team-${index + 1}`, teamName: `Team ${index + 1}`, wins: 10 - index, losses: index, ties: 0, pointsFor: 200 - index, pointsAgainst: 100 + index }));
const qualification = qualifyCanonicalPlayoffs(teams);
assert.equal(qualification.status, "READY");
assert.deepEqual(qualification.seeds.map(team => team.seed), [1, 2, 3, 4, 5, 6]);
const bracket = simulateCanonicalPlayoffBracket({ qualification, scoreFor: ({ first, second, week }) => week === 15 ? { firstScore: first.seed === 3 ? 120 : 100, secondScore: second.seed === 6 ? 90 : 95 } : week === 16 ? { firstScore: 110, secondScore: 100 } : { firstScore: 115, secondScore: 105 } });
assert.equal(bracket.games.length, 5);
assert.deepEqual(bracket.games.map(game => game.week), [15, 15, 16, 16, 17]);
assert.equal(bracket.champion.seed, 1);
const tied = qualifyCanonicalPlayoffs(teams.map((team, index) => index < 2 ? { ...team, wins: 8, pointsFor: 150, pointsAgainst: 100 } : team));
assert.equal(tied.status, "COMMISSIONER_PLATFORM_RESOLUTION_REQUIRED");
assert.throws(() => simulateCanonicalPlayoffBracket({ qualification: tied, scoreFor: () => ({ firstScore: 1, secondScore: 1 }) }), /resolved canonical seeds/);
console.log("Predictor Phase 5 playoff tests passed.");
