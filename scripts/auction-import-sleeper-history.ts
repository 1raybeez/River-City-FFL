import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import {
  buildHistoricalAuctionSeasonValidation,
  countOwnerMappings,
  createEmptyOwnerMappingCounts,
  type HistoricalAuctionManifestFile,
  type HistoricalAuctionManifestSeason,
  type HistoricalAuctionOwnerMapping,
  type HistoricalAuctionSeasonFile,
  type HistoricalSleeperAuctionResultRow,
} from "../lib/auction/historicalAuctionResults";

const DEFAULT_FROM_SEASON = 2018;
const DEFAULT_TO_SEASON = 2025;
const OUTPUT_DIR = "data/auction/historical-results";
const MANIFEST_PATH = path.join(OUTPUT_DIR, "manifest.json");
const LEAGUE_IDS: Record<number, string> = {
  2026: "1312149033254416384",
  2025: "1199749375539027968",
  2024: "1072545817749331968",
  2023: "997510104398315520",
  2022: "784542934581256192",
  2021: "677751457528762368",
  2020: "530115541505298432",
  2019: "466632190273253376",
  2018: "342868033913540608",
};

type CliOptions = {
  seasons: number[];
  write: boolean;
};

type SleeperLeagueInfo = {
  draft_id?: string | null;
  [key: string]: unknown;
};

type SleeperDraft = {
  draft_id?: string | null;
  type?: string | null;
  status?: string | null;
  start_time?: number | null;
  created?: number | null;
  [key: string]: unknown;
};

type SleeperDraftPickMetadata = {
  amount?: string | number | null;
  first_name?: string | null;
  last_name?: string | null;
  team?: string | null;
  position?: string | null;
  [key: string]: unknown;
};

type SleeperDraftPick = {
  draft_id?: string | null;
  player_id?: string | number | null;
  picked_by?: string | null;
  roster_id?: string | number | null;
  round?: number | null;
  draft_slot?: number | null;
  pick_no?: number | null;
  is_keeper?: boolean | null;
  metadata?: SleeperDraftPickMetadata | null;
  [key: string]: unknown;
};

type NormalizedSleeperAuctionPick = {
  draftId: string | null;
  playerId: string | null;
  playerName: string;
  position: string | null;
  nflTeam: string | null;
  pickedByUserId: string | null;
  rosterId: number | null;
  round: number | null;
  draftSlot: number | null;
  pickNo: number | null;
  isKeeper: boolean | null;
  auctionPrice: number | null;
  rawAuctionAmount: string | number | null;
  needsAuctionPriceReview: boolean;
};

type SleeperAuctionDraftSnapshot = {
  year: number;
  leagueId: string | null;
  draft: SleeperDraft | null;
  picks: NormalizedSleeperAuctionPick[];
  status:
    | "ready"
    | "no-league"
    | "no-auction-draft"
    | "missing-draft-id";
  warnings: string[];
  generatedAt: string;
};

