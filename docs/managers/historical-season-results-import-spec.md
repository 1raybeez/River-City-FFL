# Historical Season Results Import Specification

## 1. Purpose and status

This document records the approved contract implemented by the typed River
City Historical Season Results layer. It does not alter matchup history,
canonical matchup records, Rivalries, or Managers UI.

The archived workbook is evidence. Production code should consume reviewed,
typed, validated data checked into the repository; it should not open or parse
an XLSX file during a build or request.

The source currently present in the repository is:

```text
data/source/historical/river-city-final-standings-and-payouts.xlsx
```

Source fingerprint:

- size: 308,929 bytes;
- SHA-256:
  `4b0d96b19b93e6039807558f1f49ca9d4e7aae1a728bb5636001cef964fe6552`;
- format: Microsoft Excel 2007+ (`.xlsx`).

## 2. Architectural boundaries

The source contains season facts, not canonical physical contests.

Keep these concepts separate:

- **Season-level final result:** one franchise's participation and final
  placement in one season.
- **Matchup-level history:** one physical contest, scoring periods, scores,
  classification, and completion state. This remains owned by Canonical
  Matchup History and is not supplied by this workbook.
- **Franchise record:** one physical franchise-season result, regardless of
  how many approved owners receive personal credit.
- **Owner credit:** attribution of a franchise result through canonical
  ownership tenure and commissioner rulings. Co-ownership may create multiple
  owner credits but never another franchise result.
- **Payout information:** a monetary ledger item with a category, recipient,
  amount, and payment status. It is not a final placement and does not prove
  ownership.

The workbook must not create owner identities, franchises, ownership tenures,
matchups, records, points, or opponent relationships by implication.

## 3. Workbook inventory

The workbook contains 28 visible worksheets.

Exact sheet names, in workbook order:

```text
Contact Details
Sheet20
Paid_Earnings
Past Standings
DougMath
2025_Payouts
2024_Payouts
2023_Payouts
2022_Payouts
2021_Payouts
2020_Payouts
2019_Payouts
2018_Payouts
2017_Payouts
2016_Payouts
2025_Regular_Season_Standings
2024_Regular_Season_Standings
2023_Regular_Season_Standings
2022_Regular_Season_Standings
2021_Regular_Season_Standings
2020_Regular_Season_Standings
2019_Regular_Season_Standings
2018_Regular_Season_Standings
2017_Regular_Season_Standings
2016_Regular_Season_Standings
2015_Regular_Season_Standings
Prior_Champs
League_Waiting_List
```

| Sheet | Content | Import relevance |
|---|---|---|
| `Contact Details` | Names and contact information | Exclude; contains private operational data and no season result |
| `Sheet20` | Owner financial totals | Evidence only; derived from `Paid_Earnings` |
| `Paid_Earnings` | 2016–2025 paid/won matrix by short owner label | Payout evidence; not authoritative until reconciled |
| `Past Standings` | Final placements for 2011–2025 plus blank future columns and derived career calculations | Primary final-placement evidence |
| `DougMath` | High-score counts and averages | Exclude from season-results import |
| `2025_Payouts` through `2016_Payouts` | Annual entry fees, weekly awards, placement awards, other awards, payment notes, and some standings | Result corroboration and payout evidence |
| `2025_Regular_Season_Standings` through `2015_Regular_Season_Standings` | Regular-season aggregates and final standings after playoffs | Primary raw team-name evidence for 2015–2025 and corroborating placement evidence |
| `Prior_Champs` | Winner labels for 2011–2025 and blank 2026 | Corroborating title evidence; `Tommy/Dave` preserves the approved 2022 co-championship |
| `League_Waiting_List` | Prospective members | Exclude |

Two structured Excel tables exist:

- `Table1`, `Paid_Earnings!A1:W21`: `Year/Metric` followed by 22
  short-name owner columns.
- `Table2`, `Sheet20!G6:J28`: `Owner Name`, `Total Paid Out`, `Total
  Won`, and `Net (Won or Loss)`.

The standings and annual payout ranges are ordinary worksheet ranges rather
than structured Excel tables.

