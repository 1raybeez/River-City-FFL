import assert from "node:assert/strict";
import { importAuctionSourceExportText } from "./auction-import-source-export";
import { generateMasterviewFromSourceValueFiles } from "./auction-generate-masterview-from-sources";
import { importAuctionAdpSourceText } from "../lib/auction/adpImport";
import { generateAuctionAdpConsensus } from "../lib/auction/adpConsensus";
import { getProductionAuctionValueSourceRegistryEntries } from "../lib/auction/valueSourceRegistry";
import { getAuctionAdpSourceRegistryEntries } from "../lib/auction/adpSourceRegistry";

const sleeperPlayers = {
  "1": { player_id: "1", full_name: "Josh Allen", position: "QB", team: "BUF" },
  "2": { player_id: "2", full_name: "Bijan Robinson", position: "RB", team: "ATL" },
  "3": { player_id: "3", full_name: "Ja'Marr Chase", position: "WR", team: "CIN" },
  "4": { player_id: "4", full_name: "Brock Bowers", position: "TE", team: "LV" },
  "5": { player_id: "5", full_name: "Suffix Player", position: "WR", team: "BUF" },
};

const originalFetch = globalThis.fetch;
globalThis.fetch = async () =>
  new Response(JSON.stringify(sleeperPlayers), {
    headers: { "content-type": "application/json" },
  });

async function importAuction(source: string, text: string) {
  const result = await importAuctionSourceExportText({
    source,
    seasonYear: 2026,
    sourceFilename: `${source}-fixture.csv`,
    inputFile: `${source}-fixture.csv`,
    sourceValuesFile: `${source}-fixture.json`,
    reviewFile: `${source}-fixture-review.json`,
    text,
    writeFiles: false,
  });
  return { ...result.valuesOutput, filePath: `${source}-fixture.json`, filename: `${source}-fixture.json` };
}

async function importAdp(sourceKey: "fantasypros-adp" | "rotowire-adp" | "lineupexperts-adp" | "draftsharks-adp" | "fantasyfootballers-adp", text: string) {
  return (
    await importAuctionAdpSourceText({
      sourceKey,
      season: 2026,
      sourceFilename: `${sourceKey}-fixture.csv`,
      text,
      writeFiles: false,
    })
  ).valuesOutput;
}