type SleeperRoster = {
  roster_id?: number | string | null;
  owner_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

type SleeperUser = {
  user_id?: string | null;
  display_name?: string | null;
  username?: string | null;
  metadata?: Record<string, unknown> | null;
};

type OwnerResolution = {
  ownerName: string | null;
  teamName: string | null;
  ownerMapping: HistoricalAuctionOwnerMapping;
  warning: string | null;
};

type SeasonImportResult = {
  seasonFile: HistoricalAuctionSeasonFile;
  outputPath: string;
  written: boolean;
};

function readArgValue(args: string[], index: number) {
  const value = args[index + 1];
  return value && !value.startsWith("--") ? value : undefined;
}

function parseSeason(value: string | undefined, label: string) {
  const season = Number(value);
  if (!Number.isInteger(season)) {
    throw new Error(`Invalid ${label}: ${value ?? "missing"}.`);
  }

  if (season < DEFAULT_FROM_SEASON || season > DEFAULT_TO_SEASON) {
    throw new Error(
      `${label} must be between ${DEFAULT_FROM_SEASON} and ${DEFAULT_TO_SEASON}.`
    );
  }

  if (!LEAGUE_IDS[season]) {
    throw new Error(`No River City Sleeper league ID is configured for ${season}.`);
  }

  return season;
}

function buildSeasonRange(fromSeason: number, toSeason: number) {
  if (fromSeason > toSeason) {
    throw new Error("--from must be less than or equal to --to.");
  }

  return Array.from(
    { length: toSeason - fromSeason + 1 },
    (_, index) => fromSeason + index
  );
}

function parseArgs(args: string[]): CliOptions {
  let write = false;
  let selectedSeason: number | null = null;
  let fromSeason = DEFAULT_FROM_SEASON;
  let toSeason = DEFAULT_TO_SEASON;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--write") {
      write = true;
      continue;
    }

    if (arg === "--dry-run") {
      write = false;
      continue;
    }

    if (arg === "--season") {
      selectedSeason = parseSeason(readArgValue(args, index), "--season");
      index += 1;
      continue;
    }

    if (arg === "--from") {
      fromSeason = parseSeason(readArgValue(args, index), "--from");
      index += 1;
      continue;
    }

    if (arg === "--to") {
      toSeason = parseSeason(readArgValue(args, index), "--to");
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return {
    seasons:
      selectedSeason === null
        ? buildSeasonRange(fromSeason, toSeason)
        : [selectedSeason],
    write,
  };
}

function readString(value: unknown) {
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readInteger(value: unknown) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : null;

  return parsed !== null && Number.isInteger(parsed) ? parsed : null;
}

function readNonNegativeInteger(value: unknown) {
  const parsed = readNumber(value);
  return parsed === null ? null : Math.max(Math.floor(parsed), 0);
}

function readMetadataString(
  metadata: Record<string, unknown> | null | undefined,
  keys: readonly string[]
) {
  for (const key of keys) {
    const value = readString(metadata?.[key]);
    if (value) return value;
  }

  return null;
}

async function sleeperFetch<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch (error) {
    console.error(`Sleeper fetch error: ${url}`, error);
    return null;
  }
}

async function getLeagueInfo(leagueId: string) {
  return sleeperFetch<SleeperLeagueInfo>(
    `https://api.sleeper.app/v1/league/${leagueId}`
  );
}

async function getLeagueRosters(leagueId: string) {
  const rosters = await sleeperFetch<SleeperRoster[]>(
    `https://api.sleeper.app/v1/league/${leagueId}/rosters`
  );

  return rosters ?? [];
}

async function getLeagueUsers(leagueId: string) {
  const users = await sleeperFetch<SleeperUser[]>(
    `https://api.sleeper.app/v1/league/${leagueId}/users`
  );

  return users ?? [];
}

async function getSleeperLeagueDrafts(year: number) {
  const leagueId = LEAGUE_IDS[year];
  if (!leagueId) return [];

  const drafts = await sleeperFetch<SleeperDraft[]>(
    `https://api.sleeper.app/v1/league/${leagueId}/drafts`
  );

  return drafts ?? [];
}

async function getSleeperDraft(draftId: string | null | undefined) {
  const safeDraftId = readString(draftId);
  if (!safeDraftId) return null;

  return sleeperFetch<SleeperDraft>(
    `https://api.sleeper.app/v1/draft/${safeDraftId}`
  );
}

async function getSleeperDraftPicks(draftId: string | null | undefined) {
  const safeDraftId = readString(draftId);
  if (!safeDraftId) return [];

  const picks = await sleeperFetch<SleeperDraftPick[]>(
    `https://api.sleeper.app/v1/draft/${safeDraftId}/picks`
  );

  return picks ?? [];
}

function isSleeperAuctionDraft(draft: SleeperDraft | null | undefined) {
  return draft?.type === "auction";
}