## 4. Source coverage

### 4.1 Final results

- `Past Standings` has populated final results for 2011–2025.
- It contains 178 populated placement cells: 10 for 2011 and 12 for every
  season from 2012 through 2025.
- Columns for 2026–2030 are blank and are not season records.
- The annual final-standings tables cover 2015–2025 with 12 rows per season,
  or 132 franchise-season rows.
- `Prior_Champs` has 15 populated winner rows for 2011–2025. Its 2026 row is
  blank.

### 4.2 Payouts

- Annual detailed payout sheets cover 2016–2025.
- `Paid_Earnings` and `Sheet20` aggregate the same general period.
- Categories vary by season and include weekly high score, placement,
  lower-bracket winner, division winner, championship ring, name plate, entry
  fee, paid/owes status, and operational notes.

### 4.3 Regular-season aggregates

The 2015–2025 standings sheets contain season aggregate W-L-T values and, for
many seasons, PF and PA. These are not individual matchups. They may be
evaluated later as a separate historical regular-season aggregate source, but
they are outside the initial final-results import.

### 4.4 Matchup coverage

The workbook contains no opponent pairings, individual game rows, bracket
matchups, canonical matchup keys, or contest-level score pairs. Weekly
high-score payout rows are awards, not matchups.

It therefore cannot backfill:

- overall matchup records;
- playoff game records;
- championship-game records;
- opponent history;
- canonical physical contests; or
- individual matchup scores.

## 5. Final standings found

### 5.1 Outcome summary

The table below transcribes the workbook's `Past Standings` result order. Last
place means the last populated result in that workbook column. The
commissioner confirmed that 2011 had ten teams and 2012 onward had twelve.

| Season | Champion | Runner-up | Third | Last populated | Rows | Notes |
|---:|---|---|---|---|---:|---|
| 2011 | Gordie | Wade | Zach | Rachel (10th) | 10 | Commissioner-approved workbook order |
| 2012 | Bryan | Chris | Nicholas | Zach | 12 | Matches current placement ledger |
| 2013 | Tommy | James | Bryan | Travis | 12 | Matches current placement ledger |
| 2014 | Garet | Gordie | Keith | Landon | 12 | Matches current placement ledger |
| 2015 | Keith | JD | Tommy | Travis | 12 | Exact team names also present |
| 2016 | Tommy | James/Minnix | Ray | Wade | 12 | Exact team names and payout result rows present |
| 2017 | Tommy | JD | James/Minnix | Brian | 12 | Exact team names and payout result rows present |
| 2018 | Brian | Tommy | Ray | Landon | 12 | Exact team names and payout result rows present |
| 2019 | Wade | Travis | Brian | Tommy | 12 | Exact team names and payout result rows present |
| 2020 | JD | Landon | Dave | Tommy | 12 | Lower-bracket winner also recorded |
| 2021 | Dave | JD | Adam | Jordan | 12 | Lower-bracket winner also recorded |
| 2022 | Tommy platform first | Dave platform second | Brian | JD | 12 | Tommy and Dave are historical co-champions |
| 2023 | Tommy | Brian | Ray/Jeffrey credit | Landon | 12 | Raw matrix says Ray; annual sheet says Ray/Jeffrey |
| 2024 | Jordan | Wade | Doug | Rashad | 12 | Exact team names and payout result rows present |
| 2025 | Aaron | Travis | JD | Ray/Jeffrey franchise | 12 | Jordan/Landon share the eighth-place franchise result |

The existing manual placement ledger and workbook `Past Standings` agree for
every placement from 2012 through 2025 after expanding short labels to
canonical owners and applying approved co-owner tenure. No correction should
be made merely to replace full names with workbook short names.

### 5.2 Complete 2011–2014 workbook order

No historical team names are supplied for these seasons.

