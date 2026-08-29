import type { RiverCityOpeningEvent, RiverCitySeasonConfig } from "@/lib/season/seasonConfig";

export type BoxOneStateName =
  | "DRAFT_UPCOMING"
  | "DRAFT_LIVE"
  | "POST_DRAFT_PRESEASON"
  | "SEASON_LIVE"
  | "DATA_UNAVAILABLE";

export type BoxOneDraftStatus =
  | "pre_draft"
  | "drafting"
  | "paused"
  | "complete"
  | "unknown";

export type BoxOneActionMetadata = {
  showRsvp: boolean;
  showCalendarInvite: boolean;
  showMeet: boolean;
  showLocation: boolean;
  showDraftCountdown: boolean;
  showSeasonCountdown: boolean;
  primaryAction: "none" | "view-matchups";
};

export type BoxOneState = {
  state: BoxOneStateName;
  season: number;
  draftStatus: BoxOneDraftStatus;
  draftId: string | null;
  draftStartAt: string | null;
  seasonStartAt: string | null;
  openingEvent: RiverCityOpeningEvent | null;
  timezone: "America/New_York";
  title: string;
  actions: BoxOneActionMetadata;
  unavailableReason: "draft-status" | "season-config" | null;
};

export type BoxOneStateInput = {
  season: number;
  draftStatus: BoxOneDraftStatus;
  draftId?: string | null;
  draftStartAt?: string | null;
  seasonConfig?: RiverCitySeasonConfig | null;
  now: Date | string;
};

export type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  reached: boolean;
};

function asDate(value: Date | string): Date | null {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function actionsFor(state: BoxOneStateName): BoxOneActionMetadata {
  if (state === "DRAFT_UPCOMING") {
    return { showRsvp: true, showCalendarInvite: true, showMeet: true, showLocation: true, showDraftCountdown: true, showSeasonCountdown: false, primaryAction: "none" };
  }
  if (state === "DRAFT_LIVE") {
    return { showRsvp: false, showCalendarInvite: false, showMeet: true, showLocation: true, showDraftCountdown: false, showSeasonCountdown: false, primaryAction: "none" };
  }
  if (state === "POST_DRAFT_PRESEASON") {
    return { showRsvp: false, showCalendarInvite: false, showMeet: false, showLocation: false, showDraftCountdown: false, showSeasonCountdown: true, primaryAction: "view-matchups" };
  }
  if (state === "SEASON_LIVE") {
    return { showRsvp: false, showCalendarInvite: false, showMeet: false, showLocation: false, showDraftCountdown: false, showSeasonCountdown: false, primaryAction: "view-matchups" };
  }
  return { showRsvp: false, showCalendarInvite: false, showMeet: false, showLocation: false, showDraftCountdown: false, showSeasonCountdown: false, primaryAction: "none" };
}

function buildState(input: BoxOneStateInput, state: BoxOneStateName, title: BoxOneState["title"], unavailableReason: BoxOneState["unavailableReason"], openingEvent: RiverCityOpeningEvent | null): BoxOneState {
  return {
    state,
    season: input.season,
    draftStatus: input.draftStatus,
    draftId: input.draftId ?? null,
    draftStartAt: input.draftStartAt ?? null,
    seasonStartAt: openingEvent?.startsAt ?? null,
    openingEvent,
    timezone: "America/New_York",
    title,
    actions: actionsFor(state),
    unavailableReason,
  };
}

export function resolveBoxOneState(input: BoxOneStateInput): BoxOneState {
  if (input.draftStatus === "unknown") return buildState(input, "DATA_UNAVAILABLE", "DRAFT DETAILS UNAVAILABLE", "draft-status", null);
  if (input.draftStatus === "pre_draft") return buildState(input, "DRAFT_UPCOMING", "DRAFT DAY", null, null);
  if (input.draftStatus === "drafting" || input.draftStatus === "paused") return buildState(input, "DRAFT_LIVE", "DRAFT IN PROGRESS", null, null);

  const openingEvent = input.seasonConfig?.openingEvent ?? null;
  const seasonStartAt = openingEvent?.startsAt ?? null;
  const seasonStart = seasonStartAt ? asDate(seasonStartAt) : null;
  const now = asDate(input.now);
  if (!openingEvent || !seasonStart || !now) return buildState(input, "DATA_UNAVAILABLE", "DRAFT DETAILS UNAVAILABLE", "season-config", null);
  return seasonStart.getTime() > now.getTime()
    ? buildState(input, "POST_DRAFT_PRESEASON", openingEvent.title, null, openingEvent)
    : buildState(input, "SEASON_LIVE", `${input.season} SEASON UNDERWAY`, null, openingEvent);
}

export function getCountdownParts(now: Date | string, target: Date | string): CountdownParts | null {
  const nowDate = asDate(now);
  const targetDate = asDate(target);
  if (!nowDate || !targetDate) return null;
  const remainingMs = Math.max(0, targetDate.getTime() - nowDate.getTime());
  const totalMinutes = Math.floor(remainingMs / 60000);
  return { days: Math.floor(totalMinutes / 1440), hours: Math.floor((totalMinutes % 1440) / 60), minutes: totalMinutes % 60, reached: remainingMs === 0 };
}