function getDraftTimestamp(draft: SleeperDraft) {
  return readNumber(draft.start_time) ?? readNumber(draft.created) ?? 0;
}

function sortDraftsByRecency(drafts: SleeperDraft[]) {
  return [...drafts].sort(
    (firstDraft, secondDraft) =>
      getDraftTimestamp(secondDraft) - getDraftTimestamp(firstDraft)
  );
}

async function hydrateSleeperDraft(draft: SleeperDraft) {
  const draftId = readString(draft.draft_id);
  if (!draftId) return draft;

  return (await getSleeperDraft(draftId)) ?? draft;
}

async function findRiverCityAuctionDraft(year: number) {
  const leagueId = LEAGUE_IDS[year];
  if (!leagueId) return null;

  const [league, drafts] = await Promise.all([
    getLeagueInfo(leagueId),
    getSleeperLeagueDrafts(year),
  ]);
  if (drafts.length === 0) return null;

  const leagueDraftId = readString(league?.draft_id);
  const leagueDraft = leagueDraftId
    ? drafts.find((draft) => draft.draft_id === leagueDraftId) ?? null
    : null;

  if (leagueDraft && isSleeperAuctionDraft(leagueDraft)) {
    return hydrateSleeperDraft(leagueDraft);
  }

  const auctionDrafts = sortDraftsByRecency(
    drafts.filter(isSleeperAuctionDraft)
  );
  const preferredDraft =
    auctionDrafts.find((draft) => draft.status === "drafting") ??
    auctionDrafts.find((draft) => draft.status === "pre_draft") ??
    auctionDrafts.find((draft) => draft.status === "complete") ??
    auctionDrafts[0] ??
    null;

  return preferredDraft ? hydrateSleeperDraft(preferredDraft) : null;
}

function parseSleeperAuctionAmount(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  if (typeof value !== "string") return null;

  const cleanedValue = value.replace(/[$,]/g, "").trim();
  if (!cleanedValue) return null;

  const parsed = Number(cleanedValue);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function normalizeSleeperAuctionPick(
  pick: SleeperDraftPick
): NormalizedSleeperAuctionPick {
  const metadata = pick.metadata ?? {};
  const firstName = readString(metadata.first_name);
  const lastName = readString(metadata.last_name);
  const playerId = readString(pick.player_id);
  const auctionPrice = parseSleeperAuctionAmount(metadata.amount);
  const playerName =
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    playerId ||
    "Unknown Player";

  return {
    draftId: readString(pick.draft_id),
    playerId,
    playerName,
    position: readString(metadata.position),
    nflTeam: readString(metadata.team),
    pickedByUserId: readString(pick.picked_by),
    rosterId: readNonNegativeInteger(pick.roster_id),
    round: readNonNegativeInteger(pick.round),
    draftSlot: readNonNegativeInteger(pick.draft_slot),
    pickNo: readNonNegativeInteger(pick.pick_no),
    isKeeper: pick.is_keeper ?? null,
    auctionPrice,
    rawAuctionAmount: metadata.amount ?? null,
    needsAuctionPriceReview: auctionPrice === null,
  };
}

async function getSleeperAuctionDraftSnapshot(
  year: number
): Promise<SleeperAuctionDraftSnapshot> {
  const leagueId = LEAGUE_IDS[year] ?? null;
  const generatedAt = new Date().toISOString();

  if (!leagueId) {
    return {
      year,
      leagueId,
      draft: null,
      picks: [],
      status: "no-league",
      warnings: [`No River City Sleeper league ID is configured for ${year}.`],
      generatedAt,
    };
  }

  const draft = await findRiverCityAuctionDraft(year);
  if (!draft) {
    return {
      year,
      leagueId,
      draft: null,
      picks: [],
      status: "no-auction-draft",
      warnings: [`No auction draft was found for the ${year} River City league.`],
      generatedAt,
    };
  }

  const draftId = readString(draft.draft_id);
  if (!draftId) {
    return {
      year,
      leagueId,
      draft,
      picks: [],
      status: "missing-draft-id",
      warnings: ["Sleeper returned an auction draft without a draft_id."],
      generatedAt,
    };
  }

  const rawPicks = await getSleeperDraftPicks(draftId);
  const picks = rawPicks.map(normalizeSleeperAuctionPick);
  const missingPriceCount = picks.filter(
    (pick) => pick.needsAuctionPriceReview
  ).length;
  const warnings = [
    ...(!isSleeperAuctionDraft(draft)
      ? ["Selected draft is not marked as an auction draft."]
      : []),
    ...(missingPriceCount > 0
      ? [`${missingPriceCount} draft picks are missing metadata.amount.`]
      : []),
  ];

  return {
    year,
    leagueId,
    draft,
    picks,
    status: "ready",
    warnings,
    generatedAt,
  };
}

function readOwnerName(user: SleeperUser | null | undefined) {
  return (
    readString(user?.display_name) ??
    readString(user?.username) ??
    readString(user?.user_id)
  );
}

function readTeamName(
  roster: SleeperRoster | null | undefined,
  user: SleeperUser | null | undefined
) {
  return (
    readMetadataString(roster?.metadata, [
      "team_name",
      "teamName",
      "name",
      "display_name",
    ]) ??
    readMetadataString(user?.metadata, ["team_name", "teamName"]) ??
    null
  );
}

function parseRawPrice(value: string | number | null) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;

  const cleanedValue = value.replace(/[$,]/g, "").trim();
  if (!cleanedValue) return null;

  const parsed = Number(cleanedValue);
  return Number.isFinite(parsed) ? parsed : null;
}