async function main() {
try {
  assert.deepEqual(
    getProductionAuctionValueSourceRegistryEntries().map((entry) => entry.id),
    ["fantasypros", "rotowire", "lineupexperts", "draftsharks", "fantasyfootballers"]
  );
  assert.deepEqual(
    getAuctionAdpSourceRegistryEntries(2026).map((entry) => entry.sourceKey),
    ["fantasypros-adp", "rotowire-adp", "lineupexperts-adp", "draftsharks-adp", "fantasyfootballers-adp"]
  );

  const auctionFiles = await Promise.all([
    importAuction("fantasypros", "player,position,team,value\nJosh Allen,QB,BUF,20\n"),
    importAuction("rotowire", "Value,Name,Team,Pos\n22,Josh Allen,BUF,QB\n"),
    importAuction("lineupexperts", '"Player","$ Value","Team","Pos"\n"Josh Allen","24","BUF","QB"\n'),
    importAuction("draftsharks", "Rank,Team,Player,Fantsy Position,AuctionMarketValue,DS AuctionValue\n1,BUF,Josh Allen,QB,26,28\n"),
    importAuction("fantasyfootballers", "player,position,team,auction_value,budget,risk,upside\nJosh Allen,QB,BUF,28,200,1,9\n"),
  ]);
  assert.equal(auctionFiles[3].rows[0]?.auctionValue, 26, "DraftSharks uses AuctionMarketValue.");
  assert.equal(auctionFiles[4].rows[0]?.auctionValue, 28, "Footballers uses auction_value.");
  assert.equal(auctionFiles[4].rows[0]?.raw["raw:risk"], "1");

  const currentFootballersAuction = await importAuction(
    "fantasyfootballers",
    "Name,Position,Team,Rank,$,Points\nJosh Allen,QB,BUF,1,$41 ,367.2\n"
  );
  assert.equal(
    currentFootballersAuction.rows[0]?.auctionValue,
    41,
    "Current Footballers exports use the $ column for auction dollars."
  );

  const lineupexpertsArtifact = await importAuction(
    "lineupexperts",
    '"Player","$ Value","Team","Pos"\n"","7","",""\n"Josh Allen","24","BUF","QB"\n'
  );
  assert.equal(
    lineupexpertsArtifact.rows.some((row) => row.playerNameFromSource === ""),
    false,
    "LineupExperts empty artifact rows are ignored."
  );

  const fiveSource = generateMasterviewFromSourceValueFiles({
    sourceFiles: auctionFiles,
    generatedAt: "2026-08-15T00:00:00.000Z",
    sourceDirectory: "fixture",
    outputDirectory: "fixture",
  }).outputs[0];
  const Josh = fiveSource.rows.find((row) => row.playerName === "Josh Allen");
  assert.equal(Josh?.sourceCount, 5);
  assert.equal(Josh?.averageValue, 24);

  const missingValue = await importAuction("fantasyfootballers", "player,position,team,auction_value,budget\nJosh Allen,QB,BUF,,200\n");
  const fourSource = generateMasterviewFromSourceValueFiles({
    sourceFiles: [...auctionFiles.slice(0, 4), missingValue],
    generatedAt: "2026-08-15T00:00:00.000Z",
    sourceDirectory: "fixture",
    outputDirectory: "fixture",
  }).outputs[0].rows.find((row) => row.playerName === "Josh Allen");
  assert.equal(fourSource?.sourceCount, 4);
  assert.equal(fourSource?.averageValue, 23);

  const zeroValue = await importAuction("fantasyfootballers", "player,position,team,auction_value,budget\nJosh Allen,QB,BUF,0,200\n");
  const zeroSource = generateMasterviewFromSourceValueFiles({
    sourceFiles: [...auctionFiles.slice(0, 4), zeroValue],
    generatedAt: "2026-08-15T00:00:00.000Z",
    sourceDirectory: "fixture",
    outputDirectory: "fixture",
  }).outputs[0].rows.find((row) => row.playerName === "Josh Allen");
  assert.equal(zeroSource?.sourceCount, 5);
  assert.equal(zeroSource?.averageValue, 18.4);

  const duplicateSource = await importAuction("fantasyfootballers", "player,position,team,auction_value,budget\nJosh Allen,QB,BUF,28,200\nJosh Allen,QB,BUF,40,200\n");
  const duplicateResult = generateMasterviewFromSourceValueFiles({
    sourceFiles: [...auctionFiles.slice(0, 4), duplicateSource],
    generatedAt: "2026-08-15T00:00:00.000Z",
    sourceDirectory: "fixture",
    outputDirectory: "fixture",
  }).outputs[0].rows.find((row) => row.playerName === "Josh Allen");
  assert.equal(duplicateResult?.sourceCount, 5);
  assert.equal(duplicateResult?.averageValue, 24);

  const adpFiles = await Promise.all([
    importAdp("fantasypros-adp", "Rank,Player (Bye),POS,AVG\n23,Josh Allen BUF (7),QB1,23\n"),
    importAdp("rotowire-adp", "ADP,Name,Team,Pos,Consensus,Underdog,Sleeper\n23,Josh Allen,BUF,QB,23,22,24\n"),
    importAdp("lineupexperts-adp", 'Rk,,Player,Team,Position,ADP\n23,,Josh Allen,BUF,QB,"23.0"\n'),
    importAdp("draftsharks-adp", '"Player Name","Player Team","Player Position","Consensus: Redraft 0.5 PPR ADP"\nJosh Allen,BUF,QB,2.11\n'),
    importAdp("fantasyfootballers-adp", "player,position,team,adp_round_pick,adp_overall\nJosh Allen,QB,BUF,2.11,23\n"),
  ]);
  const currentFootballersAdp = await importAdp(
    "fantasyfootballers-adp",
    '"Rank","Name","Team","Pos","Pos","Avg","Sleeper","ESPN","Yahoo","Underdog"\n"[object Object]","Josh Allen","BUF","QB","QB","2.03","2.03","2.04","2.03","2.03"\n'
  );
  assert.equal(
    currentFootballersAdp.rows[0]?.overallAdp,
    15,
    "Current Footballers Avg round/pick is the consensus overall ADP."
  );
  const footballersBoundary = await importAdp(
    "fantasyfootballers-adp",
    '"Rank","Name","Team","Pos","Pos","Avg","Sleeper","ESPN","Yahoo","Underdog"\n"[object Object]","Josh Allen","BUF","QB","QB","18.12","-","-","-","18.12"\n'
  );
  assert.equal(
    footballersBoundary.rows[0]?.sentinelReason,
    "fantasyfootballers-underdog-boundary"
  );
  const footballersLegitimate216 = await importAdp(
    "fantasyfootballers-adp",
    '"Rank","Name","Team","Pos","Pos","Avg","Sleeper","ESPN","Yahoo","Underdog"\n"216","Josh Allen","BUF","QB","QB","18.12","18.12","18.12","18.12","18.12"\n'
  );
  assert.equal(footballersLegitimate216.rows[0]?.overallAdp, 216);
  assert.equal(footballersLegitimate216.rows[0]?.sentinelReason, null);
  const rotoBoundary = await importAdp(
    "rotowire-adp",
    "ADP,Name,Team,Pos,Consensus,Ian,Jagger,Jim,Average,Underdog,Sleeper,Sleeper,Status,Injury\nT278,Josh Allen,BUF,QB,,,,,216.00,216.00,-,216.00,,\n"
  );
  assert.equal(rotoBoundary.rows[0]?.overallAdp, 216);
  assert.equal(rotoBoundary.rows[0]?.sentinelReason, "rotowire-underdog-boundary");
  const rotoLegitimate216 = await importAdp(
    "rotowire-adp",
    "ADP,Name,Team,Pos,Consensus,Ian,Jagger,Jim,Average,Underdog,Sleeper,Sleeper,Status,Injury\n216,Josh Allen,BUF,QB,,,,,216.00,216.00,216.00,216.00,,\n"
  );
  assert.equal(rotoLegitimate216.rows[0]?.overallAdp, 216);
  assert.equal(rotoLegitimate216.rows[0]?.sentinelReason, null);
  const repairedConsensus = generateAuctionAdpConsensus({
    sourceFiles: [footballersBoundary, rotoLegitimate216],
    generatedAt: "2026-08-25T00:00:00.000Z",
  });
  assert.equal(repairedConsensus.rows[0]?.consensusOverallAdp, 216);
  assert.equal(repairedConsensus.sourceValueCount, 1);
  assert.equal(repairedConsensus.skippedSourceValueCount, 1);
  assert.equal(adpFiles[2].rows[0]?.overallAdp, 23, "Lineup Experts ADP is an overall-pick value.");
  assert.equal(adpFiles[3].rows[0]?.overallAdp, 23, "DraftSharks round.pick converts using 12 teams.");
  assert.equal(adpFiles[4].rows[0]?.overallAdp, 23, "Footballers uses explicit overall ADP once.");
  const adpConsensus = generateAuctionAdpConsensus({ sourceFiles: adpFiles, generatedAt: "2026-08-15T00:00:00.000Z" });
  assert.equal(adpConsensus.rows[0]?.sourceCount, 5);
  assert.equal(adpConsensus.rows[0]?.consensusOverallAdp, 23);

  const ambiguousPlayers = {
    ...sleeperPlayers,
    "6": { player_id: "6", full_name: "Twin Player", position: "WR", team: "BUF" },
    "7": { player_id: "7", full_name: "Twin Player", position: "WR", team: "BUF" },
  };
  globalThis.fetch = async () => new Response(JSON.stringify(ambiguousPlayers));
  const ambiguous = await importAdp("fantasyfootballers-adp", "player,position,team,adp_overall\nTwin Player,WR,BUF,50\n");
  assert.equal(ambiguous.rows[0]?.matchType, "ambiguous");
  assert.equal(generateAuctionAdpConsensus({ sourceFiles: [ambiguous] }).rows.length, 0);
} finally {
  globalThis.fetch = originalFetch;
}

console.log("Five-source auction and ADP pipeline checks passed (fixtures only; no refresh or writes).");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
