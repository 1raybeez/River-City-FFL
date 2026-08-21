import assert from "node:assert/strict";
import constitutionData from "@/lib/constitutionData";
import versionHistory from "@/lib/versionHistory";
import {
  LEGACY_VERSION_RULE_IDS,
  classifyRuleReference,
  getConstitutionRuleHref,
  getLatestRatifiedAt,
  normalizeRatifiedAmendment,
} from "@/lib/constitutionAuthority";

const currentIds = new Set(
  constitutionData.flatMap((section) => [
    section.id,
    ...(section.subsections?.map((subsection) => subsection.id) ?? []),
  ])
);
const historicalReferences = versionHistory.flatMap((entry) => entry.changes.map((change) => change.rule));
const staleReferences = [...new Set(historicalReferences.filter((reference) => !currentIds.has(reference)))];

assert.equal(constitutionData.length, 12);
assert.equal(currentIds.size, 52);
assert.equal(staleReferences.length, 14);
assert.ok(staleReferences.every((reference) => LEGACY_VERSION_RULE_IDS.has(reference)));
assert.ok(staleReferences.every((reference) => classifyRuleReference(reference, "legacy-version-history") === "legacy-unresolved"));
assert.ok(staleReferences.every((reference) => getConstitutionRuleHref(reference, "legacy-version-history") === null));

assert.equal(getConstitutionRuleHref("4.3"), "/league-info/constitution#constitution-subsection-4.3");
assert.equal(getConstitutionRuleHref("4.3", "legacy-version-history"), null);
assert.equal(getConstitutionRuleHref("missing-rule"), null);

const amendment = normalizeRatifiedAmendment({
  proposalId: "proposal-1",
  sectionId: "4.3",
  title: "Keeper amendment",
  content: ["Approved keeper clarification."],
  passedAt: "2026-06-04T22:22:02.043Z",
  voteTotals: { yes: 9, no: 1 },
});
assert.ok(amendment);
assert.equal(amendment?.effectiveDate, null);
assert.equal(amendment?.proposalHref, null);
assert.equal(amendment?.currentRuleHref, "/league-info/constitution#constitution-subsection-4.3");
assert.deepEqual(amendment?.voteTotals, { yes: 9, no: 1 });
assert.equal(normalizeRatifiedAmendment({ sectionId: "missing-rule", content: ["Do not display"] }), null);
assert.equal(getLatestRatifiedAt([amendment!]), "2026-06-04T22:22:02.043Z");

console.log("Constitution authority reconciliation checks passed.");
