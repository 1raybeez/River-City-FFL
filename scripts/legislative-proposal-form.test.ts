import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/league-info/legislative/new/page.tsx", "utf8");
const api = readFileSync("app/api/league-info/legislative/route.ts", "utf8");
const styles = readFileSync("app/globals.css", "utf8");

assert.match(page, /scroll-mt-24/);
assert.match(page, /sm:scroll-mt-8/);
assert.match(page, /legislative-proposal-form/);
assert.match(page, /id="proposal-section"/);
assert.match(page, /id="proposal-title"/);
assert.match(page, /id="proposal-description"/);
assert.match(page, /response\.text\(\)/);
assert.match(page, /content-type/);
assert.match(page, /JSON\.parse\(responseText\)/);
assert.match(page, /Your draft is still here/);
assert.match(api, /ok: true/);
assert.match(api, /ok: false/);
assert.match(api, /invalidRequest\.json\(\)/);
assert.match(api, /canonicalOwnerId/);
assert.doesNotMatch(api, /body\.ownerId|body\.managerId|body\.franchiseId/);
assert.match(styles, /\.legislative-proposal-form input,\s*\.legislative-proposal-form textarea/);
assert.match(styles, /color: #0f172a/);
assert.match(styles, /-webkit-text-fill-color: #0f172a/);
assert.match(styles, /color-scheme: light/);
assert.match(styles, /caret-color: #c2410c/);
assert.match(styles, /::placeholder/);
assert.match(styles, /::selection/);
assert.match(styles, /:-webkit-autofill/);

console.log("Legislative proposal form visibility checks passed.");
