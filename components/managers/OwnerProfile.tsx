"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  History,
  MapPin,
  MessageCircle,
  Quote,
  Shield,
  Swords,
  Trophy,
  UserRound,
} from "lucide-react";
import type {
  OwnerCareerMatchupSummary,
  OwnerMatchupRecord,
  OwnerMatchupSourceAvailability,
  OwnerOpponentMatchupSummary,
  OwnerSeasonMatchupSummary,
} from "@/lib/history/ownerMatchupSummary";
import type { OwnerCareerSummary } from "@/lib/history/ownerCareerSummary";
import type { OwnerSeasonHistoryRecord } from "@/lib/history/ownerSeasonHistory";
import type { OwnerCareerTimelineEvent } from "@/lib/managers/ownerCareerTimeline";
import { teamColors } from "@/lib/themes/teamColors";
import {
  AccomplishmentAttribution,
  OwnerProfileStatus,
  type FranchiseStatSummary,
  type OwnerSurveyProfile,
} from "@/lib/managers/identityTypes";
import type {
  OwnerProfileViewModel,
  ProfileRelationship,
  ProfileTenure,
} from "@/lib/managers/identitySelectors";

const NFL_TEAM_NAMES: Record<string, string> = {
  ATL: "Atlanta Falcons",
  CAR: "Carolina Panthers",
  CLE: "Cleveland Browns",
  DET: "Detroit Lions",
  GB: "Green Bay Packers",
  MIN: "Minnesota Vikings",
  NO: "New Orleans Saints",
  NYG: "New York Giants",
  NYJ: "New York Jets",
  PIT: "Pittsburgh Steelers",
  SF: "San Francisco 49ers",
  TB: "Tampa Bay Buccaneers",
  WAS: "Washington Commanders",
};

const VALUE_POSITION_LABELS: Record<string, string> = {
  QB: "Quarterback (QB)",
  RB: "Running Back (RB)",
  WR: "Wide Receiver (WR)",
  TE: "Tight End (TE)",
  K: "Kicker (K)",
  DEF: "Defense / Special Teams (DEF)",
};

type ContactMethodDisplay = {
  label: string;
  icon?: string;
};

const CONTACT_METHODS: Record<string, ContactMethodDisplay> = {
  Text: { label: "iMessage", icon: "/logos/iMessage.png" },
  WhatsApp: { label: "WhatsApp", icon: "/logos/WhatsApp.png" },
  Sleeper: { label: "Sleeper DM", icon: "/logos/Sleeper.png" },
};

const SLEEPER_LEAGUE_ID = "1312149033254416384";

type SleeperFetchStatus = "idle" | "loading" | "ready" | "error";

type SleeperLeagueInfo = {
  season?: string;
  metadata?: Record<string, string | undefined>;
};

type SleeperRoster = {
  owner_id?: string;
  roster_id?: number;
  settings?: {
    division?: number | string | null;
    wins?: number;
    losses?: number;
    ties?: number;
    fpts?: number;
    fpts_decimal?: number;
  };
};

type CurrentDivisionData = {
  divisionName: string;
  seasonLabel: string;
  standingsReady: boolean;
  rank?: number;
  record?: string;
  pointsFor?: string;
};

type OpponentIdentity = {
  ownerId: string;
  slug: string;
  fullName: string;
  photo?: string | null;
};

type SeasonHistoryEntry = Readonly<{
  season: number;
  ownerId: string;
  ownerSeason: OwnerSeasonHistoryRecord | null;
  matchupSummary: OwnerSeasonMatchupSummary | null;
}>;

function getAccentColor(profile: OwnerProfileViewModel) {
  const teamCode =
    profile.heroFranchise?.colorTeamCode ?? profile.owner.survey.favoriteNflTeam;
  return teamColors[teamCode ?? ""]?.primary ?? "#dc2626";
}

function getNflTeamLabel(teamCode?: string) {
  if (!teamCode) return undefined;
  return NFL_TEAM_NAMES[teamCode] ?? teamCode;
}

function getFavoritePlayerLabel(survey: OwnerSurveyProfile) {
  if (survey.favoritePlayerName) return survey.favoritePlayerName;
  return undefined;
}

function getValuePositionLabel(valuePosition?: string) {
  if (!valuePosition) return undefined;
  return VALUE_POSITION_LABELS[valuePosition] ?? valuePosition;
}

function getContactMethod(preferredContact?: string) {
  if (!preferredContact) return undefined;
  return CONTACT_METHODS[preferredContact] ?? { label: preferredContact };
}

function getDivisionName(
  leagueInfo: SleeperLeagueInfo | null,
  divisionId: number
) {
  const metadataName = leagueInfo?.metadata?.[`division_${divisionId}`]?.trim();
  return metadataName || `Division ${divisionId}`;
}

function getRosterDivisionId(roster: SleeperRoster) {
  const division = Number(roster.settings?.division);
  return Number.isFinite(division) && division > 0 ? division : null;
}

function getRosterPointsFor(roster: SleeperRoster) {
  const wholePoints = Number(roster.settings?.fpts) || 0;
  const decimalPoints = Number(roster.settings?.fpts_decimal) || 0;
  return wholePoints + decimalPoints / 100;
}

function getRosterRecord(roster: SleeperRoster) {
  const wins = Number(roster.settings?.wins) || 0;
  const losses = Number(roster.settings?.losses) || 0;
  const ties = Number(roster.settings?.ties) || 0;

  return ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;
}

function hasStartedStandings(rosters: SleeperRoster[]) {
  return rosters.some((roster) => {
    const wins = Number(roster.settings?.wins) || 0;
    const losses = Number(roster.settings?.losses) || 0;
    const ties = Number(roster.settings?.ties) || 0;
    return wins + losses + ties > 0 || getRosterPointsFor(roster) > 0;
  });
}

function buildCurrentDivisionData({
  profile,
  leagueInfo,
  rosters,
}: {
  profile: OwnerProfileViewModel;
  leagueInfo: SleeperLeagueInfo | null;
  rosters: SleeperRoster[];
}): CurrentDivisionData | null {
  const sleeperIds = new Set(profile.owner.sleeperIds);
  const currentRosterIds = new Set(
    profile.currentFranchises
      .map((franchise) => franchise.currentSleeperRosterId)
      .filter((rosterId): rosterId is number => typeof rosterId === "number")
  );
  const roster = rosters.find(
    (candidate) =>
      (candidate.owner_id && sleeperIds.has(candidate.owner_id)) ||
      (typeof candidate.roster_id === "number" &&
        currentRosterIds.has(candidate.roster_id))
  );

  if (!roster) return null;

  const divisionId = getRosterDivisionId(roster);
  if (!divisionId) return null;

  const divisionRosters = rosters.filter(
    (candidate) => getRosterDivisionId(candidate) === divisionId
  );
  const standingsReady = hasStartedStandings(divisionRosters);
  const data: CurrentDivisionData = {
    divisionName: getDivisionName(leagueInfo, divisionId),
    seasonLabel: leagueInfo?.season ?? "2026",
    standingsReady,
  };

  if (!standingsReady) return data;

  const rankedRosters = [...divisionRosters].sort((a, b) => {
    const winsDiff = (Number(b.settings?.wins) || 0) - (Number(a.settings?.wins) || 0);
    if (winsDiff !== 0) return winsDiff;

    const pointsDiff = getRosterPointsFor(b) - getRosterPointsFor(a);
    if (pointsDiff !== 0) return pointsDiff;

    return (Number(a.settings?.losses) || 0) - (Number(b.settings?.losses) || 0);
  });
  const rankIndex = rankedRosters.findIndex(
    (candidate) => candidate.roster_id === roster.roster_id
  );
  const pointsFor = getRosterPointsFor(roster);

  return {
    ...data,
    rank: rankIndex >= 0 ? rankIndex + 1 : undefined,
    record: getRosterRecord(roster),
    pointsFor: pointsFor > 0 ? pointsFor.toFixed(2) : undefined,
  };
}

