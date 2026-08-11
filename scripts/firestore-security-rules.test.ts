import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

const rules = read("firestore.rules");
const firebaseConfig = JSON.parse(read("firebase.json")) as {
  firestore?: { rules?: string };
};

assert.equal(
  firebaseConfig.firestore?.rules,
  "firestore.rules",
  "firebase.json must deploy the checked-in Firestore rules file."
);
assert.match(rules, /rules_version\s*=\s*'2'/);
assert.doesNotMatch(
  rules,
  /allow\s+(?:read\s*,\s*write|write\s*,\s*read)\s*:\s*if\s+true/,
  "Catch-all public read/write rules are forbidden."
);

for (const collectionName of ["finance_rules", "finance_seasons"]) {
  assert.match(
    rules,
    new RegExp(
      `match\\s+\\/${collectionName}\\/\\{[^}]+\\}\\s*\\{[\\s\\S]*?allow\\s+read\\s*,\\s*write\\s*:\\s*if\\s+false`,
      "m"
    ),
    `${collectionName} must explicitly deny client reads and writes.`
  );
}

assert.match(
  rules,
  /match\s+\/operational_finance_seasons\/\{season\}\s*\{[\s\S]*?allow\s+read\s*,\s*write\s*:\s*if\s+false\s*;[\s\S]*?match\s+\/\{document=\*\*\}\s*\{[\s\S]*?allow\s+read\s*,\s*write\s*:\s*if\s+false\s*;/m,
  "Operational finance season roots and subcollections must deny direct client access."
);

const operationalLedgerServer = read(
  "lib/finance/operationalFinanceLedgerFirestore.ts"
);
assert.match(operationalLedgerServer, /@\/lib\/firebaseAdmin/);
assert.doesNotMatch(
  operationalLedgerServer,
  /firebase\/firestore|@\/lib\/firebase"/
);
assert.doesNotMatch(
  operationalLedgerServer,
  /\.(?:delete|recursiveDelete)\s*\(/
);

const operationalFinanceDashboardClient = read(
  "app/commish/finance/2026/OperationalFinanceDashboardClient.tsx"
);
assert.doesNotMatch(
  operationalFinanceDashboardClient,
  /firebase\/firestore|@\/lib\/firebase/,
  "Commissioner finance React code must not access Firestore directly."
);
const operationalFinanceMutationRoute = read(
  "app/api/commish/finance/[season]/dues/[obligationId]/settlements/route.ts"
);
assert.match(
  operationalFinanceMutationRoute,
  /requireOperationalFinanceCommissioner/,
  "Every operational finance mutation must authorize the commissioner server-side."
);
assert.match(operationalFinanceMutationRoute, /Cross-origin request denied/);
assert.match(operationalFinanceMutationRoute, /getOperationalFinanceLedgerRepository/);
assert.doesNotMatch(
  operationalFinanceMutationRoute,
  /firebase\/firestore|@\/lib\/firebase(?:"|')/
);

for (const collectionName of [
  "siteContent",
  "rsvps",
  "player_stats",
  "historical_distribution",
  "ratified_rules",
  "version_history_updates",
]) {
  assert.match(
    rules,
    new RegExp(
      `match\\s+\\/${collectionName}\\/\\{[^}]+\\}\\s*\\{[\\s\\S]*?allow\\s+read\\s*:\\s*if\\s+true\\s*;[\\s\\S]*?allow\\s+write\\s*:\\s*if\\s+false`,
      "m"
    ),
    `${collectionName} must be public-read/server-write.`
  );
}

assert.match(
  rules,
  /match\s+\/\{document=\*\*\}\s*\{\s*allow\s+read\s*,\s*write\s*:\s*if\s+false\s*;/m,
  "Rules must end with a recursive deny-by-default boundary."
);

const homePage = read("app/page.tsx");
assert.doesNotMatch(homePage, /\bsetDoc\s*\(/, "Homepage must not write RSVP data with the client SDK.");
assert.match(homePage, /fetch\("\/api\/rsvps"/);

for (const proposalClientPath of [
  "app/commish/proposals/page.tsx",
  "app/commish/proposals/new/page.tsx",
]) {
  const source = read(proposalClientPath);
  assert.doesNotMatch(source, /firebase\/firestore|@\/lib\/firebase/);
  assert.match(source, /\/api\/commish\/proposals/);
}

const rsvpRoute = read("app/api/rsvps/route.ts");
assert.match(rsvpRoute, /@\/lib\/firebaseAdmin/);
assert.match(rsvpRoute, /PUBLIC_RSVP_MANAGERS/);
assert.match(rsvpRoute, /Cross-origin request denied/);
assert.match(rsvpRoute, /x-forwarded-host/);
assert.match(rsvpRoute, /VERCEL_URL/);

const proposalRoute = read("app/api/commish/proposals/route.ts");
assert.match(proposalRoute, /requireAuctionAccess/);
assert.match(proposalRoute, /@\/lib\/legislativeServer/);
assert.match(proposalRoute, /Cross-origin request denied/);
assert.match(proposalRoute, /x-forwarded-host/);
assert.match(proposalRoute, /VERCEL_URL/);

const legislativeServer = read("lib/legislativeServer.ts");
assert.match(legislativeServer, /import\s+"server-only"/);
assert.match(legislativeServer, /@\/lib\/firebaseAdmin/);
assert.doesNotMatch(legislativeServer, /firebase\/firestore|@\/lib\/firebase"/);

console.log("Firestore security rules/config static checks passed.");
