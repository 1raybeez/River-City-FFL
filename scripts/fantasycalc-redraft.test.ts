import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { buildFantasyCalcSnapshot, parseFantasyCalcApiRows } from "../lib/trade/fantasyCalcSnapshotBuilder";
import { PUBLISHED_FANTASYCALC_CHECKSUM, readPublishedFantasyCalcArtifact, validateFantasyCalcArtifact } from "../lib/tradeComparison/fantasyCalcArtifact";
import { joinFantasyCalcMarketContext } from "../lib/tradeComparison/tradeMarketContext";

const apiRows = parseFantasyCalcApiRows([{ player: { id: 1, sleeperId: "8144", name: "Chris Olave", position: "WR", maybeTeam: "NO" }, value: 4885, overallRank: 28, positionRank: 12, trend30Day: 832 }]);
const template = { players: { "8144": { playerId: "8144", playerName: "Chris Olave", position: "WR", nflTeam: "NO" } } };
const redraft = buildFantasyCalcSnapshot({ template, fantasyCalcRows: apiRows, captureDate: "2026-08-31T00:00:00.000Z", generatedAt: "2026-08-31T00:00:00.000Z", inputMode: "fetch", sourceUrl: "https://api.fantasycalc.com/values/current?isDynasty=false&numQbs=1&numTeams=12&ppr=.5", candidateSnapshotPath: "candidate", templatePath: "template" });
assert.equal(redraft.candidate.sourceSettings.isDynasty, false);
assert.match(redraft.candidate.sourceDetail, /Redraft/);
const market = joinFantasyCalcMarketContext({ rosRows: [{ playerId: "8144" }], marketRows: [{ playerId: "8144", rawSourceValue: 4885, fantasycalcOverallRank: 28, fantasycalcPositionRank: 12, fantasycalcTrend30Day: 832, generatedAt: "2026-08-31T00:00:00.000Z", fantasycalcId: "1", fantasycalcSleeperId: "8144" }], now: "2026-08-31T00:00:00.000Z" });
assert.equal(market["8144"]?.fantasyCalcValue, 4885);
assert.equal(market["8144"]?.settings.isDynasty, false);

async function main() {
  const publishedPath = "data/trade-analyzer/current-value/published/fantasycalc-redraft-2026-2026-08-31.json";
  const publishedRaw = await readFile(publishedPath, "utf8");
  const published = JSON.parse(publishedRaw) as { players: Record<string, Record<string, unknown>>; sourceSettings: Record<string, unknown> };
  assert.equal(createHash("sha256").update(publishedRaw).digest("hex"), PUBLISHED_FANTASYCALC_CHECKSUM);
  assert.equal(validateFantasyCalcArtifact(published).valid, true);
  assert.equal(Object.keys(published.players).length, 145);
  assert.deepEqual(published.sourceSettings, { isDynasty: false, numQbs: "1", numTeams: "12", ppr: ".5", tePremium: false, includeAdp: false });
  const loaded = readPublishedFantasyCalcArtifact();
  assert.equal(loaded.valid, true);
  assert.equal(loaded.playerCount, 145);
  assert.equal(loaded.checksum, PUBLISHED_FANTASYCALC_CHECKSUM);
  assert.deepEqual(loaded.rows.get("12545"), { playerId: "12545", rawSourceValue: 466, fantasycalcOverallRank: 132, fantasycalcPositionRank: 20, fantasycalcTrend30Day: -149, generatedAt: "2026-08-31T20:36:31.331Z", fantasycalcName: "Tyler Shough", fantasycalcId: "12686", fantasycalcSleeperId: "12545" });
  assert.deepEqual(loaded.rows.get("7523"), { playerId: "7523", rawSourceValue: 1624, fantasycalcOverallRank: 76, fantasycalcPositionRank: 10, fantasycalcTrend30Day: -544, generatedAt: "2026-08-31T20:36:31.331Z", fantasycalcName: "Trevor Lawrence", fantasycalcId: "1086", fantasycalcSleeperId: "7523" });
  assert.deepEqual(loaded.rows.get("7526"), { playerId: "7526", rawSourceValue: 3220, fantasycalcOverallRank: 47, fantasycalcPositionRank: 20, fantasycalcTrend30Day: 150, generatedAt: "2026-08-31T20:36:31.331Z", fantasycalcName: "Jaylen Waddle", fantasycalcId: "1409", fantasycalcSleeperId: "7526" });
  assert.equal(validateFantasyCalcArtifact({ ...published, players: { ...published.players, duplicate: published.players["12545"] } }).valid, false);
  assert.equal(validateFantasyCalcArtifact({ ...published, sourceSettings: { ...published.sourceSettings, isDynasty: true } }).valid, false);
  assert.equal(validateFantasyCalcArtifact(null).valid, false);
  console.log("Published FantasyCalc artifact validation, checksum, and known-value checks passed.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
