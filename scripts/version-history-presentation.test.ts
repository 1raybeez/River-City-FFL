import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/history/version-history/page.tsx", "utf8");
const entry = readFileSync("components/VersionEntry.tsx", "utf8");
const source = readFileSync("lib/versionHistory.ts", "utf8");

assert.match(page, /<SiteShell activePath="\/league-info">/);
assert.match(page, /CONSTITUTION VERSION HISTORY|Constitution Version History/);
assert.match(page, /href="\/league-info\/constitution"/);
assert.match(page, /Back to Constitution/);
assert.match(page, /combinedHistory/);
assert.match(page, /Ratified Legislative Update/);
assert.doesNotMatch(page, /<nav/);
assert.match(page, /overflow|break-words|space-y-4/);
assert.match(page, /aria-labelledby="version-history-entries"/);
assert.match(entry, /aria-expanded=\{isOpen\}/);
assert.match(entry, /aria-controls=\{changesId\}/);
assert.match(entry, /focus-visible:ring-2/);
assert.match(entry, /Version \$\{entry\.version\}/);
assert.match(source, /versionHistory/);

console.log("Version History presentation checks passed.");