function isInvalidNegativePrice(pick: NormalizedSleeperAuctionPick) {
  const parsedPrice = parseRawPrice(pick.rawAuctionAmount);
  return parsedPrice !== null && parsedPrice < 0;
}

function createOutputPath(season: number) {
  return path.join(OUTPUT_DIR, `sleeper-auction-${season}.json`);
}

function buildOwnerResolution({
  pick,
  rosterById,
  userById,
}: {
  pick: NormalizedSleeperAuctionPick;
  rosterById: Map<number, SleeperRoster>;
  userById: Map<string, SleeperUser>;
}): OwnerResolution {
  const roster = pick.rosterId === null ? null : rosterById.get(pick.rosterId);
  const rosterOwnerId = readString(roster?.owner_id);
  const rosterOwner = rosterOwnerId ? userById.get(rosterOwnerId) : null;
  const pickedByUser = pick.pickedByUserId
    ? userById.get(pick.pickedByUserId)
    : null;

  if (roster && rosterOwnerId && rosterOwner) {
    const hasPickedByConflict =
      pick.pickedByUserId !== null && pick.pickedByUserId !== rosterOwnerId;

    return {
      ownerName: readOwnerName(rosterOwner),
      teamName: readTeamName(roster, rosterOwner),
      ownerMapping: hasPickedByConflict ? "roster-only" : "exact",
      warning: hasPickedByConflict
        ? `Pick ${pick.pickNo ?? "N/A"} roster owner ${rosterOwnerId} differs from picked_by ${pick.pickedByUserId}.`
        : null,
    };
  }

  if (roster) {
    return {
      ownerName: rosterOwner ? readOwnerName(rosterOwner) : null,
      teamName: readTeamName(roster, rosterOwner),
      ownerMapping: "roster-only",
      warning: null,
    };
  }

  if (pickedByUser) {
    return {
      ownerName: readOwnerName(pickedByUser),
      teamName: readTeamName(null, pickedByUser),
      ownerMapping: "user-only",
      warning: null,
    };
  }

  return {
    ownerName: null,
    teamName: null,
    ownerMapping: "unresolved",
    warning: null,
  };
}

function buildRosterMap(rosters: readonly SleeperRoster[]) {
  return rosters.reduce<Map<number, SleeperRoster>>((rosterById, roster) => {
    const rosterId = readInteger(roster.roster_id);
    if (rosterId !== null) rosterById.set(rosterId, roster);
    return rosterById;
  }, new Map());
}

