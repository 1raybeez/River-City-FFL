import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const files = ["lib/draftReportV2/types.ts", "lib/draftReportV2/snapshot.ts", "lib/draftReportV2/draftQuality.ts", "lib/draftReportV2/auctionEfficiency.ts", "lib/draftReportV2/sourceAdapter.ts", "lib/draftReportV2/calibration.ts", "scripts/draft-report-v2-diagnostic.ts", "scripts/draft-report-v2-calibration.ts"];
for (const file of files) {
  const source = readFileSync(file, "utf8");
  assert.doesNotMatch(source, /lib\/powerRankings|power-rankings|canonicalPowerRankings|@\/lib\/powerRankings/);
}
console.log("Draft Report Card V2 Power Rankings isolation checks passed.");