function getStatLabel(summary: FranchiseStatSummary) {
  if (
    summary.accomplishmentAttribution ===
    AccomplishmentAttribution.SharedFranchise
  ) {
    return "Shared Franchise Record";
  }

  if (
    summary.accomplishmentAttribution === AccomplishmentAttribution.LegacyOwner
  ) {
    return "Retired Owner Legacy";
  }

  return "Franchise Record";
}

function getSharedStatCopy(summary: FranchiseStatSummary) {
  if (summary.franchiseId === "prestigio-mundial") {
    return "Prestigio Mundial record, shared by Ray Long and Jeffrey Hudgins.";
  }

  if (summary.franchiseId === "shake-n-bakers") {
    return "The Shake-N-Bakers record is attributed to Jordan Maslyn as primary owner.";
  }

  if (summary.franchiseId === "special-brownies") {
    return "Special Brownies remains Landon Elliott's retired-owner legacy.";
  }

  return summary.notes?.[0];
}

function StatTile({
  label,
  value,
  accentColor,
  icon,
}: {
  label: string;
  value: string | number;
  accentColor: string;
  icon: ReactNode;
}) {
  return (
    <div className="min-h-24 rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-[#121212]">
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-black/[0.04] dark:bg-white/[0.06]">
        <span style={{ color: accentColor }}>{icon}</span>
      </div>
      <p className="text-2xl font-black leading-none">{value}</p>
      <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">
        {label}
      </p>
    </div>
  );
}