function buildUserMap(users: readonly SleeperUser[]) {
  return users.reduce<Map<string, SleeperUser>>((userById, user) => {
    const userId = readString(user.user_id);
    if (userId) userById.set(userId, user);
    return userById;
  }, new Map());
}

function buildRows({
  season,
  picks,
  rosterById,
  userById,
}: {
  season: number;
  picks: readonly NormalizedSleeperAuctionPick[];
  rosterById: Map<number, SleeperRoster>;
  userById: Map<string, SleeperUser>;
}) {
  const ownerWarnings: string[] = [];
  const rows = picks.map<HistoricalSleeperAuctionResultRow>((pick) => {
    const ownerResolution = buildOwnerResolution({
      pick,
      rosterById,
      userById,
    });

    if (ownerResolution.warning) ownerWarnings.push(ownerResolution.warning);

    return {
      season,
      draftId: pick.draftId,
      pickNumber: pick.pickNo,
      round: pick.round,
      draftSlot: pick.draftSlot,
      playerId: pick.playerId,
      playerName: pick.playerName,
      position: pick.position,
      nflTeam: pick.nflTeam,
      salePrice: pick.auctionPrice,
      rosterId: pick.rosterId,
      pickedByUserId: pick.pickedByUserId,
      ownerName: ownerResolution.ownerName,
      teamName: ownerResolution.teamName,
      isKeeper: pick.isKeeper,
      source: "sleeper",
      ownerMapping: ownerResolution.ownerMapping,
    };
  });

  return { rows, ownerWarnings };
}

async function importSeason(season: number): Promise<SeasonImportResult> {
  const outputPath = createOutputPath(season);
  const leagueId = LEAGUE_IDS[season] ?? null;

  try {
    const snapshot = await getSleeperAuctionDraftSnapshot(season);
    const draftId = readString(snapshot.draft?.draft_id);

    if (snapshot.status !== "ready" || !leagueId) {
      const validation = buildHistoricalAuctionSeasonValidation({
        draftFound: false,
        totalPicks: snapshot.picks.length,
        auctionPricedPicks: 0,
        rows: [],
        invalidPrices: 0,
        warnings: snapshot.warnings,
        errors: [],
      });

      return {
        outputPath,
        written: false,
        seasonFile: {
          season,
          leagueId,
          draftId,
          generatedAt: snapshot.generatedAt,
          source: "sleeper",
          validation,
          ownerMappingCounts: createEmptyOwnerMappingCounts(),
          rows: [],
        },
      };
    }

    const [rosters, users] = await Promise.all([
      getLeagueRosters(leagueId),
      getLeagueUsers(leagueId),
    ]);
    const rosterById = buildRosterMap(rosters as SleeperRoster[]);
    const userById = buildUserMap(users as SleeperUser[]);
    const { rows, ownerWarnings } = buildRows({
      season,
      picks: snapshot.picks,
      rosterById,
      userById,
    });
    const invalidPriceCount = snapshot.picks.filter(isInvalidNegativePrice).length;
    const validation = buildHistoricalAuctionSeasonValidation({
      draftFound: true,
      totalPicks: snapshot.picks.length,
      auctionPricedPicks: snapshot.picks.filter(
        (pick) => pick.auctionPrice !== null
      ).length,
      rows,
      invalidPrices: invalidPriceCount,
      warnings: [...snapshot.warnings, ...ownerWarnings],
      errors: [],
    });

    return {
      outputPath,
      written: false,
      seasonFile: {
        season,
        leagueId,
        draftId,
        generatedAt: snapshot.generatedAt,
        source: "sleeper",
        validation,
        ownerMappingCounts: countOwnerMappings(rows),
        rows,
      },
    };
  } catch (error) {
    const generatedAt = new Date().toISOString();
    const validation = buildHistoricalAuctionSeasonValidation({
      draftFound: false,
      totalPicks: 0,
      auctionPricedPicks: 0,
      rows: [],
      invalidPrices: 0,
      warnings: [],
      errors: [
        `Schema/parsing failure: ${
          error instanceof Error ? error.message : String(error)
        }`,
      ],
    });

    return {
      outputPath,
      written: false,
      seasonFile: {
        season,
        leagueId,
        draftId: null,
        generatedAt,
        source: "sleeper",
        validation,
        ownerMappingCounts: createEmptyOwnerMappingCounts(),
        rows: [],
      },
    };
  }
}

