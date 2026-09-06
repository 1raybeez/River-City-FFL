import { loadCurrentPredictionInputSnapshot } from "../lib/predictions/inputSnapshot";

function byPosition(snapshot: Awaited<ReturnType<typeof loadCurrentPredictionInputSnapshot>>, key: "fantasyCalc" | "ros") {
  const rows = snapshot.franchises.flatMap((franchise) => franchise.rosterPlayers);
  return Object.fromEntries([...new Set(rows.map((row) => row.position ?? "UNKNOWN"))].sort().map((position) => {
    const group = rows.filter((row) => (row.position ?? "UNKNOWN") === position);
    const covered = group.filter((row) => row.evidence[key] !== null).length;
    return [position, `${covered}/${group.length}`];
  }));
}

async function main() {
  const snapshot = await loadCurrentPredictionInputSnapshot({ fresh: true });
  console.log("PREDICTIONS P1 COVERAGE");
  console.log(`As of: ${snapshot.asOf}`);
  console.log(`League: ${snapshot.coverage.franchises.covered}/${snapshot.coverage.franchises.total} franchises resolved`);
  console.log(`Roster players: ${snapshot.coverage.identity.total}`);
  console.log(`Identity: ${snapshot.coverage.identity.covered}/${snapshot.coverage.identity.total} (${snapshot.coverage.identity.state})`);
  console.log(`Position: ${snapshot.coverage.position.covered}/${snapshot.coverage.position.total} (${snapshot.coverage.position.state})`);
  console.log(`FantasyCalc: ${snapshot.coverage.fantasyCalc.covered}/${snapshot.coverage.fantasyCalc.total} (${snapshot.coverage.fantasyCalc.state})`);
  console.log(JSON.stringify(byPosition(snapshot, "fantasyCalc")));
  console.log(`ROS: ${snapshot.coverage.ros.covered}/${snapshot.coverage.ros.total} (${snapshot.coverage.ros.state})`);
  console.log(JSON.stringify(byPosition(snapshot, "ros")));
  console.log("Franchise coverage:");
  for (const franchise of snapshot.franchises) console.log(`- ${franchise.franchiseId} | ${franchise.currentTeamName}: ${franchise.rosterPlayers.length} players; identity ${franchise.coverage.identity.state}; FantasyCalc ${franchise.coverage.fantasyCalc.state}; ROS ${franchise.coverage.ros.state}`);
  console.log(`Missing identity: ${snapshot.coverage.identity.missingIds.join(", ") || "none"}`);
  console.log(`Missing FantasyCalc: ${snapshot.coverage.fantasyCalc.missingIds.join(", ") || "none"}`);
  console.log(`Missing ROS: ${snapshot.coverage.ros.missingIds.join(", ") || "none"}`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
