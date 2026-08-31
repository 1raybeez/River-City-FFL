import assert from "node:assert/strict";
import { buildFantasyCalcSnapshot, parseFantasyCalcApiRows } from "../lib/trade/fantasyCalcSnapshotBuilder";
import { joinFantasyCalcMarketContext } from "../lib/tradeComparison/tradeMarketContext";

const apiRows = parseFantasyCalcApiRows([{ player: { id: 1, sleeperId: "8144", name: "Chris Olave", position: "WR", maybeTeam: "NO" }, value: 4885, overallRank: 28, positionRank: 12, trend30Day: 832 }]);
const template = { players: { "8144": { playerId: "8144", playerName: "Chris Olave", position: "WR", nflTeam: "NO" } } };
const redraft = buildFantasyCalcSnapshot({ template, fantasyCalcRows: apiRows, captureDate: "2026-08-31T00:00:00.000Z", generatedAt: "2026-08-31T00:00:00.000Z", inputMode: "fetch", sourceUrl: "https://api.fantasycalc.com/values/current?isDynasty=false&numQbs=1&numTeams=12&ppr=.5", candidateSnapshotPath: "candidate", templatePath: "template" });
assert.equal(redraft.candidate.sourceSettings.isDynasty, false);
assert.match(redraft.candidate.sourceDetail, /Redraft/);
const market = joinFantasyCalcMarketContext({ rosRows: [{ playerId: "8144" }], marketRows: [{ playerId: "8144", rawSourceValue: 4885, fantasycalcOverallRank: 28, fantasycalcPositionRank: 12, fantasycalcTrend30Day: 832, generatedAt: "2026-08-31T00:00:00.000Z", fantasycalcId: "1", fantasycalcSleeperId: "8144" }], now: "2026-08-31T00:00:00.000Z" });
assert.equal(market["8144"]?.fantasyCalcValue, 4885);
assert.equal(market["8144"]?.settings.isDynasty, false);
console.log("FantasyCalc redraft tests passed.");
