import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const home = readFileSync("app/page.tsx", "utf8");
const client = readFileSync("app/HomeClient.tsx", "utf8");
const ownerRoute = readFileSync("app/league-info/recaps/[season]/week/[week]/page.tsx", "utf8");
const archive = readFileSync("app/league-info/recaps/page.tsx", "utf8");
assert.match(home, /getPublishedWeeklyRecap\(2026\)/);
assert.match(client, /publishedWeeklyRecap\?\.title/);
assert.match(client, /Read Full Recap/);
assert.match(client, /league-info\/recaps/);
assert.match(ownerRoute, /preview === "1"/);
assert.match(ownerRoute, /not published/);
assert.doesNotMatch(ownerRoute, /sourceMetadata|contentChecksum|correction buffer|Power Rankings/);
assert.match(archive, /listPublishedWeeklyRecaps/);
console.log("Weekly recap route contract checks passed.");