| Season | Workbook order |
|---:|---|
| 2011 | 1 Gordie; 2 Wade; 3 Zach; 4 Keith; 5 JD; 6 Bryan; 7 Chris; 8 Ray; 9 Darren; 10 Rachel; ranks 11–12 blank |
| 2012 | 1 Bryan; 2 Chris; 3 Nicholas; 4 James; 5 Tommy; 6 Landon; 7 Gordie; 8 Wade; 9 Travis; 10 Darren; 11 JD; 12 Zach |
| 2013 | 1 Tommy; 2 James; 3 Bryan; 4 Landon; 5 Chris; 6 Keith; 7 JD; 8 Garet; 9 Gordie; 10 Ray; 11 Wade; 12 Travis |
| 2014 | 1 Garet; 2 Gordie; 3 Keith; 4 Chris; 5 Bryan; 6 Travis; 7 James; 8 Wade; 9 JD; 10 Ray; 11 Tommy; 12 Landon |

### 5.3 Complete 2015–2025 final rows

These rows preserve workbook spelling. Each entry is `rank owner — raw team`.

| Season | Final standings after playoffs |
|---:|---|
| 2015 | 1 Keith — Team Polarek; 2 JD — Mad Panda; 3 Tommy — The Not That Great CornJulio; 4 Chris — Momma Said Gronk You Out; 5 Garet — McCown Town; 6 Ray — Check My Balls; 7 Minnix — Lil' Breezy Baby; 8 Wade — Fightin' Fitz-magics; 9 Landon — Specail Brownies; 10 Gordie — Freakshow Freak; 11 Bryan — Drinkin' Irish; 12 Travis — I'm Your Huckleberry |
| 2016 | 1 Tommy — Breesus Take the Wheel; 2 Minnix — Thank My Luck-y Johnson; 3 Ray — Making America Great Again; 4 Gordie — Freakshow Freaks; 5 Landon — Special Brownies; 6 Chris — Brate and Switch; 7 Bryan — Weeping Snowflakes; 8 JD — Mad Panda; 9 Travis — Fully Repaired Nelson; 10 Brian — Chickn Parm u Taste So Good; 11 Garet — RG Threveland; 12 Wade — Late Round Flyers |
| 2017 | 1 Tommy — Deez Lutz; 2 JD — Dog Will Hunt; 3 Minnix — Hyde the Russell Sprouts; 4 Travis — Wentz in Pain; 5 Jordan — Hooked on a Thielen; 6 Ray — Prestige Worldwide; 7 Garet — The Land of Cleve; 8 Landon — Special Brownies; 9 Patrick — Winning is the Pryority; 10 Wade — Bad JuJu; 11 Chris — Thanks a lot Evans!; 12 Brian — Ertz So Good |
| 2018 | 1 Brian — kerryon my wayward son; 2 Tommy — Big Al's Dingers; 3 Ray — Prestigio Mundial; 4 Jordan — In My Thielens; 5 Chris — Receding Zuerlein; 6 Wade — O Saquon You See; 7 Patrick — Nuk if You Buck; 8 JD — Mad Panda; 9 Ricky — Ricky Crickets; 10 Billy — Biddle Me this Batman; 11 Travis — Wentz Upon a Time; 12 Landon — Special Brownies |
| 2019 | 1 Wade — Witchdoctors; 2 Travis — Trash Panda; 3 Brian — Stevens247; 4 Patrick — Deebow and Arrow; 5 Ray/Jeffrey — Prestigio Mundial; 6 Dave — My Beard Smells Like Dicks; 7 Landon — Special Brownies; 8 Billy — Thugsof Thanos; 9 Jordan — Shake n Bakers; 10 JD — Notmillatime27; 11 Doug — Patrick Jr; 12 Tommy — Moore's Monstars |
| 2020 | 1 JD — F U Minshew; 2 Landon — Special Brownies; 3 Dave — BeardSmellsLikeBalls; 4 Brian — Infinity Chubb; 5 Ray/Jeffrey — Prestigio Mundial; 6 Doug — Saquon can have my ACL; 7 Jordan — Aaron Jonestown Massacre; 8 Wade — Witch Doctors; 9 Adam — Big Dick Nick Pics; 10 Billy — Knights of Chadwick; 11 Travis — Trash Pandas; 12 Tommy — Diamond Dogs |
| 2021 | 1 Dave — The Schmendricks; 2 JD — Asian Symbols; 3 Adam — Hot Tub Jelly Fish; 4 Wade — Late Round Flyers; 5 Landon — Special Brownies; 6 Doug — Back to Jacksonville; 7 Billy — BeeristheAnswer; 8 Tommy — The People's Champ; 9 Travis — Trash Pandas; 10 Ray — Prestigio Mundial; 11 Brian — Not Mad Just Disappointed; 12 Jordan — Let Russ Cook(s) |
| 2022 | 1 Tommy — The Hellfire Club; 2 Dave — The Schmendricks; 3 Brian — It's a New Day; 4 Billy — The Originals; 5 Landon — Special Brownies; 6 Doug — Closed for Rennovations; 7 Ray/Jeffrey — Prestigio Mundial; 8 Travis — Trash Pandas; 9 Wade — RVA Panthers; 10 Rashad — John Cockslam & 4Skins; 11 Jordan — Dak Daddy; 12 JD — Panda Loco |
| 2023 | 1 Tommy — The Ship of Theseus; 2 Brian — It's a New Day; 3 Ray/Jeffrey — The Righteous Gemstones; 4 JD — Clown Punchers; 5 Billy — Brilly; 6 Travis — Trash Pandas; 7 Wade — The Dollar Bins; 8 Dave — The Tush Pushers; 9 Doug — Closed for Rennovations; 10 Rashad — Snyder's Sloppy Seconds; 11 Jordan — Getting Chiggy Wit It; 12 Landon — Special Brownies |
| 2024 | 1 Jordan — Get.Your.Guy; 2 Wade — Stroud 2B an Achane; 3 Doug — NowGiveMeMyThemeMusic; 4 Dave — The Schmendricks; 5 JD — The Mad "Panda"; 6 Tommy — Fancy Ass Bitches; 7 Travis — Love'n Trash Pandas; 8 Ray — The Righteous Gemstones; 9 Landon — Special Brownies; 10 Billy — Brilly; 11 Brian — It's a New Day; 12 Rashad — Snyder's Sloppy Seconds |
| 2025 | 1 Aaron — Nudas Priest; 2 Travis — Trash Pandas; 3 JD — The Mad Panda; 4 Dave — The Schmendricks; 5 Rashad — #FuckTSwift; 6 Stan — Stanal Fissures; 7 Tommy — ETN' Deez Nutz; 8 Jordan — Shake-n-Bakers; 9 Brian — It's a New Day; 10 Doug — Broken Toe Joe; 11 Wade — Carolina Reapers; 12 Ray/Jeffrey — Prestigio Mundial |

