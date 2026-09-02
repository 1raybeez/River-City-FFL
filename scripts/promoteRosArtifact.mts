import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { validateRosArtifact } from "../lib/tradeComparison/rosArtifact";

const candidatePath = "data/trade-analyzer/ros/ros-consensus-2026-2026-08-31.candidate.json";
const publishedPath = "data/trade-analyzer/ros/published/ros-consensus-2026-2026-08-31.json";
const raw = await readFile(candidatePath, "utf8");
const artifact = JSON.parse(raw) as unknown;
const validation = validateRosArtifact(artifact);
if (!validation.valid) throw new Error(`Candidate validation failed: ${validation.errors.join("; ")}`);
await mkdir("data/trade-analyzer/ros/published", { recursive: true });
await writeFile(publishedPath, raw, "utf8");
console.log(JSON.stringify({ publishedPath, playerCount: validation.playerCount, generatedAt: validation.generatedAt, sourceNames: validation.sourceNames, checksum: createHash("sha256").update(raw).digest("hex") }));
