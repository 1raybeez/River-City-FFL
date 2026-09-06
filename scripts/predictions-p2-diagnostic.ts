import { loadCurrentPredictionInputSnapshot } from "../lib/predictions/inputSnapshot";
import { buildPredictionStrengthReport } from "../lib/predictions/teamStrength";

async function main() {
  const report = buildPredictionStrengthReport(await loadCurrentPredictionInputSnapshot({ fresh: true }));
  console.log("PREDICTIONS P2 ALL-12 DIAGNOSTIC");
  console.log(`Model: ${report.modelVersion}`);
  console.log(`Generated: ${report.generatedAt}`);
  console.log(`Weights: starters ${report.weights.starters}; depth ${report.weights.depth}; positional balance ${report.weights.positionalBalance}`);
  console.log(`Normalization: ${report.normalization}`);
  for (const team of report.teams) {
    console.log(`${team.leagueRelativeRank}. ${team.franchiseId} | ${team.teamName} | raw ${team.rawWeightedComposite} | score ${team.strengthScore} | ${team.tier} | ${team.confidence}`);
    console.log(`  STARTERS ${team.components.starters.score ?? "?"} (#${team.components.starters.leagueRank ?? "?"}) contribution ${team.weightedContributions.starters}`);
    console.log(`  DEPTH ${team.components.depth.score ?? "?"} (#${team.components.depth.leagueRank ?? "?"}) contribution ${team.weightedContributions.depth}`);
    console.log(`  POSITIONAL BALANCE ${team.components.positionalBalance.score ?? "?"} contribution ${team.weightedContributions.positionalBalance}`);
    console.log(`  QB ${team.components.qb.score ?? "?"} (#${team.components.qb.leagueRank ?? "?"}) | RB ${team.components.rb.score ?? "?"} (#${team.components.rb.leagueRank ?? "?"}) | WR ${team.components.wr.score ?? "?"} (#${team.components.wr.leagueRank ?? "?"}) | TE ${team.components.te.score ?? "?"} (#${team.components.te.leagueRank ?? "?"}) | FLEX ${team.components.flex.score ?? "?"} (#${team.components.flex.leagueRank ?? "?"})`);
    console.log(`  STRENGTH ${team.biggestStrength} | WEAKNESS ${team.biggestWeakness} | FC ${team.coverage.fantasyCalc.covered}/${team.coverage.fantasyCalc.total}; ROS ${team.coverage.ros.covered}/${team.coverage.ros.total}`);
  }
  console.log("ADJACENT SCORE GAPS");
  for (let index = 0; index < report.teams.length - 1; index += 1) console.log(`${report.teams[index].teamName} → ${report.teams[index + 1].teamName}: ${(report.teams[index].strengthScore - report.teams[index + 1].strengthScore).toFixed(1)}`);
  console.log(`FantasyCalc asOf/generated: ${report.evidenceFreshness.find((source) => source.source === "FANTASYCALC_REDRAFT")?.generatedAt ?? "unknown"}`);
  console.log(`ROS asOf/generated: ${report.evidenceFreshness.find((source) => source.source === "ROS_CONSENSUS")?.generatedAt ?? "unknown"}`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
