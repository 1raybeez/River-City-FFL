import assert from "node:assert/strict";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TradeAggressionMeter } from "../components/managers/OwnerProfile";
import { activeManagers } from "../lib/managers/activeManagers";
import {
  getOwnerProfileById,
  ownerProfiles,
} from "../lib/managers/identityData";
import { getOwnerProfileViewModelBySlug } from "../lib/managers/identitySelectors";
import { toPublicOwnerProfileViewModel } from "../lib/managers/ownerProfilePresentation";
import { retiredManagers } from "../lib/managers/retiredManagers";
import { staffManagers } from "../lib/managers/staff";
import { RETIRED_TRADE_SCORES } from "../lib/tradeScores";

function getStringField(value: unknown, key: string) {
  if (!value || typeof value !== "object") return undefined;
  const field = (value as Record<string, unknown>)[key];
  return typeof field === "string" ? field : undefined;
}

const publicProfiles = ownerProfiles.map((owner) => {
  const profile = getOwnerProfileViewModelBySlug(owner.slug);
  assert.ok(profile, `Missing public profile view model for ${owner.slug}`);
  return toPublicOwnerProfileViewModel(profile);
});
const serializedPublicProfiles = JSON.stringify(publicProfiles);
const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
assert.deepEqual(
  serializedPublicProfiles.match(emailPattern) ?? [],
  [],
  "An email address reached serialized Manager Profile props"
);

const rawManagers = [...activeManagers, ...retiredManagers, ...staffManagers];
const privateContactValues = rawManagers
  .map((manager) => getStringField(manager, "contactValue"))
  .filter((value): value is string => Boolean(value));