## 6. Awards and payout evidence

### 6.1 Explicit placement-award rows

These are the explicit annual payout-sheet labels and amounts, not a proposed
career-winnings calculation.

| Season | Champion payout | Runner-up payout | Third-place payout | Other explicit result award |
|---:|---|---|---|---|
| 2016 | Tommy $200 | Minnix $105 | Ray $50 | Fourth Gordie $50 |
| 2017 | Tommy $195 | JD $105 | Minnix $50 | Fourth Travis $50 |
| 2018 | Brian $200 | Tommy $100 | Ray $50 | Fourth Jordan $50 |
| 2019 | Wade $200 | Travis $100 | Brian $50 | Fourth Patrick $50 |
| 2020 | JD $240 | Landon $100 | Dave $75 | Fourth Brian $25; `LB Winner` Jordan $25 |
| 2021 | Dave $230 | JD $100 | Adam $75 | Fourth Wade $25; `LB Winner` Billy $25 |
| 2022 | Tommy $175 | Dave $175 | Brian $75 | Fourth Billy $25; `LB Winner` Ray/Jeffrey $25 |
| 2023 | Tommy $230 | Brian $100 | Ray/Jeffrey $75 | Fourth JD $50; `Name Plate` Tommy $5 |
| 2024 | Jordan $230 | Wade $100 | Doug $75 | Fourth Dave $50; `Name Plate` Jordan $5 |
| 2025 | Aaron $219 | Travis $100 | JD $50 | Division winners JD/Aaron/Rashad $25 each; Aaron championship ring $16 |

