import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createHash } from "node:crypto";
import { validateFantasyCalcArtifact, PUBLISHED_FANTASYCALC_ARTIFACT_PATH } from "../lib/tradeComparison/fantasyCalcArtifact";

const candidatePath = "data/trade-analyzer/player-stats-2026.fantasycalc-redraft-candidate.json";
const publishedPath = PUBLISHED_FANTASYCALC_ARTIFACT_PATH;
const raw = await readFile(candidatePath, "utf8");
const validation = validateFantasyCalcArtifact(JSON.parse(raw));
if (!validation.valid) throw new Error(`FantasyCalc candidate failed validation: ${validation.errors.join(" ")}`);
await mkdir(dirname(publishedPath), { recursive: true });
await writeFile(publishedPath, raw, "utf8");
console.log(JSON.stringify({ artifactPath: publishedPath, playerCount: validation.playerCount, checksum: createHash("sha256").update(raw).digest("hex") }));