function buildManifestSeason(
  result: SeasonImportResult
): HistoricalAuctionManifestSeason {
  return {
    season: result.seasonFile.season,
    leagueId: result.seasonFile.leagueId,
    draftId: result.seasonFile.draftId,
    generatedAt: result.seasonFile.generatedAt,
    pickCount: result.seasonFile.validation.totalPicks,
    normalizedResultCount: result.seasonFile.validation.rowsNormalized,
    ownerMappingCounts: result.seasonFile.ownerMappingCounts,
    warnings: result.seasonFile.validation.warnings,
    errors: result.seasonFile.validation.errors,
    outputPath: result.outputPath,
    written: result.written,
    source: "sleeper",
  };
}

function formatCounts(counts: Record<string, number>) {
  return Object.entries(counts)
    .map(([label, count]) => `${label}:${count}`)
    .join(" ");
}

function printSeasonReport(result: SeasonImportResult) {
  const { seasonFile } = result;
  const validation = seasonFile.validation;
  const status = validation.errors.length > 0 ? "ERROR" : "OK";

  console.log(
    [
      `${seasonFile.season}: ${status}`,
      `draft=${validation.draftFound ? "found" : "missing"}`,
      `picks=${validation.totalPicks}`,
      `priced=${validation.auctionPricedPicks}`,
      `rows=${validation.rowsNormalized}`,
      `keepers=${validation.keeperCount}`,
      `owners=${formatCounts(seasonFile.ownerMappingCounts)}`,
    ].join(" | ")
  );

  for (const warning of validation.warnings) {
    console.log(`  warning: ${warning}`);
  }

  for (const error of validation.errors) {
    console.log(`  error: ${error}`);
  }
}

async function writeJsonFile(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeValidResults(results: SeasonImportResult[]) {
  const writtenResults: SeasonImportResult[] = [];

  for (const result of results) {
    if (result.seasonFile.validation.errors.length > 0) {
      console.log(
        `Skip write for ${result.seasonFile.season}: validation errors present.`
      );
      writtenResults.push(result);
      continue;
    }

    await writeJsonFile(result.outputPath, result.seasonFile);
    writtenResults.push({ ...result, written: true });
    console.log(`Wrote ${result.outputPath}`);
  }

  const manifest: HistoricalAuctionManifestFile = {
    generatedAt: new Date().toISOString(),
    source: "sleeper",
    seasons: writtenResults.map(buildManifestSeason),
  };

  await writeJsonFile(MANIFEST_PATH, manifest);
  console.log(`Wrote ${MANIFEST_PATH}`);

  return writtenResults;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  console.log("River City Sleeper auction history import");
  console.log(`Mode: ${options.write ? "write" : "dry-run"}`);
  console.log(`Seasons: ${options.seasons.join(", ")}`);
  console.log("Output paths:");
  for (const season of options.seasons) {
    console.log(`  ${createOutputPath(season)}`);
  }
  console.log(`  ${MANIFEST_PATH}`);

  const results: SeasonImportResult[] = [];
  for (const season of options.seasons) {
    results.push(await importSeason(season));
  }

  console.log("\nValidation report:");
  for (const result of results) {
    printSeasonReport(result);
  }

  if (options.write) {
    await writeValidResults(results);
    return;
  }

  console.log("\nDry run complete. Re-run with --write to create or replace files.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