Weekly high-score awards and payment notes also exist for each payout season.
They are reliable as raw evidence that a ledger entry was written, but “Paid,”
“No,” “rolled into the pot,” entry fees, food contributions, and informal
settlement notes must not be collapsed into one winnings number.

### 6.2 Lower-bracket and Toilet Bowl terminology

The workbook explicitly records:

- 2020 `LB Winner`: Jordan;
- 2021 `LB Winner`: Billy;
- 2022 `LB Winner`: Ray/Jeffrey.

These can be preserved as raw `lower-bracket-winner` facts. The workbook does
not itself define `LB Winner` as the River City Toilet Bowl. Do not emit a
`toilet-bowl-winner` fact until the commissioner confirms the terms are
equivalent for these seasons.

No lower-bracket winner is explicitly supplied for 2011–2019 or 2023–2025.
Last place, a name-plate payment, and a championship-ring payment must not be
treated as Toilet Bowl results.

## 7. Owner identity mapping

Workbook labels are source evidence. Canonical identity IDs remain owned by
`identityData.ts`.

| Raw label or labels | Canonical owner ID | Status |
|---|---|---|
| Aaron | `aaron-hawkins` | Clean |
| Adam | `adam-lind` | Clean |
| Billy | `billy-biddle` | Clean |
| Brian | `brian-stevens` | Clean |
| Bryan, Bryan D | `bryan-doane` | Clean by full workbook context |
| Chris | `chris-barras` | Clean |
| Dave, David | `david-besedich` | Clean |
| Darren, Daren | `darren-kusaj` | Typographic variant |
| Doug | `doug-fordham` | Clean |
| Garet | `garet-prior` | Clean |
| Gordie | `gordie-gahagan` | Clean |
| JD | `jd-dowling` | 2011 participation is approved; 2011 franchise remains unresolved |
| James, Minnix | `james-minnix` | Clean by workbook context |
| Jordan | `jordan-maslyn` | Clean |
| Keith | `keith-polarek` | Clean |
| Landon | `landon-elliott` | Clean |
| Nicholas | `nicholas-bates` | Clean |
| Patrick | `patrick-leahey` | Clean |
| Rachel | `rachel-woolard` | Clean; commissioner-approved 2011 rank is 10 |
| Rashad | `rashad-gresham` | Clean |
| Ray | `ray-long` | Raw source shorthand; canonical tenure controls co-owner credit |
| Ray/Jeffrey | `ray-long` and `jeffrey-hudgins` through approved Prestigio tenure | Never create a combined identity |
| Ricky | `ricky-taylor` | Clean |
| Stan | `stan-schoppe` | Clean |
| Tommy | `tommy-moore` | Clean |
| Travis | `travis-miller` | Clean |
| Wade | `wade-cameron` | Clean |
| Zach | `zach-woolard` | Clean |
| Tommy/Dave | `tommy-moore` and `david-besedich` | Approved 2022 co-champion label; never normalize as one owner |

Temporary Sleeper helpers do not appear in the result tables and must not gain
credit through this import.

## 8. Franchise mapping

### 8.1 Mapping rule

The annual final tables provide a raw historical team name for 2015–2025.
Resolve the physical result to the approved franchise active for that season,
while retaining the exact workbook team name. Do not turn every historical
team-name spelling into a new franchise.

Examples:

- Prestigio spellings and season names such as `Prestige Worldwide`,
  `Prestigio Mundial`, and `The Righteous Gemstones` map to
  `prestigio-mundial` only because approved Ray/Jeffrey tenure supplies that
  continuity.
- `Specail Brownies` is retained as a 2015 raw spelling but maps to
  `special-brownies`.
- Jordan's 2017–2024 team-name history maps to `shake-n-bakers`.
- The 2025 `Shake-n-Bakers` result maps once to `shake-n-bakers`; Jordan and
  Landon receive separate owner credit through approved 2025 co-ownership.
- Landon's 2015–2024 results remain `special-brownies` and are not merged into
  Jordan's earlier franchise history.

### 8.2 Coverage and gaps

- All 132 annual final rows for 2015–2025 have a raw team name and an owner
  label that can be connected to an approved franchise-season tenure.
