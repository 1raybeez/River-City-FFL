import assert from "node:assert/strict";

import {
  APPROVED_FRANCHISE_HISTORY_STATUS_OVERRIDES,
  buildFranchiseHistories,
} from "../lib/history/franchiseHistory";
import { getAllFranchiseRosterMappings } from "../lib/history/franchiseRosterMappings";
import { getAllHistoricalSeasonResults } from "../lib/history/historicalSeasonResults";
import { getAllOwnerSeasonHistory } from "../lib/history/ownerSeasonHistory";
import { buildOwnerFranchiseLegacyPresentation } from "../lib/managers/franchiseLegacyPresentation";
import {
  franchises,
  ownerProfiles,
  ownershipTenures,
} from "../lib/managers/identityData";

const histories = buildFranchiseHistories({
  franchises,
  ownershipTenures,
  historicalSeasonResults: getAllHistoricalSeasonResults(),
  ownerSeasonRecords: getAllOwnerSeasonHistory(),
  canonicalMatchups: [],
  franchiseRosterMappings: getAllFranchiseRosterMappings(),
  statusOverrides: APPROVED_FRANCHISE_HISTORY_STATUS_OVERRIDES,
}).histories;
const owners = ownerProfiles.map(({ id, fullName, status }) => ({
  id,
  fullName,
  status,
}));

function presentation(ownerId: string) {
  return buildOwnerFranchiseLegacyPresentation({ ownerId, histories, owners });
}

const ray = presentation("ray-long");
assert.deepEqual(ray.cards.map((card) => card.franchiseId), [
  "prestigio-mundial",
]);
assert.deepEqual(
  ray.cards[0].ownershipRows.map((row) => ({
    years: row.yearLabel,
    title: row.title,
    detail: row.detail,
    participates: row.viewerParticipates,
  })),
  [
    {
      years: "2011",
      title: "Ray Long",
      detail: "Primary Owner",
      participates: true,
    },
    {
      years: "2012",
      title: "Inactive",
      detail: "No approved franchise participation",
      participates: false,
    },
    {
      years: "2013–Present",
      title: "Jeffrey Hudgins & Ray Long",
      detail: "Co-Owners",
      participates: true,
    },
  ]
);

const jeffrey = presentation("jeffrey-hudgins");
assert.deepEqual(jeffrey.cards.map((card) => card.franchiseId), [
  "prestigio-mundial",
]);
assert.deepEqual(
  jeffrey.cards[0].ownershipRows.map((row) => row.yearLabel),
  ["2013–Present"],
  "Jeffrey must not receive Ray's 2011 tenure or the 2012 inactive gap."
);
assert.ok(
  jeffrey.cards[0].timeline.every((event) => event.season >= 2013),
  "Jeffrey's franchise highlights must not imply pre-tenure ownership."
);

const jordan = presentation("jordan-maslyn");
assert.deepEqual(jordan.cards.map((card) => card.franchiseId), [
  "shake-n-bakers",
]);
assert.deepEqual(
  jordan.cards[0].ownershipRows.map((row) => row.yearLabel),
  ["2017–2024", "2025–Present"]
);

const landon = presentation("landon-elliott");
assert.deepEqual(
  landon.cards.map((card) => card.franchiseId),
  ["special-brownies", "shake-n-bakers"],
  "Landon's two canonical franchise histories must remain separate."
);
assert.equal(
  landon.cards.find((card) => card.franchiseId === "special-brownies")?.status,
  "dormant"
);
assert.deepEqual(
  landon.cards
    .find((card) => card.franchiseId === "shake-n-bakers")
    ?.ownershipRows.map((row) => row.yearLabel),
  ["2025–Present"]
);

const travis = presentation("travis-miller");
assert.ok(
  travis.cards.some((card) =>
    card.completeNameHistory.some(
      (name) => name.historicalName === "I'm Your Huckleberry"
    )
  )
);
const darren = presentation("darren-kusaj");
assert.ok(
  darren.cards.some((card) =>
    card.completeNameHistory.some(
      (name) => name.historicalName === "Team Darren"
    )
  )
);
assert.ok(
  landon.cards
    .find((card) => card.franchiseId === "special-brownies")
    ?.completeNameHistory.some(
      (name) =>
        name.historicalName === "Specail Brownies" && !name.isPrimary
    )
);

const jd = presentation("jd-dowling");
assert.ok(jd.cards.every((card) => card.ownerFirstSeason >= 2012));
assert.ok(
  jd.cards.every((card) =>
    card.timeline.every((event) => event.season >= card.ownerFirstSeason)
  ),
  "JD's unresolved 2011 franchise must not be guessed into a card."
);

const tommy = presentation("tommy-moore").cards[0];
const dave = presentation("david-besedich").cards[0];
assert.ok(
  tommy.metrics.some(
    (metric) => metric.label === "League Titles" && Number(metric.value) > 0
  )
);
assert.ok(
  dave.metrics.some(
    (metric) => metric.label === "League Titles" && Number(metric.value) > 0
  ),
  "Dave's 2022 historical co-championship must remain a league title."
);
assert.ok(
  dave.metrics.some((metric) => metric.label === "Platform Titles"),
  "Dave's differing platform championship total must remain explicit."
);

const staff = ownerProfiles.find((owner) => owner.status === "staff");
assert.ok(staff);
const staffPresentation = presentation(staff.id);
assert.deepEqual(staffPresentation.cards, []);
assert.match(staffPresentation.emptyMessage, /staff profile/i);

for (const owner of ownerProfiles) {
  const ownerPresentation = presentation(owner.id);
  assert.equal(
    new Set(ownerPresentation.cards.map((card) => card.franchiseId)).size,
    ownerPresentation.cards.length,
    `${owner.fullName} must receive one Team Legacy card per canonical franchise.`
  );
}

console.log(
  JSON.stringify(
    {
      message: "Franchise legacy presentation assertions passed.",
      profiles: ownerProfiles.length,
      rayCards: ray.cards.length,
      jeffreyFirstSeason: jeffrey.cards[0].ownerFirstSeason,
      landonCards: landon.cards.length,
      staffCards: staffPresentation.cards.length,
    },
    null,
    2
  )
);
