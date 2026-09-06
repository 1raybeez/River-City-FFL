import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildReportCardEmailContent,
  REPORT_CARD_OVERVIEW_HREF,
  REPORT_CARD_PERSONAL_HREF,
} from "../lib/reportCardEmailContract";

const route = readFileSync("app/api/commish/post-draft/route.ts", "utf8");
const client = readFileSync("app/commish/post-draft/ReportCardEmailClient.tsx", "utf8");
const server = readFileSync("lib/reportCardEmail.ts", "utf8");

assert.equal(REPORT_CARD_OVERVIEW_HREF, "https://river-city-ffl.web.app/league-info/draft-report/overview");
assert.equal(REPORT_CARD_PERSONAL_HREF, "https://river-city-ffl.web.app/league-info/draft-report");
assert.doesNotMatch(REPORT_CARD_OVERVIEW_HREF, /localhost/);

const content = buildReportCardEmailContent([
  { teamName: "The Shake-N-Bakers", draftGrade: "A", draftScore: 95.64 },
  { teamName: "Stanal Fissures", draftGrade: "F", draftScore: 57.37 },
]);
assert.equal(content.subject, "2026 River City Draft Report Cards Are Live");
assert.match(content.text, /The Shake-N-Bakers — A \(95\.64\)/);
assert.match(content.text, /Stanal Fissures — F \(57\.37\)/);
assert.match(content.text, /river-city-ffl\.web\.app\/league-info\/draft-report\/overview/);
assert.match(content.text, /Gentlemen,/);
assert.match(content.html, /background:#ea580c/);
assert.match(content.html, /View the 2026 Draft Report Cards/);

assert.match(server, /canonicalAuctionTeams/);
assert.match(server, /listAuthorizedEmailMappingsFromFirestore/);
assert.doesNotMatch(server, /auctionOwnerProfiles/);
assert.match(server, /resolveCanonicalOwnerAuthorization/);
assert.match(server, /MISSING_EMAIL/);
assert.match(server, /DUPLICATE_EMAIL/);
assert.match(server, /INTEGRITY_ERROR/);
assert.match(server, /isReportCardEmailReady/);
assert.match(server, /REPORT_CARD_PERSONAL_HREF/);
assert.match(server, /process\.env\.REPORT_CARD_EMAIL_SEND_ENABLED !== "true"/);
assert.match(server, /postmarkTransport/);
assert.match(server, /POSTMARK_SERVER_TOKEN/);
assert.match(server, /REPORT_CARD_EMAIL_FROM/);
assert.match(server, /export async function sendLeagueEmail/);
assert.match(server, /status: "SENT"/);
assert.match(server, /status: "FAILED"/);
assert.match(server, /response\.ok/);
assert.match(server, /MessageID/);
assert.match(route, /requireAuctionAccess\("maintenance"\)/);
assert.match(route, /preview-report-card-email/);
assert.match(route, /send-report-card-email/);
assert.match(route, /send-report-card-test/);
assert.match(route, /RECIPIENT_AUDIT_NOT_READY/);
assert.match(route, /recipients: \[actor\.email\]/);
const getBody = route.slice(route.indexOf("export async function GET"), route.indexOf("export async function POST"));
assert.doesNotMatch(getBody, /send-report-card-email/);
assert.doesNotMatch(route, /body\.recipients/);
assert.doesNotMatch(route, /body\.from/);
assert.doesNotMatch(route, /body\.testRecipient/);
assert.match(client, /Preview email/);
assert.match(client, /No message was sent/);
assert.match(client, /Prepare send/);

console.log("Report-card email architecture checks passed.");