- Exact raw team names are absent for 2011–2014.
- Canonical tenure can associate many 2011–2014 owner results with franchises,
  but it cannot manufacture the historical team name.
- Commissioner rulings resolve the 2012 ESPN-era rows as Landon/Special
  Brownies, Travis/I'm Your Huckleberry, and Darren/Team Darren. The typed
  layer maps them respectively to `special-brownies`,
  `kissed-by-a-freckle`, and `team-kusaj` while preserving the approved raw
  names.
- Current continuous tenure ranges also create placement-less owner-season
  records for Keith in 2012 and Zach in 2013. Both workbook and manual
  standings omit them in those seasons. Participation should come from an
  accepted season result, not merely from an inclusive tenure range; this
  remains a compatibility concern for the separate Owner Season History
  engine; the typed result layer does not manufacture either participation
  row.

## 9. Conflicts, blanks, duplicates, and ambiguous facts

### 9.1 Approved 2011 ruling

The prior manual ledger had 12 rows:

```text
1 Gordie, 2 Wade, 3 Zach, 4 Keith, 5 Unknown, 6 Bryan,
7 Chris, 8 Ray, 9 Unknown, 10 Darren, 11 Rachel, 12 Unknown
```

The workbook has ten populated rows:

```text
1 Gordie, 2 Wade, 3 Zach, 4 Keith, 5 JD, 6 Bryan,
7 Chris, 8 Ray, 9 Darren, 10 Rachel
```

The commissioner ruled that the workbook is authoritative and that 2011 was a
10-team season. The typed layer therefore:

- records JD fifth, Darren ninth, and Rachel tenth;
- emits exactly ten physical placement rows;
- marks Rachel as last place; and
- emits no eleventh-place, twelfth-place, or synthetic unknown result.

JD's 2011 franchise remains unresolved because neither the workbook nor a
commissioner ruling supplies that mapping.

### 9.2 Approved 2022 championship ruling

`Past Standings` and the explicit payout result rows identify Tommy as
champion and Dave as runner-up. `Prior_Champs` says `Tommy/Dave`. The payout
summary also distributes first- and second-place components to both before
showing separate explicit `Champ` and `2nd Place` rows.

River City recognizes Tommy and Dave as historical co-champions because the
Damar Hamlin game left the fantasy championship unresolved. The typed layer
also preserves the platform order: Tommy first/platform champion and Dave
second/platform runner-up. It does not create a combined owner identity.

### 9.3 Payout reconciliation

Detailed annual award rows, owner summary blocks, cached formula totals,
`Paid_Earnings`, and `Sheet20` do not always reconcile:

- `Paid_Earnings` 2025 appears stale and omits final placement awards that are
  present in `2025_Payouts`.
- Several annual sheets show a five-dollar difference between detailed rows
  and owner-summary totals.
- The 2022 top summary credits Brian $50 for third while the detailed
  `3rd Place` row says $75, and its aggregated amount-won total is $30 below
  the detailed ledger.
- Some awards were not paid directly, were rolled into another pot, or were
  settled through entry-fee offsets.
- `Damon Food` in 2024 is a food contribution, not owner winnings.

Final placements are consistent despite these monetary conflicts. Payout
amounts should remain evidence-only until an item-by-item reconciliation and
commissioner ruling define gross award, cash paid, rolled amount, entry fee,
and net earnings.

### 9.4 2018 annual-sheet order

The 2018 annual `Final Standings After Playoff` table places Landon eighth and
JD twelfth. `Past Standings` and the existing approved placement ledger place
JD eighth and Landon twelfth. The typed import follows the established source
precedence: `Past Standings` controls final placement, while the annual sheet
supplies each owner's raw historical team name. The imported 2018 rows are
therefore JD eighth with `Mad Panda` and Landon twelfth with
`Special Brownies`.

### 9.5 Derived workbook calculations

Do not import the derived career statistics in `Past Standings`, the
high-score averages in `DougMath`, or the owner totals in `Sheet20` as source
facts. They contain formulas, cached values, shorthand identities, and known
gaps. In particular, the `Ray/Jeffrey` career row includes Ray's 2011 result
even though Jeffrey must receive no 2011 credit.

