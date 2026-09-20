import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function main() {
const source = await readFile(new URL("../app/commish/predictor/page.tsx", import.meta.url), "utf8");
assert.match(source, /CloudStorageValidationHistoryStore/);
assert.match(source, /Validation history will appear here after shadow predictions can be compared with later finalized outcomes/);
assert.match(source, /historyRows\.map/);
assert.match(source, /VALIDATED · CURRENT/);
assert.match(source, /VALIDATED · STALE/);
assert.match(source, /AWAITING OUTCOME · CURRENT/);
assert.match(source, /AWAITING OUTCOME · STALE/);
assert.match(source, /playoffBrierScore === null/);
assert.match(source, /requireAuctionAccess\("maintenance"\)/);
assert.doesNotMatch(source, /Cloud Storage paths|firebase-admin|bucket/);
console.log("Predictor validation-history UI checks passed.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
