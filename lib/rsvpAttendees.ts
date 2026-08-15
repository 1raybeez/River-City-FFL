import { ownerProfiles } from "@/lib/managers/identityData";
import { OwnerProfileStatus } from "@/lib/managers/identityTypes";

export type RsvpAttendee = {
  id: string;
  name: string;
  legacyIds: readonly string[];
};

export const RSVP_ATTENDEES: readonly RsvpAttendee[] = ownerProfiles
  .filter((profile) => profile.status === OwnerProfileStatus.Active)
  .map((profile) => ({
    id: profile.id,
    name: profile.fullName,
    legacyIds: profile.sleeperIds,
  }));

const attendeeById = new Map<string, RsvpAttendee>();
RSVP_ATTENDEES.forEach((attendee) => {
  attendeeById.set(attendee.id, attendee);
  attendee.legacyIds.forEach((legacyId) => attendeeById.set(legacyId, attendee));
});

export function resolveRsvpAttendee(value: unknown) {
  if (typeof value !== "string") return null;
  return attendeeById.get(value.trim()) ?? null;
}

export function getUniqueRsvpAttendeeIds(records: readonly { id?: unknown }[]) {
  return new Set(
    records.flatMap((record) => {
      const attendee = resolveRsvpAttendee(record.id);
      return attendee ? [attendee.id] : [];
    })
  );
}