## 10. Authoritative, deferred, and excluded facts

### 10.1 Encoded in the typed import

- 2011–2025 participation and platform final placement;
- champion, runner-up, third-place, podium, best-finish, and last-place facts
  derived from an accepted final placement;
- raw final owner labels;
- raw historical team names for 2015–2025 and the three approved 2012 ESPN
  mappings;
- normalized franchise IDs based on approved tenure and ESPN-era rulings;
- approved co-owner credit projected through canonical tenure;
- source sheet and cell provenance;
- independent 2022 platform-order and historical-champion flags; and
- explicit raw lower-bracket award labels, without calling them Toilet Bowl
  results until terminology is approved.

### 10.2 Must remain unresolved or deferred

- exact 2011–2014 historical team names;
- JD's 2011 franchise ID, which remains unresolved by commissioner decision;
- Keith's apparent nonparticipation in 2012 and Zach's apparent
  nonparticipation in 2013 versus their current tenure ranges;
- `LB Winner`, which remains an unresolved workbook label and must not be
  classified as Toilet Bowl winner;
- payout totals and net earnings, with reconciliation deferred; and
- regular-season aggregate W-L-T/PF/PA until separately validated and
  approved.

### 10.3 Excluded

- contact details;
- waiting-list data;
- food contributions;
- payment-account details and informal settlement notes;
- formula-derived career averages and percentages;
- high-score analytics;
- matchup, opponent, and rivalry facts;
- blank 2026–2030 cells; and
- any identity or tenure inferred from a platform helper attachment.

## 11. Implemented typed architecture

`lib/history/historicalSeasonResults.ts` contains the approved typed constants
and framework-free accessors. It does not parse the XLSX.

The primary record represents one physical franchise finish. `ownerIds`
contains the approved personal credits for that result without duplicating the
physical placement.

```ts
type HistoricalSeasonResultSource = {
  workbookPath: string;
  workbookSha256: string;
  sheetName: string;
  cellRange: string;
  corroboratingReferences: string[];
};

type HistoricalSeasonResult = {
  seasonResultKey: string;
  season: number;
  teamCount: 10 | 12;
  finalPlacement: number;
  franchiseId: string | null;
  ownerIds: string[];
  rawOwnerLabel: string;
  rawTeamName: string | null;
  isPlatformChampion: boolean;
  isPlatformRunnerUp: boolean;
  isHistoricalChampion: boolean;
  isThirdPlace: boolean;
  isPodium: boolean;
  isLastPlace: boolean;
  championshipNote: string | null;
  source: HistoricalSeasonResultSource;
  coverage: {
    seasonResult: "available";
    matchupSource:
      | "unavailable-no-source"
      | "available-in-separate-engine";
  };
  notes: string[];
};
```

Design rules:

- `seasonResultKey` identifies one physical source placement, for example
  `historical-season-result:2025:rank-8`.
- Store one franchise-season result even when multiple approved owners receive
  credit.
- Do not store a synthetic `Ray/Jeffrey` owner.
- Preserve raw labels and exact cell provenance.
- Platform placement flags derive from `finalPlacement`; the independent
  historical championship flag preserves the approved 2022 exception.
- Payout and Toilet Bowl records remain deferred.
- Return cloned or immutable records.

Recommended public API:

```ts
getAllHistoricalSeasonResults()
getHistoricalSeasonResultsForSeason(season)
getHistoricalSeasonResult(ownerIdOrSlug, season)
getHistoricalSeasonResultsForOwner(ownerIdOrSlug)
getHistoricalSeasonResultsCoverage()
```

An offline, one-time extraction script may assist transcription and
reconciliation, but generated output must be reviewed. No production
dependency on an XLSX package is required.

## 12. Integration plan and status

Completed in this phase:

1. The workbook is preserved at the approved canonical filename.
2. Approved results are encoded in typed constants with workbook hash, sheet,
   and cell provenance.
3. Focused validation covers placement counts, championship recognition,
   ESPN-era mappings, ownership credit, source coverage, and immutability.

