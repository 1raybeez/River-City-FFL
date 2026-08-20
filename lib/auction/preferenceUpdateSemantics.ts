import type { AuctionOwnerPlayerPreference, AuctionOwnerPreferenceTag } from "@/lib/auction/ownerPreferenceTypes";

export type AuctionOwnerPreferencePatch = {
  tag?: AuctionOwnerPreferenceTag;
  preferredEntry?: number | null;
  plannedCap?: number | null;
  note?: string | null;
};

export function mergeAuctionOwnerPreferencePatch(
  existing: Pick<
    AuctionOwnerPlayerPreference,
    "tag" | "preferredEntry" | "plannedCap" | "note"
  > | null,
  patch: AuctionOwnerPreferencePatch
) {
  return {
    tag: patch.tag ?? existing?.tag ?? "open",
    preferredEntry:
      Object.prototype.hasOwnProperty.call(patch, "preferredEntry")
        ? patch.preferredEntry ?? null
        : existing?.preferredEntry ?? null,
    plannedCap:
      Object.prototype.hasOwnProperty.call(patch, "plannedCap")
        ? patch.plannedCap ?? null
        : existing?.plannedCap ?? null,
    note:
      Object.prototype.hasOwnProperty.call(patch, "note")
        ? patch.note ?? null
        : existing?.note ?? null,
  } satisfies Pick<
    AuctionOwnerPlayerPreference,
    "tag" | "preferredEntry" | "plannedCap" | "note"
  >;
}
