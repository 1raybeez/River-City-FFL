import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/commish/finance/2026/page.tsx", "utf8");
const client = readFileSync(
  "app/commish/finance/2026/OperationalFinanceDashboardClient.tsx",
  "utf8"
);
const expenses = readFileSync(
  "app/commish/finance/2026/OperationalFinanceExpenseReconciliationSection.tsx",
  "utf8"
);
const layout = readFileSync("app/commish/finance/layout.tsx", "utf8");
const shell = readFileSync("components/SiteShell.tsx", "utf8");

assert.match(client, /import SiteShell from ["']@\/components\/SiteShell["']/);
assert.match(client, /<SiteShell activePath="\/commish">/);
assert.match(client, /Commissioner Hub/);
assert.match(client, /Return to Commissioner Hub/);
assert.match(client, /dashboard\.heading/);
assert.match(client, /Dues Summary/);
assert.match(client, /Dues Roster/);
assert.match(client, /Record Venmo Payment/);
assert.match(expenses, /Championship Allocation/);
assert.match(expenses, /Ring Cost/);
assert.match(expenses, /Projected Champion Cash/);
assert.match(client, /OperationalFinanceExpenseReconciliationSection/);
assert.match(client, /OperationalFinanceSeasonCloseSection/);
assert.match(client, /OperationalFinanceExportSection/);
assert.match(client, /formatCurrency/);
assert.match(client, /grid gap-4 lg:grid-cols-2/);
assert.match(client, /overflow-x-hidden/);
assert.doesNotMatch(client, /<ModeToggle/);
assert.doesNotMatch(client, /<nav/);
assert.doesNotMatch(client, /Net Earnings|ROI|profitability/i);

assert.match(page, /loadOperationalFinanceDashboardFromFirestore/);
assert.match(layout, /requireOperationalFinanceCommissioner/);
assert.match(layout, /returnTo=%2Fcommish%2Ffinance%2F2026/);
assert.match(shell, /activePath === "\/commish"/);

console.log("Commissioner Finance presentation checks passed.");
