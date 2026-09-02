import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { readPublishedRosArtifact, validateRosArtifact } from "../lib/tradeComparison/rosArtifact";

async function main() {
const candidateRaw = await readFile("data/trade-analyzer/ros/ros-consensus-2026-2026-08-31.candidate.json", "utf8");
const publishedRaw = await readFile("data/trade-analyzer/ros/published/ros-consensus-2026-2026-08-31.json", "utf8");
assert.equal(publishedRaw, candidateRaw);
assert.equal(createHash("sha256").update(publishedRaw).digest("hex"), "489176711acabf12f3f8aa923d8a8edcf8ced117244f48b195d15b4e51ff4273");
const candidate = JSON.parse(candidateRaw) as { generatedAt: string; rows: Array<Record<string, unknown>> };
const validation = validateRosArtifact(candidate);
assert.equal(validation.valid, true);
assert.equal(validation.playerCount, 188);
assert.deepEqual(validation.sourceNames, ["FantasyPros ROS", "RotoWire ROS", "DraftSharks ROS"]);
assert.equal(new Set(candidate.rows.map((row) => row.playerId)).size, candidate.rows.length);
const loaded = await readPublishedRosArtifact();
assert.equal(loaded.valid, true);
assert.equal(loaded.artifactId, "ros-consensus-2026-2026-08-31");
assert.equal(loaded.playerCount, 188);
assert.equal(loaded.checksum, "489176711acabf12f3f8aa923d8a8edcf8ced117244f48b195d15b4e51ff4273");
for (const playerId of ["12545", "13281", "7523", "7526", "3163"]) {
  const row = candidate.rows.find((candidateRow) => candidateRow.playerId === playerId);
  const evidence = loaded.rows.get(playerId);
  assert.equal(Boolean(row), playerId === "13281" ? false : true);
  assert.equal(Boolean(evidence), playerId === "13281" ? false : true);
  assert.equal(evidence?.consensusOverallRank ?? null, (row?.consensusOverallRank as number | null | undefined) ?? null);
  assert.equal(evidence?.sourceCount ?? null, (row?.sourceCount as number | null | undefined) ?? null);
}
const malformed = validateRosArtifact({ ...candidate, rows: [candidate.rows[0], { ...candidate.rows[1], playerId: candidate.rows[0]?.playerId }, ...candidate.rows.slice(2)] });
assert.equal(malformed.valid, false);
assert.ok(malformed.errors.some((error) => error.includes("Duplicate playerId")));
assert.equal(validateRosArtifact({ season: 2026, generatedAt: candidate.generatedAt, rows: [], sources: [] }).valid, false);
console.log("Published ROS artifact validation and candidate equivalence checks passed.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