function SectionShell({
  id,
  title,
  icon,
  children,
}: {
  id?: string;
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-6 rounded-lg border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-[#121212]"
    >
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-black text-white dark:bg-white dark:text-black">
          {icon}
        </div>
        <h2 className="text-sm font-black uppercase tracking-widest">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function CoOwnerRelationshipCard({
  relationship,
  accentColor,
}: {
  relationship: ProfileRelationship;
  accentColor: string;
}) {
  const content = (
    <div
      className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-black/10 bg-black/[0.03] px-4 py-3 text-left transition hover:bg-black/[0.05] dark:border-white/10 dark:bg-white/[0.06] dark:hover:bg-white/[0.08]"
      style={{ borderLeftColor: accentColor, borderLeftWidth: 4 }}
    >
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">
          {relationship.roleLabel}
        </p>
        <p className="mt-1 truncate text-sm font-black uppercase">
          {relationship.fullName}
        </p>
        <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-black/45 dark:text-white/45">
          {relationship.detail}
        </p>
      </div>
      {relationship.href && (
        <ArrowRight className="h-4 w-4 shrink-0 text-black/35 dark:text-white/35" />
      )}
    </div>
  );

  if (!relationship.href) return content;

  return (
    <Link
      href={relationship.href}
      aria-label={`View ${relationship.fullName} profile`}
      className="block min-w-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-4 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#121212]"
    >
      {content}
    </Link>
  );
}

function HeroSection({ profile }: { profile: OwnerProfileViewModel }) {
  const { owner } = profile;
  const accentColor = getAccentColor(profile);

  return (
    <section
      className="overflow-hidden rounded-lg border border-black/10 bg-white dark:border-white/10 dark:bg-[#121212]"
      style={{ borderTopColor: accentColor, borderTopWidth: 6 }}
    >
      <div className="grid gap-0 lg:grid-cols-[minmax(280px,320px)_1fr]">
        <div className="relative h-[300px] max-h-[42vh] bg-black/10 dark:bg-white/5 sm:h-[340px] lg:h-auto lg:max-h-none lg:min-h-[360px]">
          {owner.photo ? (
            <Image
              src={owner.photo}
              alt={owner.fullName}
              fill
              sizes="(min-width: 1024px) 320px, 100vw"
              className="object-cover object-top"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-8xl font-black text-black/20 dark:text-white/20">
              {owner.shortName[0]}
            </div>
          )}
        </div>

        <div className="p-6 sm:p-8 lg:p-10">
          <Link
            href="/managers"
            className="mb-8 inline-flex items-center gap-2 rounded-md border border-black/10 bg-black/[0.03] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-black/55 transition hover:text-black dark:border-white/10 dark:bg-white/[0.06] dark:text-white/55 dark:hover:text-white"
          >
            <ArrowLeft size={13} />
            Back to Managers
          </Link>
          <div className="mb-5 flex flex-wrap gap-2">
            <span
              className="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest"
              style={{
                backgroundColor: `${accentColor}1f`,
                color: accentColor,
              }}
            >
              {profile.statusLabel}
            </span>
            {owner.roles.map((role) => (
              <span
                key={role}
                className="rounded-full border border-black/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-black/50 dark:border-white/10 dark:text-white/50"
              >
                {role}
              </span>
            ))}
            {owner.location && (
              <span className="inline-flex items-center gap-1 rounded-full border border-black/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-black/50 dark:border-white/10 dark:text-white/50">
                <MapPin size={12} />
                {owner.location}
              </span>
            )}
          </div>

          <h1 className="text-4xl font-black uppercase italic leading-none sm:text-5xl">
            {owner.fullName}
          </h1>
          <p className="mt-3 text-sm font-black uppercase tracking-[0.25em] text-black/45 dark:text-white/45">
            {profile.primaryTeamLabel}
          </p>

          {profile.coOwnerDisplay.length > 0 && (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {profile.coOwnerDisplay.map((relationship) => (
                <CoOwnerRelationshipCard
                  key={`${relationship.ownerId}-${relationship.franchiseName}`}
                  relationship={relationship}
                  accentColor={accentColor}
                />
              ))}
            </div>
          )}

          {owner.survey.bio && (
            <p className="mt-8 max-w-3xl text-base font-medium leading-8 text-black/65 dark:text-white/65">
              {owner.survey.bio}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function formatMatchupRecord(record: OwnerMatchupRecord) {
  return record.ties > 0
    ? `${record.wins}-${record.losses}-${record.ties}`
    : `${record.wins}-${record.losses}`;
}

function getAccessibleMatchupRecord(record: OwnerMatchupRecord) {
  const wins = `${record.wins} ${record.wins === 1 ? "win" : "wins"}`;
  const losses = `${record.losses} ${
    record.losses === 1 ? "loss" : "losses"
  }`;
  const ties = `${record.ties} ${record.ties === 1 ? "tie" : "ties"}`;
  return `${wins}, ${losses}, ${ties}`;
}

const WINNING_PERCENTAGE_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function formatWinningPercentage(value: number | null) {
  return value === null ? "—" : WINNING_PERCENTAGE_FORMATTER.format(value);
}

function formatPoints(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getMatchupCoverageMessage(summary: OwnerCareerMatchupSummary) {
  if (summary.coverage.sourceAvailability === "unavailable-no-source") {
    return "Matchup-level source data is unavailable for these represented seasons. No record has been inferred.";
  }

  if (
    summary.coverage.sourceAvailability ===
    "available-no-completed-games"
  ) {
    return "Matchup source coverage is available, but no completed games have been recorded.";
  }

  if (summary.coverage.sourceAvailability === "not-applicable") {
    return "No competitive owner matchup history applies to this profile.";
  }

  if (summary.seasonsWithoutMatchupSource.length > 0) {
    return "Matchup source coverage begins in 2018. Earlier owner-seasons are excluded from these records.";
  }

  return null;
}

function CareerSnapshot({
  profile,
  summary,
}: {
  profile: OwnerProfileViewModel;
  summary: OwnerCareerMatchupSummary;
}) {
  const accentColor = getAccentColor(profile);
  const recordsAvailable =
    summary.coverage.sourceAvailability === "available";
  const unavailableValue = "—";
  const overall = summary.records.overall;
  const coverageMessage = getMatchupCoverageMessage(summary);
  const tiles: Array<{
    label: string;
    value: string | number;
    icon: ReactNode;
  }> = [
    {
      label: "Overall Record",
      value: recordsAvailable
        ? formatMatchupRecord(overall)
        : unavailableValue,
      icon: <Shield size={16} />,
    },
    {
      label: "Regular Season Record",
      value: recordsAvailable
        ? formatMatchupRecord(summary.records.regularSeason)
        : unavailableValue,
      icon: <Shield size={16} />,
    },
    {
      label: "Championship Playoff Record",
      value: recordsAvailable
        ? formatMatchupRecord(summary.records.championshipPlayoff)
        : unavailableValue,
      icon: <Swords size={16} />,
    },
    {
      label: "Championship Game Record",
      value: recordsAvailable
        ? formatMatchupRecord(summary.records.championshipGames)
        : unavailableValue,
      icon: <Trophy size={16} />,
    },
    {
      label: "Winning %",
      value: recordsAvailable
        ? formatWinningPercentage(overall.winningPercentage)
        : unavailableValue,
      icon: <Trophy size={16} />,
    },
    {
      label: "Points For",
      value: recordsAvailable
        ? formatPoints(overall.pointsFor)
        : unavailableValue,
      icon: <ArrowRight size={16} />,
    },
    {
      label: "Points Against",
      value: recordsAvailable
        ? formatPoints(overall.pointsAgainst)
        : unavailableValue,
      icon: <ArrowLeft size={16} />,
    },
    {
      label: "Point Differential",
      value: recordsAvailable
        ? `${overall.pointDifferential > 0 ? "+" : ""}${formatPoints(
            overall.pointDifferential
          )}`
        : unavailableValue,
      icon: <Swords size={16} />,
    },
    {
      label: "First Matchup Season",
      value: summary.firstMatchupSeason ?? unavailableValue,
      icon: <History size={16} />,
    },
    {
      label: "Latest Matchup Season",
      value: summary.latestMatchupSeason ?? unavailableValue,
      icon: <History size={16} />,
    },
  ];

  return (
    <SectionShell title="Career Snapshot" icon={<Trophy size={16} />}>
      {coverageMessage && (
        <p className="mb-4 rounded-lg border border-black/10 bg-black/[0.02] p-3 text-xs font-medium leading-5 text-black/55 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/55">
          {coverageMessage}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        {tiles.map((tile) => (
          <StatTile
            key={tile.label}
            label={tile.label}
            value={tile.value}
            accentColor={accentColor}
            icon={tile.icon}
          />
        ))}
      </div>
    </SectionShell>
  );
}

function OverviewPanel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-black/40 dark:text-white/40">{icon}</span>
        <h3 className="text-[10px] font-black uppercase tracking-widest text-black/45 dark:text-white/45">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function OwnerOverview({
  profile,
  careerSummary,
  matchupSummary,
  opponentSummaries,
  opponentIdentities,
}: {
  profile: OwnerProfileViewModel;
  careerSummary: OwnerCareerSummary;
  matchupSummary: OwnerCareerMatchupSummary;
  opponentSummaries: readonly OwnerOpponentMatchupSummary[];
  opponentIdentities: readonly OpponentIdentity[];
}) {
  const { survey } = profile.owner;
  const matchupAvailable =
    matchupSummary.coverage.sourceAvailability === "available";
  const matchupCoverageMessage = getMatchupCoverageMessage(matchupSummary);
  const hasCompetitiveCareer = careerSummary.seasons.seasonsRepresented > 0;
  const latestTeam =
    careerSummary.latestFranchise?.franchiseName ?? profile.primaryTeamLabel;
  const favoriteNflTeam = getNflTeamLabel(survey.favoriteNflTeam);
  const favoritePlayer = getFavoritePlayerLabel(survey);
  const valuePosition = getValuePositionLabel(survey.valuePosition);
  const contactMethod = getContactMethod(survey.preferredContact);
  const scoutingFields = [
    survey.teamBuildingMode
      ? { label: "Team Mode", value: survey.teamBuildingMode }
      : null,
    survey.draftPreference
      ? { label: "Draft Style", value: survey.draftPreference }
      : null,
    typeof survey.tradeAggression === "number"
      ? { label: "Trade Aggression", value: `${survey.tradeAggression}/10` }
      : null,
    valuePosition ? { label: "Value Position", value: valuePosition } : null,
    favoriteNflTeam
      ? { label: "Favorite NFL Team", value: favoriteNflTeam }
      : null,
    favoritePlayer
      ? { label: "Favorite Player", value: favoritePlayer }
      : null,
  ].filter((field): field is { label: string; value: string } => field !== null);
  const rivalSummary = survey.rivalOwnerId
    ? opponentSummaries.find(
        (summary) => summary.opponentOwnerId === survey.rivalOwnerId
      )
    : undefined;
  const rivalIdentity = survey.rivalOwnerId
    ? opponentIdentities.find(
        (identity) => identity.ownerId === survey.rivalOwnerId
      )
    : undefined;
  const rivalName = survey.rivalName ?? rivalIdentity?.fullName;
  const rivalPhoto = survey.rivalImage ?? rivalIdentity?.photo;
  const showContactAndQuote = Boolean(contactMethod || survey.philosophy);

  return (
    <SectionShell id="overview" title="Owner Overview" icon={<UserRound size={16} />}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className="space-y-4">
          <OverviewPanel title="Owner Summary" icon={<Shield size={15} />}>
            <p className="text-2xl font-black uppercase italic">
              {profile.owner.fullName}
            </p>
            <p className="mt-1 text-sm font-black uppercase tracking-wider text-black/50 dark:text-white/50">
              {latestTeam}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-black/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider dark:border-white/10">
                {profile.statusLabel}
              </span>
              {profile.owner.roles.map((role) => (
                <span
                  key={role}
                  className="rounded-full border border-black/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-black/55 dark:border-white/10 dark:text-white/55"
                >
                  {role}
                </span>
              ))}
            </div>
          </OverviewPanel>

          <OverviewPanel title="Career Record" icon={<Swords size={15} />}>
            {matchupAvailable ? (
              <div className="grid grid-cols-2 gap-2">
                <LegacyMetric
                  label="Overall Record"
                  value={formatMatchupRecord(matchupSummary.records.overall)}
                />
                <LegacyMetric
                  label="Winning %"
                  value={formatWinningPercentage(
                    matchupSummary.records.overall.winningPercentage
                  )}
                />
              </div>
            ) : (
              <p className="text-sm font-medium leading-6 text-black/55 dark:text-white/55">
                {matchupCoverageMessage ??
                  "No competitive matchup record is available for this profile."}
              </p>
            )}
          </OverviewPanel>

          <OverviewPanel title="Career Success" icon={<Trophy size={15} />}>
            {hasCompetitiveCareer ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <LegacyMetric
                  label="League-Recognized Titles"
                  value={careerSummary.placements.historicalChampionships}
                />
                {careerSummary.placements.platformChampionships !==
                  careerSummary.placements.historicalChampionships && (
                  <LegacyMetric
                    label="Platform First-Place Finishes"
                    value={careerSummary.placements.platformChampionships}
                  />
                )}
                <LegacyMetric
                  label="Podiums"
                  value={careerSummary.placements.podiums}
                />
                {careerSummary.placements.bestFinish !== null && (
                  <LegacyMetric
                    label="Best Finish"
                    value={formatPlacement(
                      careerSummary.placements.bestFinish
                    )}
                  />
                )}
                <LegacyMetric
                  label="Active Seasons"
                  value={careerSummary.seasons.seasonsRepresented}
                />
              </div>
            ) : (
              <p className="text-sm font-medium leading-6 text-black/55 dark:text-white/55">
                No competitive owner career applies to this profile.
              </p>
            )}
          </OverviewPanel>
        </div>

        <div className="space-y-4">
          {scoutingFields.length > 0 && (
            <OverviewPanel title="Scouting Report" icon={<UserRound size={15} />}>
              <div className="grid grid-cols-2 gap-2">
                {scoutingFields.map((field) => (
                  <PersonalityField
                    key={field.label}
                    label={field.label}
                    value={field.value}
                  />
                ))}
              </div>
            </OverviewPanel>
          )}

          {rivalName && (
            <OverviewPanel title="Primary Rival" icon={<Swords size={15} />}>
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-black/10 bg-black/10 dark:border-white/10 dark:bg-white/10">
                  {rivalPhoto ? (
                    <Image
                      src={rivalPhoto}
                      alt={`${rivalName} profile photo`}
                      fill
                      sizes="48px"
                      className="object-cover object-top"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-lg font-black text-black/30 dark:text-white/30">
                      {rivalName[0]}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-lg font-black uppercase italic">
                    {rivalName}
                  </p>
                  {rivalSummary && (
                    <p className="mt-1 text-xs font-black uppercase tracking-wider text-black/45 dark:text-white/45">
                      {formatMatchupRecord(rivalSummary.records.overall)} ·{" "}
                      {rivalSummary.meetings} meetings ·{" "}
                      {formatWinningPercentage(
                        rivalSummary.records.overall.winningPercentage
                      )}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {profile.rivalProfilePath && (
                  <Link
                    href={profile.rivalProfilePath}
                    className="inline-flex items-center gap-2 rounded-md bg-black px-3 py-2 text-[9px] font-black uppercase tracking-widest text-white transition hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/80"
                  >
                    View Rival Profile
                    <ArrowRight size={12} />
                  </Link>
                )}
                <Link
                  href="/league-info/rivalries"
                  className="inline-flex rounded-md border border-black/10 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-black/50 transition hover:text-black dark:border-white/10 dark:text-white/50 dark:hover:text-white"
                >
                  Rivalry Hub
                </Link>
              </div>
            </OverviewPanel>
          )}

          {showContactAndQuote && (
            <OverviewPanel title="Contact & Quote" icon={<MessageCircle size={15} />}>
              {contactMethod && (
                <div className="flex items-center gap-3">
                  {contactMethod.icon && (
                    <Image
                      src={contactMethod.icon}
                      alt=""
                      width={24}
                      height={24}
                      className="h-6 w-6 object-contain"
                    />
                  )}
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-black/35 dark:text-white/35">
                      Preferred Contact
                    </p>
                    <p className="mt-1 text-sm font-black">
                      {contactMethod.label}
                    </p>
                  </div>
                </div>
              )}
              {survey.philosophy && (
                <div className={`${contactMethod ? "mt-4 border-t border-black/10 pt-4 dark:border-white/10" : ""}`}>
                  <div className="mb-2 flex items-center gap-2 text-black/35 dark:text-white/35">
                    <Quote size={13} />
                    <span className="text-[9px] font-black uppercase tracking-widest">
                      Owner Quote
                    </span>
                  </div>
                  <p className="text-sm font-black italic leading-6">
                    “{survey.philosophy}”
                  </p>
                </div>
              )}
            </OverviewPanel>
          )}
        </div>
      </div>
    </SectionShell>
  );
}

function TeamLegacy({ profile }: { profile: OwnerProfileViewModel }) {
  const tenureGroups = [...profile.currentTenures, ...profile.legacyTenures];

  if (tenureGroups.length === 0) return null;

  return (
    <SectionShell title="Team Legacy" icon={<Shield size={16} />}>
      <div className="space-y-4">
        {tenureGroups.map((tenure) => (
          <LegacyRow key={tenure.id} tenure={tenure} />
        ))}
      </div>
    </SectionShell>
  );
}

function CurrentDivisionCard({ profile }: { profile: OwnerProfileViewModel }) {
  const shouldShow =
    profile.owner.status === OwnerProfileStatus.Active &&
    profile.currentFranchises.some(
      (franchise) => typeof franchise.currentSleeperRosterId === "number"
    );
  const accentColor = getAccentColor(profile);
  const [status, setStatus] = useState<SleeperFetchStatus>("idle");
  const [leagueInfo, setLeagueInfo] = useState<SleeperLeagueInfo | null>(null);
  const [rosters, setRosters] = useState<SleeperRoster[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shouldShow) return;

    let cancelled = false;

    async function fetchCurrentDivision() {
      setStatus("loading");
      setError(null);

      try {
        const [leagueResponse, rostersResponse] = await Promise.all([
          fetch(`https://api.sleeper.app/v1/league/${SLEEPER_LEAGUE_ID}`),
          fetch(
            `https://api.sleeper.app/v1/league/${SLEEPER_LEAGUE_ID}/rosters`
          ),
        ]);

        if (!leagueResponse.ok || !rostersResponse.ok) {
          throw new Error("Sleeper division context is unavailable.");
        }

        const [nextLeagueInfo, nextRosters] = await Promise.all([
          leagueResponse.json() as Promise<SleeperLeagueInfo>,
          rostersResponse.json() as Promise<SleeperRoster[]>,
        ]);

        if (cancelled) return;

        setLeagueInfo(nextLeagueInfo);
        setRosters(Array.isArray(nextRosters) ? nextRosters : []);
        setStatus("ready");
      } catch (caughtError) {
        console.error("Sleeper owner division fetch failed:", caughtError);
        if (cancelled) return;

        setStatus("error");
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Sleeper division context is unavailable."
        );
      }
    }

    fetchCurrentDivision();

    return () => {
      cancelled = true;
    };
  }, [shouldShow]);

  const divisionData = useMemo(
    () => buildCurrentDivisionData({ profile, leagueInfo, rosters }),
    [leagueInfo, profile, rosters]
  );

  if (!shouldShow) return null;

  if (status === "loading" || status === "idle") {
    return (
      <SectionShell id="division" title="Current Division" icon={<Shield size={16} />}>
        <p className="text-sm font-medium text-black/55 dark:text-white/55">
          Loading current Sleeper division context...
        </p>
      </SectionShell>
    );
  }

  if (status === "error") {
    return (
      <SectionShell id="division" title="Current Division" icon={<Shield size={16} />}>
        <p className="text-sm font-medium text-black/55 dark:text-white/55">
          {error || "Current division context is unavailable right now."}
        </p>
      </SectionShell>
    );
  }

  if (!divisionData) return null;

  const standingsFields: Array<{ label: string; value: string | number }> = [];

  if (typeof divisionData.rank === "number") {
    standingsFields.push({
      label: "Division Rank",
      value: `${divisionData.rank}`,
    });
  }

  if (divisionData.record) {
    standingsFields.push({ label: "Record", value: divisionData.record });
  }

  if (divisionData.pointsFor) {
    standingsFields.push({
      label: "Points For",
      value: divisionData.pointsFor,
    });
  }

  return (
    <SectionShell id="division" title="Current Division" icon={<Shield size={16} />}>
      <div
        className="rounded-lg border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.04]"
        style={{ borderLeftColor: accentColor, borderLeftWidth: 4 }}
      >
        <p className="text-[10px] font-black uppercase tracking-widest text-black/35 dark:text-white/35">
          Sleeper season {divisionData.seasonLabel}
        </p>
        <p className="mt-2 text-2xl font-black uppercase italic">
          {divisionData.divisionName}
        </p>
      </div>

      {divisionData.standingsReady && standingsFields.length > 0 ? (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {standingsFields.map((field) => (
            <LegacyMetric
              key={field.label}
              label={field.label}
              value={field.value}
            />
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-lg border border-black/10 bg-black/[0.02] p-4 text-sm font-medium text-black/55 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/55">
          Standings available once the season begins.
        </p>
      )}
    </SectionShell>
  );
}

function getTenureFallbackCopy(tenure: ProfileTenure) {
  if (
    tenure.ownerId === "landon-elliott" &&
    tenure.franchiseId === "shake-n-bakers"
  ) {
    return "Current co-owner role; Shake-N-Bakers stats remain attributed to Jordan Maslyn.";
  }

  return undefined;
}

function LegacyRow({ tenure }: { tenure: ProfileTenure }) {
  const summary = tenure.statSummary;
  const fallbackCopy = getTenureFallbackCopy(tenure);
  const metrics: Array<{ label: string; value: string | number }> = [];

  if (summary) {
    metrics.push(
      { label: "Titles", value: summary.championships },
      { label: "Podiums", value: summary.podiums }
    );

    if (summary.bestFinish && summary.bestFinish !== "N/A") {
      metrics.push({ label: "Best", value: summary.bestFinish });
    }

    if (typeof summary.toiletBowls === "number") {
      metrics.push({ label: "Toilets", value: summary.toiletBowls });
    }
  }

  return (
    <div className="rounded-lg border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-lg font-black uppercase italic">
            {tenure.franchise?.currentTeamName ?? tenure.franchiseId}
          </p>
          <p className="mt-1 text-xs font-black uppercase tracking-widest text-black/40 dark:text-white/40">
            {tenure.roleLabel} | {tenure.yearLabel}
          </p>
        </div>
        {summary && (
          <span className="rounded-full border border-black/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-black/50 dark:border-white/10 dark:text-white/50">
            {getStatLabel(summary)}
          </span>
        )}
      </div>

      {tenure.relatedOwnerLabels.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {tenure.relatedOwnerLabels.map((label) => (
            <span
              key={label}
              className="rounded-md bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-black/50 dark:bg-black/20 dark:text-white/50"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {summary && metrics.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          {metrics.map((metric) => (
            <LegacyMetric
              key={metric.label}
              label={metric.label}
              value={metric.value}
            />
          ))}
        </div>
      ) : fallbackCopy ? (
        <p className="mt-4 text-sm font-medium leading-7 text-black/55 dark:text-white/55">
          {fallbackCopy}
        </p>
      ) : null}

      {summary && getSharedStatCopy(summary) && (
        <p className="mt-4 text-sm font-medium leading-7 text-black/55 dark:text-white/55">
          {getSharedStatCopy(summary)}
        </p>
      )}
    </div>
  );
}

function LegacyMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-md bg-white p-3 dark:bg-black/20">
      <p className="text-base font-black">{value}</p>
      <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-black/35 dark:text-white/35">
        {label}
      </p>
    </div>
  );
}

function PersonalityField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.04]">
      <p className="text-[10px] font-black uppercase tracking-widest text-black/35 dark:text-white/35">
        {label}
      </p>
      <p className="mt-2 text-sm font-black">{value}</p>
    </div>
  );
}

function CareerTimeline({
  events,
}: {
  events: readonly OwnerCareerTimelineEvent[];
}) {
  if (events.length === 0) return null;

  return (
    <SectionShell id="timeline" title="Career Timeline" icon={<History size={16} />}>
      <ol className="ml-1 border-l border-black/10 dark:border-white/10">
        {events.map((event) => (
          <li
            key={event.eventKey}
            className="relative pb-5 pl-5 last:pb-0"
          >
            <span
              aria-hidden="true"
              className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-600 dark:border-[#0a0a0a]"
            />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/35 dark:text-white/35">
              {event.year}
            </p>
            <h3 className="mt-1 text-sm font-black uppercase italic sm:text-base">
              {event.title}
            </h3>
            {event.detail && (
              <p className="mt-1 text-xs font-medium leading-5 text-black/50 dark:text-white/50 sm:text-sm">
                {event.detail}
              </p>
            )}
            {event.badges.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {event.badges.map((badge) => (
                  <span
                    key={badge}
                    className="inline-flex rounded-full border border-black/10 bg-black/[0.02] px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-black/55 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/55"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ol>
    </SectionShell>
  );
}

function getSeasonCoverageDisplay(summary: OwnerSeasonMatchupSummary | null) {
  if (!summary) {
    return {
      label: "Summary unavailable",
      detail: "No matchup summary is available for this season.",
    };
  }

  if (summary.coverage.sourceAvailability === "unavailable-no-source") {
    return {
      label: "Source unavailable",
      detail:
        "Matchup-level history is unavailable for this season. No record has been inferred.",
    };
  }

  if (
    summary.coverage.sourceAvailability ===
    "available-no-completed-games"
  ) {
    return {
      label: "No completed games",
      detail:
        "Matchup source coverage is available, but no completed games have been recorded.",
    };
  }

  if (summary.coverage.sourceAvailability === "not-applicable") {
    return {
      label: "Not applicable",
      detail: "No competitive owner matchup history applies to this season.",
    };
  }

  return {
    label: "Available",
    detail: "Completed competitive matchup history is available.",
  };
}

function formatPlacement(placement: number) {
  const remainder = placement % 100;
  if (remainder >= 11 && remainder <= 13) return `${placement}th`;

  const suffix =
    placement % 10 === 1
      ? "st"
      : placement % 10 === 2
        ? "nd"
        : placement % 10 === 3
          ? "rd"
          : "th";
  return `${placement}${suffix}`;
}

function getOwnershipRoleLabel(record: OwnerSeasonHistoryRecord) {
  if (record.ownershipRole === "primary") return "Primary Owner";
  if (record.ownershipRole === "co-owner") return "Co-Owner";
  if (record.ownershipRole === "legacy-owner") return "Legacy Owner";
  return null;
}

function getSeasonResultBadges(record: OwnerSeasonHistoryRecord) {
  const badges: string[] = [];

  if (record.isPlatformChampion) badges.push("Champion");
  else if (record.isPlatformRunnerUp) badges.push("Runner-Up");
  else if (record.isThirdPlace) badges.push("Third Place");
  else if (record.isPodium) badges.push("Podium");

  if (record.historicalChampionshipType === "co-champion") {
    badges.push("Historical Co-Champion");
  } else if (record.isHistoricalChampion && !record.isPlatformChampion) {
    badges.push("Historical Champion");
  }

  if (record.isLastPlace) badges.push("Last Place");

  const ownershipRole = getOwnershipRoleLabel(record);
  if (ownershipRole) badges.push(ownershipRole);

  return badges;
}

function SeasonResultDetails({
  record,
}: {
  record: OwnerSeasonHistoryRecord | null;
}) {
  if (!record || record.coverage.seasonResult !== "resolved") {
    return (
      <div className="mt-4 rounded-md border border-dashed border-black/10 px-3 py-3 dark:border-white/10">
        <p className="text-xs font-black uppercase tracking-widest text-black/45 dark:text-white/45">
          Season result not yet available
        </p>
      </div>
    );
  }

  const badges = getSeasonResultBadges(record);
  const ownershipRole = getOwnershipRoleLabel(record);
  const coOwnerNames = record.coOwners.map((owner) => owner.ownerName);

  return (
    <>
      {badges.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2" aria-label="Season facts">
          {badges.map((badge) => (
            <span
              key={badge}
              className="inline-flex rounded-full border border-black/10 bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-black/60 dark:border-white/10 dark:bg-black/20 dark:text-white/60"
            >
              {badge}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-md bg-white p-3 dark:bg-black/20">
          <p className="text-[9px] font-black uppercase tracking-widest text-black/35 dark:text-white/35">
            Final finish
          </p>
          <p className="mt-1 text-xl font-black uppercase italic">
            {record.finalPlacement === null
              ? "Unavailable"
              : formatPlacement(record.finalPlacement)}
          </p>
        </div>

        <div className="rounded-md bg-white p-3 dark:bg-black/20">
          <p className="text-[9px] font-black uppercase tracking-widest text-black/35 dark:text-white/35">
            Franchise
          </p>
          <p className="mt-1 text-sm font-black">
            {record.franchiseName ?? "Unresolved"}
          </p>
        </div>

        {record.historicalTeamName && (
          <div className="rounded-md bg-white p-3 dark:bg-black/20">
            <p className="text-[9px] font-black uppercase tracking-widest text-black/35 dark:text-white/35">
              Historical team
            </p>
            <p className="mt-1 text-sm font-black">
              {record.historicalTeamName}
            </p>
          </div>
        )}

        {(ownershipRole || coOwnerNames.length > 0) && (
          <div className="rounded-md bg-white p-3 dark:bg-black/20">
            <p className="text-[9px] font-black uppercase tracking-widest text-black/35 dark:text-white/35">
              Ownership
            </p>
            <p className="mt-1 text-sm font-black">
              {ownershipRole ?? "Approved owner"}
            </p>
            {coOwnerNames.length > 0 && (
              <p className="mt-1 text-xs font-medium text-black/50 dark:text-white/50">
                With {coOwnerNames.join(" and ")}
              </p>
            )}
          </div>
        )}
      </div>

      {record.championshipNote && record.isHistoricalChampion && (
        <p className="mt-3 rounded-md border border-black/10 px-3 py-2 text-xs font-medium leading-5 text-black/55 dark:border-white/10 dark:text-white/55">
          {record.championshipNote}
        </p>
      )}
    </>
  );
}

function SeasonHistory({
  entries,
  isCompetitive,
}: {
  entries: readonly SeasonHistoryEntry[];
  isCompetitive: boolean;
}) {
  const orderedEntries = useMemo(
    () => [...entries].sort((first, second) => second.season - first.season),
    [entries]
  );
  const [selectedSeason, setSelectedSeason] = useState<number | null>(
    () => orderedEntries[0]?.season ?? null
  );
  const selectedEntry =
    orderedEntries.find((entry) => entry.season === selectedSeason) ??
    orderedEntries[0] ??
    null;

  if (!selectedEntry) {
    return (
      <SectionShell id="seasons" title="Season History" icon={<History size={16} />}>
        <div className="rounded-lg border border-dashed border-black/10 bg-black/[0.02] px-5 py-8 text-center dark:border-white/10 dark:bg-white/[0.04]">
          <p className="text-sm font-black uppercase italic">
            {isCompetitive
              ? "No season history available"
              : "Season history not applicable"}
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-black/50 dark:text-white/50">
            {isCompetitive
              ? "No approved owner-season results are available for this profile."
              : "This staff profile has no competitive owner-season history."}
          </p>
        </div>
      </SectionShell>
    );
  }

  const summary = selectedEntry.matchupSummary;
  const recordsAvailable =
    summary?.coverage.sourceAvailability === "available";
  const coverage = getSeasonCoverageDisplay(summary);
  const overall = summary?.records.overall;
  const metrics: Array<{
    label: string;
    value: string | number;
  }> =
    recordsAvailable && summary && overall
      ? [
          {
            label: "Overall Record",
            value: formatMatchupRecord(overall),
          },
          {
            label: "Regular Season Record",
            value: formatMatchupRecord(summary.records.regularSeason),
          },
          {
            label: "Championship Playoff Record",
            value: formatMatchupRecord(summary.records.championshipPlayoff),
          },
          {
            label: "Winning %",
            value: formatWinningPercentage(overall.winningPercentage),
          },
          {
            label: "Points For",
            value: formatPoints(overall.pointsFor),
          },
          {
            label: "Points Against",
            value: formatPoints(overall.pointsAgainst),
          },
          {
            label: "Point Differential",
            value: `${overall.pointDifferential > 0 ? "+" : ""}${formatPoints(
              overall.pointDifferential
            )}`,
          },
        ]
      : [];

  if (summary && summary.records.championshipGames.games > 0) {
    metrics.splice(3, 0, {
      label: "Championship Game Record",
      value: formatMatchupRecord(summary.records.championshipGames),
    });
  }

  return (
    <SectionShell id="seasons" title="Season History" icon={<History size={16} />}>
      <div className="space-y-4">
        <label className="block" htmlFor="season-history-select">
          <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">
            Select season
          </span>
          <select
            id="season-history-select"
            value={selectedEntry.season}
            onChange={(event) => setSelectedSeason(Number(event.target.value))}
            className="w-full rounded-md border border-black/10 bg-white px-3 py-2.5 text-sm font-black text-black outline-none transition focus:border-red-600 focus:ring-2 focus:ring-red-600/20 dark:border-white/10 dark:bg-[#0a0a0a] dark:text-white"
          >
            {orderedEntries.map((entry) => (
              <option key={`${entry.ownerId}:${entry.season}`} value={entry.season}>
                {entry.season}
              </option>
            ))}
          </select>
        </label>

        <article className="rounded-lg border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-black/35 dark:text-white/35">
                Season result
              </p>
              <p className="mt-1 text-2xl font-black uppercase italic">
                {selectedEntry.season}
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-[9px] font-black uppercase tracking-widest text-black/35 dark:text-white/35">
                Result status
              </p>
              <p className="mt-1 text-xs font-black uppercase tracking-widest">
                {selectedEntry.ownerSeason?.coverage.seasonResult === "resolved"
                  ? "Available"
                  : "Not available"}
              </p>
            </div>
          </div>

          <SeasonResultDetails record={selectedEntry.ownerSeason} />

          <div className="mt-4 border-t border-black/10 pt-4 dark:border-white/10">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-black/35 dark:text-white/35">
                  Matchup history
                </p>
                <p className="mt-1 text-xs font-black uppercase tracking-widest">
                  {coverage.label}
                </p>
              </div>
              <p className="max-w-xl text-xs font-medium leading-5 text-black/50 dark:text-white/50 sm:text-right">
                {coverage.detail}
              </p>
            </div>

            {metrics.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                {metrics.map((metric) => (
                  <LegacyMetric
                    key={metric.label}
                    label={metric.label}
                    value={metric.value}
                  />
                ))}
              </div>
            )}
          </div>
        </article>
      </div>
    </SectionShell>
  );
}

function getOpponentCoverageDisplay(
  sourceAvailability: OwnerMatchupSourceAvailability
) {
  if (sourceAvailability === "unavailable-no-source") {
    return {
      title: "Opponent history unavailable",
      copy: "Matchup-level source data is unavailable for this owner's represented seasons. No opponent records have been inferred.",
    };
  }

  if (sourceAvailability === "available-no-completed-games") {
    return {
      title: "No completed opponent matchups",
      copy: "Matchup source coverage is available, but no completed games have been recorded.",
    };
  }

  if (sourceAvailability === "not-applicable") {
    return {
      title: "Opponent history not applicable",
      copy: "This profile has no competitive owner matchup history.",
    };
  }

  return {
    title: "No opponent history available",
    copy: "No supported directional opponent records are available for this owner.",
  };
}

function OpponentBadge({
  label,
  tone,
  accessibleDetail,
}: {
  label: string;
  tone: "positive" | "negative" | "neutral" | "playoff" | "championship";
  accessibleDetail?: string;
}) {
  const toneClasses = {
    positive:
      "border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300",
    negative:
      "border-red-600/20 bg-red-600/10 text-red-700 dark:text-red-300",
    neutral:
      "border-black/10 bg-black/[0.04] text-black/55 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/55",
    playoff:
      "border-blue-600/20 bg-blue-600/10 text-blue-700 dark:text-blue-300",
    championship:
      "border-yellow-500/25 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
  } as const;

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-wider ${toneClasses[tone]}`}
    >
      {label}
      {accessibleDetail && <span className="sr-only">, {accessibleDetail}</span>}
    </span>
  );
}

function OpponentBadges({
  summary,
}: {
  summary: OwnerOpponentMatchupSummary;
}) {
  const overall = summary.records.overall;
  const seriesBadge =
    overall.games === 0
      ? null
      : overall.wins > overall.losses
        ? { label: "Winning", tone: "positive" as const }
        : overall.losses > overall.wins
          ? { label: "Losing", tone: "negative" as const }
          : { label: "Even", tone: "neutral" as const };

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {seriesBadge && <OpponentBadge {...seriesBadge} />}
      {summary.records.championshipPlayoff.games > 0 && (
        <OpponentBadge
          label="Playoff Opponent"
          tone="playoff"
          accessibleDetail={`${summary.records.championshipPlayoff.games} playoff ${
            summary.records.championshipPlayoff.games === 1
              ? "meeting"
              : "meetings"
          }`}
        />
      )}
      {summary.records.championshipGames.games > 0 && (
        <OpponentBadge
          label="Championship Opponent"
          tone="championship"
          accessibleDetail={`${summary.records.championshipGames.games} title-game ${
            summary.records.championshipGames.games === 1
              ? "meeting"
              : "meetings"
          }`}
        />
      )}
    </div>
  );
}

function OpponentIdentityDisplay({
  summary,
  identity,
}: {
  summary: OwnerOpponentMatchupSummary;
  identity?: OpponentIdentity;
}) {
  const name = identity?.fullName ?? summary.opponentOwnerId;

  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-black/10 bg-black/10 dark:border-white/10 dark:bg-white/10">
        {identity?.photo ? (
          <Image
            src={identity.photo}
            alt=""
            fill
            sizes="40px"
            className="object-cover object-top"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm font-black text-black/30 dark:text-white/30">
            {name[0]?.toUpperCase() ?? "?"}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-black uppercase">{name}</p>
        <OpponentBadges summary={summary} />
      </div>
    </div>
  );
}

function OpponentRecordDisplay({
  record,
}: {
  record: OwnerMatchupRecord;
}) {
  return (
    <span aria-label={getAccessibleMatchupRecord(record)}>
      {formatMatchupRecord(record)}
    </span>
  );
}

function formatMeeting(reference: OwnerOpponentMatchupSummary["firstMeeting"]) {
  return (
    <>
      <span className="block font-black">{reference.season}</span>
      <span className="mt-0.5 block text-[9px] font-black uppercase tracking-wider text-black/35 dark:text-white/35">
        Week {reference.week}
      </span>
    </>
  );
}

function getSortedOpponentSummaries({
  summaries,
  identities,
}: {
  summaries: readonly OwnerOpponentMatchupSummary[];
  identities: ReadonlyMap<string, OpponentIdentity>;
}) {
  return [...summaries].sort((first, second) => {
    const firstName =
      identities.get(first.opponentOwnerId)?.fullName ??
      first.opponentOwnerId;
    const secondName =
      identities.get(second.opponentOwnerId)?.fullName ??
      second.opponentOwnerId;

    return (
      second.meetings - first.meetings ||
      second.latestMeeting.season - first.latestMeeting.season ||
      second.latestMeeting.week - first.latestMeeting.week ||
      firstName.localeCompare(secondName) ||
      first.opponentOwnerId.localeCompare(second.opponentOwnerId)
    );
  });
}

function OpponentHistoryEmptyState({
  sourceAvailability,
}: {
  sourceAvailability: OwnerMatchupSourceAvailability;
}) {
  const state = getOpponentCoverageDisplay(sourceAvailability);

  return (
    <div className="rounded-lg border border-dashed border-black/10 bg-black/[0.02] px-5 py-10 text-center dark:border-white/10 dark:bg-white/[0.04]">
      <Swords className="mx-auto mb-3 text-black/25 dark:text-white/25" size={28} />
      <p className="text-sm font-black uppercase italic">{state.title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-black/50 dark:text-white/50">
        {state.copy}
      </p>
    </div>
  );
}

function OpponentHistory({
  profile,
  summaries,
  identities,
  sourceAvailability,
  hasEarlierNoSourceSeasons,
}: {
  profile: OwnerProfileViewModel;
  summaries: readonly OwnerOpponentMatchupSummary[];
  identities: readonly OpponentIdentity[];
  sourceAvailability: OwnerMatchupSourceAvailability;
  hasEarlierNoSourceSeasons: boolean;
}) {
  const identitiesByOwnerId = useMemo(
    () => new Map(identities.map((identity) => [identity.ownerId, identity])),
    [identities]
  );
  const sortedSummaries = useMemo(
    () =>
      getSortedOpponentSummaries({
        summaries,
        identities: identitiesByOwnerId,
      }),
    [identitiesByOwnerId, summaries]
  );
  const [selectedSummaryKey, setSelectedSummaryKey] = useState(
    () => sortedSummaries[0]?.summaryKey ?? ""
  );
  const selectedSummary =
    sortedSummaries.find(
      (summary) => summary.summaryKey === selectedSummaryKey
    ) ?? sortedSummaries[0];

  return (
    <SectionShell id="opponents" title="Opponent History" icon={<Swords size={16} />}>
      {sortedSummaries.length === 0 ? (
        <OpponentHistoryEmptyState sourceAvailability={sourceAvailability} />
      ) : (
        <>
          {hasEarlierNoSourceSeasons && (
            <p className="mb-4 rounded-lg border border-black/10 bg-black/[0.02] p-3 text-xs font-medium leading-5 text-black/55 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/55">
              Opponent history begins with supported matchup coverage in 2018.
              Earlier owner-seasons are excluded.
            </p>
          )}

          <label className="mb-4 block" htmlFor="opponent-history-select">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">
              Select opponent
            </span>
            <select
              id="opponent-history-select"
              value={selectedSummary.summaryKey}
              onChange={(event) => setSelectedSummaryKey(event.target.value)}
              className="w-full rounded-md border border-black/10 bg-white px-3 py-2.5 text-sm font-black text-black outline-none transition focus:border-red-600 focus:ring-2 focus:ring-red-600/20 dark:border-white/10 dark:bg-[#0a0a0a] dark:text-white"
            >
              {sortedSummaries.map((summary) => {
                const identity = identitiesByOwnerId.get(
                  summary.opponentOwnerId
                );
                const name = identity?.fullName ?? summary.opponentOwnerId;

                return (
                  <option key={summary.summaryKey} value={summary.summaryKey}>
                    {name} · {summary.meetings}{" "}
                    {summary.meetings === 1 ? "meeting" : "meetings"}
                  </option>
                );
              })}
            </select>
          </label>

          <div
            className="hidden overflow-x-auto pb-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#121212] xl:block"
            tabIndex={0}
            aria-label={`${profile.owner.fullName} opponent history table, horizontally scrollable`}
          >
            <table className="min-w-[940px] w-full border-separate border-spacing-0 text-left">
              <caption className="sr-only">
                Directional opponent history for {profile.owner.fullName}
              </caption>
              <thead>
                <tr className="text-[9px] font-black uppercase tracking-widest text-black/35 dark:text-white/35">
                  <th scope="col" className="border-b border-black/10 px-3 py-3 dark:border-white/10">
                    Opponent
                  </th>
                  <th scope="col" className="border-b border-black/10 px-3 py-3 dark:border-white/10">
                    Overall Record
                  </th>
                  <th scope="col" className="border-b border-black/10 px-3 py-3 dark:border-white/10">
                    <span aria-label="Winning percentage">Win %</span>
                  </th>
                  <th scope="col" className="border-b border-black/10 px-3 py-3 dark:border-white/10">
                    Meetings
                  </th>
                  <th scope="col" className="border-b border-black/10 px-3 py-3 dark:border-white/10">
                    Points For / Against
                  </th>
                  <th scope="col" className="border-b border-black/10 px-3 py-3 dark:border-white/10">
                    Point Differential
                  </th>
                  <th scope="col" className="border-b border-black/10 px-3 py-3 dark:border-white/10">
                    First Meeting
                  </th>
                  <th scope="col" className="border-b border-black/10 px-3 py-3 dark:border-white/10">
                    Latest Meeting
                  </th>
                </tr>
              </thead>
              <tbody>
                {[selectedSummary].map((summary) => {
                  const identity = identitiesByOwnerId.get(
                    summary.opponentOwnerId
                  );
                  const overall = summary.records.overall;

                  return (
                    <tr key={summary.summaryKey} data-opponent-slug={identity?.slug}>
                      <th
                        scope="row"
                        className="border-b border-black/10 px-3 py-4 font-normal dark:border-white/10"
                      >
                        <OpponentIdentityDisplay
                          summary={summary}
                          identity={identity}
                        />
                      </th>
                      <td className="border-b border-black/10 px-3 py-4 text-sm font-black dark:border-white/10">
                        <OpponentRecordDisplay record={overall} />
                      </td>
                      <td className="border-b border-black/10 px-3 py-4 text-sm font-black dark:border-white/10">
                        {formatWinningPercentage(overall.winningPercentage)}
                      </td>
                      <td className="border-b border-black/10 px-3 py-4 text-sm font-black dark:border-white/10">
                        {summary.meetings}
                      </td>
                      <td className="border-b border-black/10 px-3 py-4 text-sm dark:border-white/10">
                        <span className="block font-black">
                          {formatPoints(overall.pointsFor)}
                        </span>
                        <span className="mt-0.5 block text-[9px] font-black uppercase tracking-wider text-black/35 dark:text-white/35">
                          Against {formatPoints(overall.pointsAgainst)}
                        </span>
                      </td>
                      <td className="border-b border-black/10 px-3 py-4 text-sm font-black dark:border-white/10">
                        {overall.pointDifferential > 0 ? "+" : ""}
                        {formatPoints(overall.pointDifferential)}
                      </td>
                      <td className="border-b border-black/10 px-3 py-4 text-sm dark:border-white/10">
                        {formatMeeting(summary.firstMeeting)}
                      </td>
                      <td className="border-b border-black/10 px-3 py-4 text-sm dark:border-white/10">
                        {formatMeeting(summary.latestMeeting)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 xl:hidden sm:grid-cols-2">
            {[selectedSummary].map((summary) => {
              const identity = identitiesByOwnerId.get(
                summary.opponentOwnerId
              );
              const overall = summary.records.overall;
              const metrics = [
                {
                  label: "Record",
                  value: formatMatchupRecord(overall),
                  accessibleValue: getAccessibleMatchupRecord(overall),
                },
                {
                  label: "Win %",
                  value: formatWinningPercentage(overall.winningPercentage),
                },
                { label: "Meetings", value: summary.meetings },
                {
                  label: "PF / PA",
                  value: `${formatPoints(overall.pointsFor)} / ${formatPoints(
                    overall.pointsAgainst
                  )}`,
                },
                {
                  label: "Point Differential",
                  value: `${
                    overall.pointDifferential > 0 ? "+" : ""
                  }${formatPoints(overall.pointDifferential)}`,
                },
                {
                  label: "First / Latest",
                  value: `${summary.firstMeeting.season} / ${summary.latestMeeting.season}`,
                },
              ];

              return (
                <article
                  key={summary.summaryKey}
                  data-opponent-slug={identity?.slug}
                  className="rounded-lg border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.04]"
                >
                  <OpponentIdentityDisplay
                    summary={summary}
                    identity={identity}
                  />
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {metrics.map((metric) => (
                      <div
                        key={metric.label}
                        className="rounded-md bg-white p-3 dark:bg-black/20"
                      >
                        <p
                          className="text-sm font-black"
                          aria-label={metric.accessibleValue}
                        >
                          {metric.value}
                        </p>
                        <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-black/35 dark:text-white/35">
                          {metric.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </SectionShell>
  );
}

function ProfileSectionNavigation({
  showTimeline,
  showSeasons,
  showDivision,
}: {
  showTimeline: boolean;
  showSeasons: boolean;
  showDivision: boolean;
}) {
  const links = [
    { href: "#overview", label: "Overview", show: true },
    { href: "#timeline", label: "Timeline", show: showTimeline },
    { href: "#seasons", label: "Seasons", show: showSeasons },
    { href: "#opponents", label: "Opponents", show: true },
    { href: "#division", label: "Division", show: showDivision },
  ].filter((link) => link.show);

  return (
    <nav
      aria-label="Manager profile sections"
      className="overflow-x-auto rounded-lg border border-black/10 bg-white p-2 dark:border-white/10 dark:bg-[#121212]"
    >
      <div className="flex min-w-max gap-1">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="rounded-md px-3 py-2 text-[10px] font-black uppercase tracking-widest text-black/50 transition hover:bg-black/[0.04] hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 dark:text-white/50 dark:hover:bg-white/[0.06] dark:hover:text-white"
          >
            {link.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

export default function OwnerProfile({
  profile,
  careerTimeline,
  ownerCareerSummary,
  careerMatchupSummary,
  seasonHistoryEntries,
  opponentMatchupSummaries,
  opponentIdentities,
}: {
  profile: OwnerProfileViewModel;
  careerTimeline: readonly OwnerCareerTimelineEvent[];
  ownerCareerSummary: OwnerCareerSummary;
  careerMatchupSummary: OwnerCareerMatchupSummary;
  seasonHistoryEntries: readonly SeasonHistoryEntry[];
  opponentMatchupSummaries: readonly OwnerOpponentMatchupSummary[];
  opponentIdentities: readonly OpponentIdentity[];
}) {
  const isStaff = profile.owner.status === OwnerProfileStatus.Staff;
  const hasTenures =
    profile.currentTenures.length > 0 || profile.legacyTenures.length > 0;
  const showSeasonHistory = seasonHistoryEntries.length > 0 || isStaff;
  const showCareerTimeline = careerTimeline.length > 0;
  const showDivision = profile.owner.status === OwnerProfileStatus.Active;
  const showMainColumn =
    hasTenures || showCareerTimeline || showSeasonHistory;
  const opponentHistory = (
    <OpponentHistory
      profile={profile}
      summaries={opponentMatchupSummaries}
      identities={opponentIdentities}
      sourceAvailability={
        careerMatchupSummary.coverage.sourceAvailability
      }
      hasEarlierNoSourceSeasons={
        careerMatchupSummary.seasonsWithoutMatchupSource.length > 0
      }
    />
  );
  const sidebarContent = (
    <CareerSnapshot profile={profile} summary={careerMatchupSummary} />
  );

  return (
    <main className="min-h-screen bg-white px-4 py-6 text-black dark:bg-[#0a0a0a] dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <HeroSection profile={profile} />
        </div>
        <ProfileSectionNavigation
          showTimeline={showCareerTimeline}
          showSeasons={showSeasonHistory}
          showDivision={showDivision}
        />
        <OwnerOverview
          profile={profile}
          careerSummary={ownerCareerSummary}
          matchupSummary={careerMatchupSummary}
          opponentSummaries={opponentMatchupSummaries}
          opponentIdentities={opponentIdentities}
        />

        {showMainColumn ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
            <div className="space-y-6">
              <TeamLegacy profile={profile} />
              {showCareerTimeline && (
                <CareerTimeline events={careerTimeline} />
              )}
              {showSeasonHistory && (
                <SeasonHistory
                  entries={seasonHistoryEntries}
                  isCompetitive={!isStaff}
                />
              )}
              {opponentHistory}
              <CurrentDivisionCard profile={profile} />
            </div>
            <aside className="space-y-6">{sidebarContent}</aside>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {opponentHistory}
            {sidebarContent}
          </div>
        )}
      </div>
    </main>
  );
}