Completed migration:

1. `ownerSeasonHistory.ts` consumes Historical Season Results as its only
   final-placement source. It no longer imports or applies `MANUAL_HISTORY`.
2. One physical result projects to each approved owner credit without changing
   resolved `ownerSeasonKey` semantics.
3. Platform finish, historical championship recognition, raw historical team
   name, season-result coverage, and matchup-source coverage remain distinct.
4. `ownerCareerSummary.ts` derives separate platform and historical title
   counts, podiums, best finish, and last-place totals from Owner Season
   History.
5. `lib/manual-history.ts` remains in the repository for compatibility but is
   not consumed as a placement source. Its removal is deferred to a separate
   cleanup milestone.

Deferred integration:

1. Keep historical payout awards separate from placement summaries and
   matchup summaries.
2. Add a server presentation adapter that joins owner-season result facts
   with `OwnerSeasonMatchupSummary` by canonical owner and season. Do not add
   placement facts to Canonical Matchup History or fabricate canonical
   matchups.

The season result establishes participation. A broad ownership tenure range
should not independently manufacture an owner-season when the accepted final
standings omit that owner.

## 13. Pre-Sleeper presentation recommendation

Manager Profile Season History should present two independent coverage axes in
one season card:

```text
Season result: available
Final finish: 3rd
Franchise/team: available when sourced

Matchup history: unavailable
No matchup record, points, winning percentage, or opponent history inferred
```

For 2011–2017:

- show approved season participation, franchise association, raw historical
  team name when available, final finish, and factual outcome badges;
- show `Matchup source unavailable`;
- render record, winning percentage, PF, PA, point differential, playoff game
  record, and opponent history as unavailable or omit those metric tiles;
- never show `0-0`, `0.0%`, or zero points as a substitute for missing source.

For 2018 onward, the same card may show season-result facts alongside the
separately sourced matchup summary. Neither source should overwrite the
other's coverage.

Team Legacy may later consume owner-career placement summaries for titles,
podiums, and best finish. It must not derive them in React or mix payout money
with matchup statistics.

The current Season History correctly distinguishes unavailable matchup source
from available matchup data, but it does not display the separate final-result
facts. The future adapter should add result presentation without changing the
meaning of `OwnerSeasonMatchupSummary`.

## 14. Validation plan

Focused validation asserts:

- the archived workbook fingerprint and canonical path are recorded;
- deterministic, unique `seasonResultKey` and award keys;
- one franchise result per season and final placement;
- accepted seasons have contiguous, unique placements;
- 2011 contains exactly 10 physical results and no manufactured lower ranks;
- 2012–2025 contains 168 accepted physical franchise-season results;
- 2015–2025 contains 132 raw team-name rows;
- 2012–2025 typed placements were reconciled against the former manual ledger
  before Owner Season History migration;
- 2022 preserves Tommy first, Dave second, and both owners as historical
  co-champions;
- all accepted raw owner labels resolve to canonical identities;
- co-owned results produce multiple owner credits but one franchise result;
- Jeffrey receives no 2011 result;
- Ray has no 2012 result;
- Prestigio shared credit begins in 2013;
- Jordan/Landon shared Shake-N-Bakers credit begins in 2025 only;
- Landon retains Special Brownies history through 2024;
- helper accounts receive no result or payout credit;
- payout conflicts are reported rather than silently balanced;
- no imported type contains matchup records, opponent IDs, points, or winning
  percentage derived from final placement;
- pre-Sleeper presentation never renders fabricated zero matchup statistics;
  and
- typed accessors return immutable data.

Validation should include a focused import test, Owner Season History and
Owner Career Summary regression tests, TypeScript, scoped ESLint, production
build, and `git diff --check`.

## 15. Confirmed unresolved and deferred work

1. JD's approved 2011 result remains franchise-unresolved; no franchise is
   inferred.
2. `LB Winner` remains an unresolved workbook label and is not classified as
   Toilet Bowl winner.
3. Payout reconciliation remains deferred.
4. Removal of the unused manual placement ledger remains deferred to a
   separate cleanup milestone.
