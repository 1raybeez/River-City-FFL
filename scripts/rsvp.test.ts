import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getUniqueRsvpAttendeeIds,
  resolveRsvpAttendee,
  RSVP_ATTENDEES,
} from "../lib/rsvpAttendees";

const page = readFileSync("app/page.tsx", "utf8");
const route = readFileSync("app/api/rsvps/route.ts", "utf8");

assert.equal(RSVP_ATTENDEES.length, 14);
assert.deepEqual(
  RSVP_ATTENDEES.map((attendee) => attendee.name),
  [
    "Ray Long",
    "JD Dowling",
    "Jordan Maslyn",
    "Tommy Moore",
    "Stan Schoppe",
    "Wade Cameron",
    "Doug Fordham",
    "Travis Miller",
    "Rashad Gresham",
    "Brian Stevens",
    "Aaron Hawkins",
    "David Besedich",
    "Landon Elliott",
    "Jeffrey Hudgins",
  ]
);

const ray = resolveRsvpAttendee("ray-long");
const jeffrey = resolveRsvpAttendee("jeffrey-hudgins");
const jordan = resolveRsvpAttendee("jordan-maslyn");
const landon = resolveRsvpAttendee("landon-elliott");
assert.ok(ray && jeffrey && jordan && landon);
assert.notEqual(ray.id, jeffrey.id);
assert.notEqual(jordan.id, landon.id);
assert.equal(resolveRsvpAttendee(ray.legacyIds[0])?.id, ray.id);
assert.equal(resolveRsvpAttendee(landon.legacyIds[0])?.id, landon.id);
assert.equal(resolveRsvpAttendee("not-an-attendee"), null);

assert.equal(
  getUniqueRsvpAttendeeIds([
    { id: ray.legacyIds[0] },
    { id: ray.id },
    { id: jeffrey.id },
    { id: "unknown" },
  ]).size,
  2
);

assert.match(page, /RSVP_ATTENDEES/);
assert.match(page, /Select your name for RSVP/);
assert.match(page, /https:\/\/calendar\.app\.google\/QYqFqoGATsB9rkxb8/);
assert.match(page, /https:\/\/meet\.google\.com\/hqg-cafx-mcs/);
assert.doesNotMatch(page, /Aaron Dogg/);
assert.doesNotMatch(page, /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);

assert.match(route, /resolveRsvpAttendee/);
assert.match(route, /firestore\.collection\("rsvps"\)\.doc\(attendee\.id\)\.set/);
assert.match(route, /FieldValue\.serverTimestamp\(\)/);
assert.match(route, /status: "Attending"/);
assert.doesNotMatch(route, /calendar|google\.com\/meet|email/i);

console.log("RSVP attendee checks passed.");
