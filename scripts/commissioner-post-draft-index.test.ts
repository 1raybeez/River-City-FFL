import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildCommissionerPostDraftIndex } from "../lib/commissionerPostDraftIndex";
import type { PostDraftPublicResult } from "../lib/postDraftMetrics";
import type { PublicDraftGradeResult } from "../lib/draftGrade";

const metrics = {
  status: "ready",
  season: 2026,
  generatedAt: "2026-09-01T00:00:00.000Z",
  sourceDraftId: "draft-2026",
  sourceDraftStatus: "complete",
  metricsSchemaVersion: "post-draft-metrics-v1",
  records: [{
    season: 2026,
    franchiseId: "prestigio-mundial",
    rosterId: 1,
    teamName: "Prestigio Mundial",
    generatedAt: "2026-09-01T00:00:00.000Z",
    source: { draftId: "draft-2026", draftStatus: "complete", metricsSchemaVersion: "post-draft-metrics-v1" },
    coverage: { status: "partial", warnings: ["Roster value coverage is partial."], rosterValueCount: 11, valueDifferentialCount: 11, adpCount: 11, positionCount: 16 },
    metrics: { totalSpend: 188, remainingBudget: 12, powerRanking: { rank: 1 }, },
  }],
  warnings: [],
} as unknown as PostDraftPublicResult;
const grades = {
  season: 2026,
  generatedAt: metrics.generatedAt,
  gradeModelVersion: "river-city-draft-grade-v1",
  records: [{ franchiseId: "prestigio-mundial", teamName: "Prestigio Mundial", letterGrade: "C", draftScore: 73.9, status: "partial" }],
  warnings: [],
} as unknown as PublicDraftGradeResult;

const rows = buildCommissionerPostDraftIndex(metrics, grades);
assert.equal(rows.length, 12);
assert.equal(rows[0].teamName, "Prestigio Mundial");
assert.equal(rows[0].draftGrade, "C");
assert.equal(rows[0].draftScore, 73.9);
assert.equal(rows[0].reportStatus, "PARTIAL COVERAGE");
assert.equal(rows[0].strategyExecution, null);
assert.equal(rows[0].strategyStatus, "owner-scoped");
assert.equal(rows.find((row) => row.franchiseId === "the-bearded-one")?.reportStatus, "DATA UNAVAILABLE");
assert.equal(rows.find((row) => row.franchiseId === "the-bearded-one")?.draftGrade, null);
assert.equal(rows.find((row) => row.franchiseId === "the-bearded-one")?.draftScore, null);

const workflow = readFileSync("lib/postDraftWorkflow.ts", "utf8");
const indexPage = readFileSync("app/commish/post-draft/PostDraftClient.tsx", "utf8");
const peerPage = readFileSync("app/commish/post-draft/report/page.tsx", "utf8");
assert.match(workflow, /getCommissionerPostDraftIndex/);
assert.match(workflow, /getCommissionerPostDraftReport/);
assert.match(workflow, /session\.access\.role !== "commissioner"/);
assert.match(indexPage, /Post-Draft Reports/);
assert.match(indexPage, /View report/);
assert.match(indexPage, /Owner-scoped/);
assert.match(peerPage, /Commissioner-only factual report/);
assert.match(peerPage, /Private War Room strategy sections are not included/);
assert.doesNotMatch(peerPage, /getAuthorizedPrivatePostDraftMetrics|calculateStrategyExecution/);

console.log("Commissioner post-draft index checks passed.");