const privateEmailTargets = privateContactValues.filter((value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
);

for (const contactValue of privateContactValues) {
  assert.equal(
    serializedPublicProfiles.includes(contactValue),
    false,
    "A raw contactValue reached serialized Manager Profile props"
  );
}

for (const emailAddress of privateEmailTargets) {
  assert.equal(
    serializedPublicProfiles.includes(emailAddress),
    false,
    "A raw email contact target reached serialized Manager Profile props"
  );
}

const sleeperUserIds = ownerProfiles.flatMap((owner) => owner.sleeperIds);
for (const sleeperId of sleeperUserIds) {
  assert.equal(
    serializedPublicProfiles.includes(sleeperId),
    false,
    "A Sleeper user ID reached serialized Manager Profile props"
  );
}

for (const manager of activeManagers) {
  const ownerId = manager.fullName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const owner = getOwnerProfileById(ownerId);
  assert.ok(owner, `Missing active owner profile for ${manager.fullName}`);
  assert.equal(owner.survey.tradeAggression, manager.tradeAggression);
  assert.equal(owner.survey.tradeAggressionRating?.value, manager.tradeAggression);
  assert.equal(
    owner.survey.tradeAggressionRating?.source,
    "trade-history-calculation"
  );
  assert.ok(owner.survey.tradeAggressionRating?.generatedAt);
  assert.ok(owner.survey.tradeAggressionRating?.calculatedThroughSeason);
  assert.ok(owner.survey.tradeAggressionRating?.methodologyVersion);
}

for (const manager of retiredManagers) {
  const expectedValue = RETIRED_TRADE_SCORES[manager.fullName];
  if (expectedValue === undefined) continue;

  const ownerId = manager.fullName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const owner = getOwnerProfileById(ownerId);
  assert.ok(owner, `Missing retired owner profile for ${manager.fullName}`);
  assert.equal(owner.survey.tradeAggression, expectedValue);
  assert.equal(owner.survey.tradeAggressionRating?.value, expectedValue);
  assert.equal(
    owner.survey.tradeAggressionRating?.source,
    "commissioner-curated"
  );
}

const jeffrey = getOwnerProfileById("jeffrey-hudgins");
assert.equal(jeffrey?.survey.tradeAggression, 9);
assert.equal(jeffrey?.survey.tradeAggressionRating?.value, 9);
assert.equal(
  jeffrey?.survey.tradeAggressionRating?.source,
  "commissioner-curated"
);

const damon = getOwnerProfileById("damon-davis");
assert.equal(damon?.survey.tradeAggression, undefined);
assert.equal(damon?.survey.tradeAggressionRating, undefined);

for (const owner of ownerProfiles) {
  const preference = owner.survey.contactPreference;
  if (!preference) continue;

  assert.equal(preference.actionStatus, "label-only");
  assert.equal(preference.ownerConsent, false);
  assert.equal(preference.targetRef, undefined);
  assert.ok(["sms", "whatsapp", "sleeper", "email"].includes(preference.method));
}

assert.equal(
  getOwnerProfileById("ray-long")?.survey.contactPreference?.publicLabel,
  "iMessage"
);
assert.equal(
  getOwnerProfileById("jd-dowling")?.survey.contactPreference?.publicLabel,
  "Sleeper DM"
);

const publicLabelsByStoredPreference: Record<string, string> = {
  Text: "iMessage",
  WhatsApp: "WhatsApp",
  Sleeper: "Sleeper DM",
};
for (const manager of rawManagers) {
  const storedPreference = getStringField(manager, "preferredContact");
  if (!storedPreference) continue;

  const ownerId = manager.fullName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const contactPreference = getOwnerProfileById(ownerId)?.survey.contactPreference;
  assert.equal(
    contactPreference?.publicLabel,
    publicLabelsByStoredPreference[storedPreference],
    `Public contact label changed for ${manager.fullName}`
  );
  assert.equal(
    contactPreference?.method === "whatsapp",
    storedPreference === "WhatsApp",
    `WhatsApp capability was inferred for ${manager.fullName}`
  );
}

const rayRating = getOwnerProfileById("ray-long")?.survey.tradeAggressionRating;
assert.ok(rayRating);
const meterHtml = renderToStaticMarkup(
  createElement(TradeAggressionMeter, { rating: rayRating })
);
assert.match(meterHtml, /role="meter"/);
assert.match(meterHtml, /aria-valuemin="0"/);
assert.match(meterHtml, /aria-valuemax="10"/);
assert.match(meterHtml, /aria-valuenow="9"/);
assert.match(meterHtml, /aria-label="Trade aggression 9 out of 10"/);
assert.match(meterHtml, /9\/10/);
assert.match(meterHtml, /Trade-history score/);
assert.match(
  meterHtml,
  /linear-gradient\(90deg, #b91c1c 0%, #ef4444 24%, #eab308 50%, #84cc16 74%, #15803d 100%\)/
);
assert.match(meterHtml, /width:90%/);
assert.match(meterHtml, /width:111\.11111111111111%/);

const moderateMeterHtml = renderToStaticMarkup(
  createElement(TradeAggressionMeter, {
    rating: { ...rayRating, value: 5 },
  })
);
assert.match(moderateMeterHtml, /aria-valuenow="5"/);
assert.match(moderateMeterHtml, /width:50%/);
assert.match(moderateMeterHtml, /width:200%/);

const retiredRating = getOwnerProfileById("chris-barras")?.survey
  .tradeAggressionRating;
assert.ok(retiredRating);
const retiredMeterHtml = renderToStaticMarkup(
  createElement(TradeAggressionMeter, { rating: retiredRating })
);
assert.match(retiredMeterHtml, /Curated profile rating/);

const clampedMeterHtml = renderToStaticMarkup(
  createElement(TradeAggressionMeter, {
    rating: { ...rayRating, value: 12 },
  })
);
assert.match(clampedMeterHtml, /aria-valuenow="12"/);
assert.match(clampedMeterHtml, /width:100%/);

const profileSource = readFileSync(
  new URL("../components/managers/OwnerProfile.tsx", import.meta.url),
  "utf8"
);
for (const unsupportedContactLink of [
  { label: "sms:", pattern: /["'`]sms:/ },
  { label: "mailto:", pattern: /mailto:/ },
  { label: "wa.me/", pattern: /wa\.me\// },
  { label: "sleeper://", pattern: /sleeper:\/\// },
]) {
  assert.equal(
    unsupportedContactLink.pattern.test(profileSource),
    false,
    `Manager Profile generated an unapproved ${unsupportedContactLink.label} contact action`
  );
}

function listPublicProfileArtifacts(directory: string): string[] {
  if (!existsSync(directory)) return [];

  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return listPublicProfileArtifacts(path);
    return path.endsWith(".html") || path.endsWith(".rsc") ? [path] : [];
  });
}

const publicProfileArtifacts = listPublicProfileArtifacts(
  join(process.cwd(), ".next", "server", "app", "managers", "owners")
);
if (publicProfileArtifacts.length > 0) {
  const generatedPublicOutput = publicProfileArtifacts
    .map((path) => readFileSync(path, "utf8"))
    .join("\n");
  assert.deepEqual(
    generatedPublicOutput.match(emailPattern) ?? [],
    [],
    "An email address reached generated public Manager Profile output"
  );

  for (const contactValue of privateContactValues) {
    assert.equal(
      generatedPublicOutput.includes(contactValue),
      false,
      "A raw contactValue reached generated public Manager Profile output"
    );
  }

  for (const emailAddress of privateEmailTargets) {
    assert.equal(
      generatedPublicOutput.includes(emailAddress),
      false,
      "A raw email contact target reached generated public Manager Profile output"
    );
  }

  for (const sleeperId of sleeperUserIds) {
    assert.equal(
      generatedPublicOutput.includes(sleeperId),
      false,
      "A Sleeper user ID reached generated public Manager Profile output"
    );
  }
}

console.log(
  `Manager Profile contact/privacy validation passed: ${publicProfiles.length} public profiles, ${privateContactValues.length} private contact targets excluded, ${sleeperUserIds.length} Sleeper user IDs excluded, ${publicProfileArtifacts.length} generated public artifacts inspected.`
);
