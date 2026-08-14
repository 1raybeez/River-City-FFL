import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/league-info/legislative/page.tsx", "utf8");
const form = readFileSync("app/league-info/legislative/new/page.tsx", "utf8");
const login = readFileSync("app/league-info/legislative/login/page.tsx", "utf8");
const api = readFileSync("app/api/league-info/legislative/route.ts", "utf8");
const voteApi = readFileSync("app/api/league-info/legislative/vote/route.ts", "utf8");
const engine = readFileSync("lib/legislativeServer.ts", "utf8");

assert.match(page, /<SiteShell activePath="\/league-info"/);
assert.match(page, /Active Floor/);
assert.match(page, /Session Archive/);
assert.match(page, /api\/league-info\/legislative\/vote/);
assert.doesNotMatch(page, /selectedManagerId|Verify Identity|managerId/);
assert.doesNotMatch(form, /<select|managerId|Verify Identity/);
assert.match(form, /api\/league-info\/legislative/);
assert.match(login, /api\/auth\/session/);
assert.match(login, /league-info\/legislative/);
assert.match(api, /requireLegislativeOwner/);
assert.match(api, /session\.access\.canonicalOwnerId/);
assert.match(voteApi, /recordOwnerLegislativeVote/);
assert.match(voteApi, /session\.access\.canonicalOwnerId/);
assert.match(engine, /getLegislativeManagerIdForCanonicalOwner/);
assert.match(engine, /recordOwnerLegislativeVote/);
assert.match(engine, /data\.sessionYear !== CURRENT_LEGISLATIVE_SESSION_YEAR/);
assert.match(engine, /status.*active/);

console.log("Owner Legislative Hub security and presentation checks passed.");
