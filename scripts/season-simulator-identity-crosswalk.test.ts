import assert from "node:assert/strict";
import { normalizeCrosswalkName, normalizeCrosswalkTeam, resolveFantasyProsIdentity, type CrosswalkFantasyProsRecord, type CrosswalkSleeperRecord } from "../lib/seasonSimulator/identityCrosswalk";

const sleeper = (overrides: Partial<CrosswalkSleeperRecord>): CrosswalkSleeperRecord => ({ player_id: "sleeper-1", full_name: "Test Player", position: "RB", team: "BUF", ...overrides });
const provider = (overrides: Partial<CrosswalkFantasyProsRecord>): CrosswalkFantasyProsRecord => ({ fpid: "fp-1", name: "Test Player", position_id: "RB", team_id: "BUF", ...overrides });

assert.equal(normalizeCrosswalkName("Harold Fannin Jr."), "haroldfannin");
assert.equal(normalizeCrosswalkTeam("JAX"), "JAC");
assert.deepEqual(resolveFantasyProsIdentity(provider({sportsdata_player_id: "shared"}), [sleeper({fantasy_data_id: "shared"})]), { sleeperPlayerId: "sleeper-1", method: "EXACT_SHARED_EXTERNAL_ID" });
assert.deepEqual(resolveFantasyProsIdentity(provider({fpid: "known"}), [sleeper({player_id: "known-sleeper"})], new Map([["known", "known-sleeper"]])), { sleeperPlayerId: "known-sleeper", method: "EXACT_KNOWN_CROSSWALK" });
assert.deepEqual(resolveFantasyProsIdentity(provider({name: "Harold Fannin Jr.", position_id: "TE", team_id: "CLE"}), [sleeper({player_id: "fannin", full_name: "Harold Fannin", position: "TE", team: "CLE"})]), { sleeperPlayerId: "fannin", method: "EXACT_NAME_TEAM_POSITION" });
assert.deepEqual(resolveFantasyProsIdentity(provider({position_id: "DST", team_id: "JAC", name: "Jacksonville"}), [sleeper({player_id: "JAX", full_name: "Jacksonville DST", position: "DEF", team: "JAC"})]), { sleeperPlayerId: "JAX", method: "DST_TEAM_CODE" });
assert.deepEqual(resolveFantasyProsIdentity(provider({name: "Cam Little", position_id: "K", team_id: "JAX"}), [sleeper({player_id: "little", full_name: "Cam Little", position: "K", team: "JAX"})]), { sleeperPlayerId: "little", method: "EXACT_NAME_TEAM_POSITION" });
assert.deepEqual(resolveFantasyProsIdentity(provider({name: "Near Player"}), [sleeper({full_name: "Nearly Player"})]), { sleeperPlayerId: null, method: "UNRESOLVED" });
console.log("Season simulator identity crosswalk tests passed.");
