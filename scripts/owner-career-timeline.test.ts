import assert from "node:assert/strict";
import {
  buildOwnerCareerTimeline,
  type OwnerCareerTimelineEvent,
} from "../lib/managers/ownerCareerTimeline";
import { getOwnerSeasonHistory } from "../lib/history/ownerSeasonHistory";
import { getOwnerProfileViewModelBySlug } from "../lib/managers/identitySelectors";

function getTimeline(ownerSlug: string) {
  const profile = getOwnerProfileViewModelBySlug(ownerSlug);
  assert.ok(profile, `Expected profile ${ownerSlug}.`);
  return buildOwnerCareerTimeline(
    profile,
    getOwnerSeasonHistory(profile.owner.id)
  );
}

function requireEvent(
  events: readonly OwnerCareerTimelineEvent[],
  year: string,
  titlePattern: RegExp
) {
  const event = events.find(
    (candidate) =>
      candidate.year === year && titlePattern.test(candidate.title)
  );
  assert.ok(event, `Expected ${year} event matching ${titlePattern}.`);
  return event;
}

const ray = getTimeline("ray-long");
assert.equal(ray.length, 6);
const ray2011 = requireEvent(ray, "2011", /^Joined River City$/);
assert.match(ray2011.detail ?? "", /Prestigio Mundial/);
assert.match(ray2011.detail ?? "", /Primary Owner/);
assert.match(ray2011.detail ?? "", /Finished 8th/);
assert.doesNotMatch(ray2011.detail ?? "", /Jeffrey/);
requireEvent(ray, "2012", /Did not participate/);
const ray2013 = requireEvent(
  ray,
  "2013",
  /^Returned to River City$/
);
assert.match(ray2013.detail ?? "", /Co-Owner/);
assert.match(ray2013.detail ?? "", /Jeffrey Hudgins/);
assert.match(ray2013.detail ?? "", /Finished 10th/);
requireEvent(ray, "2014-present", /^Commissioner$/);
const ray2016 = requireEvent(ray, "2016", /First podium · Finished 3rd/);
assert.deepEqual(ray2016.badges, ["Third Place"]);
const ray2025 = requireEvent(
  ray,
  "2025",
  /First last-place finish · Finished 12th/
);
assert.deepEqual(ray2025.badges, ["Last Place"]);
assert.equal(
  ray.filter((event) => event.source === "owner-season-history").length,
  5
);
assert.equal(ray.some((event) => event.year === "2015"), false);
assert.equal(ray.some((event) => event.year === "2017"), false);
assert.equal(ray.some((event) => event.year === "2018"), false);
assert.equal(ray.some((event) => event.year === "2019"), false);
assert.equal(ray.some((event) => event.year === "2020"), false);
assert.equal(ray.some((event) => event.year === "2021"), false);
assert.equal(ray.some((event) => event.year === "2022"), false);
assert.equal(ray.some((event) => event.year === "2023"), false);
assert.equal(ray.some((event) => event.year === "2024"), false);

const jeffrey = getTimeline("jeffrey-hudgins");
assert.equal(jeffrey.some((event) => event.year === "2011"), false);
assert.equal(jeffrey.some((event) => event.year === "2012"), false);
assert.match(
  requireEvent(jeffrey, "2013", /Joined River City/).detail ?? "",
  /Ray Long/
);

const landon = getTimeline("landon-elliott");
assert.match(
  requireEvent(landon, "2012", /^Joined River City$/).detail ?? "",
  /Special Brownies/
);
requireEvent(landon, "2024", /Final season as Special Brownies owner/);
requireEvent(landon, "2025", /Joins The Shake-N-Bakers as co-owner/);

const jordan = getTimeline("jordan-maslyn");
requireEvent(jordan, "2025", /Landon Elliott joins as co-owner/);

const tommy2022 = requireEvent(
  getTimeline("tommy-moore"),
  "2022",
  /Finished 1st/
);
assert.deepEqual(tommy2022.badges, [
  "Champion",
  "Historical Co-Champion",
]);

const dave2022 = requireEvent(
  getTimeline("david-besedich"),
  "2022",
  /Finished 2nd/
);
assert.deepEqual(dave2022.badges, [
  "Runner-Up",
  "Historical Co-Champion",
]);
assert.equal(dave2022.badges.includes("Champion"), false);

const gordie = getTimeline("gordie-gahagan");
requireEvent(gordie, "2016", /Final season as Freakshow Freaks owner/);
requireEvent(gordie, "2021", /Remembered by River City/);

const staff = getTimeline("damon-davis");
assert.equal(
  staff.some((event) => event.source === "owner-season-history"),
  false
);
requireEvent(staff, "League", /Staff \/ Auctioneer/);

[
  ray,
  jeffrey,
  landon,
  jordan,
  getTimeline("tommy-moore"),
  getTimeline("david-besedich"),
  gordie,
  staff,
].forEach((timeline) => {
  assert.equal(
    new Set(timeline.map((event) => event.eventKey)).size,
    timeline.length
  );
  assert.equal(
    timeline.some((event) => event.year === "Career"),
    false
  );
});

console.log(
  JSON.stringify(
    {
      ray: ray.map(({ year, title, badges }) => ({ year, title, badges })),
      jeffreyEvents: jeffrey.length,
      landonEvents: landon.length,
      jordanEvents: jordan.length,
      tommy2022: tommy2022.badges,
      dave2022: dave2022.badges,
      retiredEvents: gordie.length,
      staffEvents: staff.length,
    },
    null,
    2
  )
);
