# Franchise-to-Roster Mapping Audit

## Purpose and scope

This is the commissioner-approved mapping artifact for Phase 3B.2. It records
the implemented season-specific mapping from each Sleeper roster in 2018–2025
to an approved River City franchise. The mapping feeds canonical matchup input
and owner projection without changing canonical matchup algorithms.

The audit contains 96 source associations: 12 rosters in each of eight seasons.
Commissioner-approved ownership tenures and historical rulings are authoritative.
Sleeper primary owners, `co_owners`, display names, team names, roster numbers,
and cross-season continuity are supporting evidence only.

## Sources and confidence rules

The review used:

- `lib/history/canonicalMatchupHistory.ts` and
  `lib/history/canonicalMatchupAcquisition.ts` for the source-roster contract,
  league IDs, matchup rows, brackets, and scoring-period treatment;
- `lib/history/ownerSeasonHistory.ts`, `lib/managers/identityData.ts`, and
  `lib/managers/identityTypes.ts` for approved franchise identities, owners, and
  season-specific tenures;
- `lib/sleeperIdMap.ts`, `lib/managers/activeManagers.ts`,
  `app/league-info/archives/page.tsx`, and the live Sleeper league roster/user
  metadata for identity evidence;
- `lib/manual-history.ts` for approved final placements;
- `docs/managers/historical-rulings.md`,
  `docs/managers/owner-matchup-history-spec.md`, and
  `docs/managers/owner-matchup-projection-spec.md` for ownership-source
  precedence and helper-account rulings.

Confidence has the following precise meaning:

- **confirmed** — the Sleeper primary owner ID directly matches an approved
  canonical owner profile whose tenure covers the proposed franchise and
  season.
- **strongly inferred** — approved tenure, a legacy identity map or historical
  name, and roster/team continuity agree, but the Sleeper ID is not stored
  directly on the canonical owner profile.
- **commissioner-confirmed** — the commissioner explicitly resolved source
  evidence that was insufficient on its own.
- **unresolved** — source evidence suggests a mapping but does not prove the
  source account belongs to the approved owner. Commissioner approval is
  required.

Evidence codes used below:

- **D** — direct canonical Sleeper ID plus approved season tenure.
- **L** — legacy identity/name evidence plus approved season tenure and
  cross-season roster or team continuity.
- **U** — unmatched Sleeper account; circumstantial evidence only.
- **C** — explicit commissioner ruling resolves otherwise insufficient source
  evidence.
- **H** — attached helper evidence ignored for ownership under an approved
  historical ruling.

Franchise names are canonical display names, not necessarily the source team
name used in that Sleeper season. Owner names and roles come only from approved
season tenures.

## Association audit

The league ID printed beneath each season heading is the `leagueId` for every
association in that season's table.

### 2018

League ID: `342868033913540608`

| Season | Roster | Sleeper source owner ID | Display / username | Source team | Proposed franchiseId | Canonical franchise | Canonical owner(s) for season | Confidence | Evidence | Notes / exception |
|---:|---:|---|---|---|---|---|---|---|---|---|
| 2018 | 1 | `342828350391230464` | `1RaybeeZ` | Prestigio Mundial | `prestigio-mundial` | Prestigio Mundial | Ray Long + Jeffrey Hudgins (co-owners) | confirmed | D; explicit team; `co_owners` includes Jeffrey | One shared franchise; source primary owner does not make Ray the sole 2018 owner. |
| 2018 | 2 | `342850391018356736` | `MadPanda` | — | `the-art-of-war` | The Art of War | JD Dowling (primary) | confirmed | D; tenure; roster 2 continuity | Source team name is absent. |
| 2018 | 3 | `341412060426436608` | `jordanmaslyn` | In My Thielens | `shake-n-bakers` | The Shake-N-Bakers | Jordan Maslyn (primary) | confirmed | D; tenure; roster 3 continuity | Historical team-name change does not change franchise identity. |
| 2018 | 4 | `342849293037608960` | `TommyMoore` | — | `the-shepherd` | The Shepherd | Tommy Moore (primary) | confirmed | D; tenure; roster 4 continuity | Source team name is absent. |
| 2018 | 5 | `342885779137216512` | `landonelliott` | — | `special-brownies` | Special Brownies | Landon Elliott (legacy owner) | commissioner-confirmed | C; roster 5 continuity; 2018 manual history; 2019–2024 Special Brownies slot | Ray confirmed the roster, franchise, owner, and historical Sleeper alias. No second identity or franchise is created. |
| 2018 | 6 | `342838548870762496` | `RVAPanthersFan` | — | `the-wildcard` | The Wildcard | Wade Cameron (primary) | confirmed | D; tenure; roster 6 continuity | Source team name is absent. |
| 2018 | 7 | `98907192333582336` | `Rtaylor311` | — | `ricky-crickets` | Ricky Crickets | Ricky Taylor (legacy owner) | strongly inferred | L; legacy ID map; exact 2018 tenure and placement | Roster 7 is reused by Hall Pass beginning in 2019; the franchise does not transfer with the slot. |
| 2018 | 8 | `342831451382841344` | `SavedByLevBell` | — | `kissed-by-a-freckle` | Kissed by a Freckle | Travis Miller (primary) | confirmed | D; tenure; roster 8 continuity | Source team name is absent. |
| 2018 | 9 | `342831898403377152` | `leaheyjp` | — | `deebow-and-arrow` | Deebow & Arrow | Patrick Leahey (legacy owner) | strongly inferred | L; legacy ID map; tenure; roster 9 continuity into 2019 | Source team name is absent. |
| 2018 | 10 | `343129212162523136` | `stevens247` | — | `buckeye-nation` | Buckeye Nation | Brian Stevens (primary) | confirmed | D; tenure; roster 10 continuity | Source team name is absent. |
| 2018 | 11 | `344561331535511552` | `Atlbraves88` | — | `brilly` | Brilly | Billy Biddle (legacy owner) | strongly inferred | L; approved 2018 tenure/placement; roster 11 continuity into Billy's direct account in 2019 | Old source ID is not canonical. Roster reuse by Hawkins Heroes starts in 2025. |
| 2018 | 12 | `345934777502699520` | `Gsusguy` | — | `receding-zuerlein` | Receding Zuerlein | Chris Barras (legacy owner) | strongly inferred | L; legacy ID map; exact final tenure and placement | Roster 12 is reused by The Bearded One beginning in 2019. |

### 2019

League ID: `466632190273253376`

| Season | Roster | Sleeper source owner ID | Display / username | Source team | Proposed franchiseId | Canonical franchise | Canonical owner(s) for season | Confidence | Evidence | Notes / exception |
|---:|---:|---|---|---|---|---|---|---|---|---|
| 2019 | 1 | `342828350391230464` | `1RaybeeZ` | Prestigio Mundial | `prestigio-mundial` | Prestigio Mundial | Ray Long + Jeffrey Hudgins (co-owners) | confirmed | D; team; Jeffrey attached | Shared-franchise attribution. |
| 2019 | 2 | `342850391018356736` | `MadPanda` | NOTmillatime27 | `the-art-of-war` | The Art of War | JD Dowling (primary) | confirmed | D; tenure; continuity | Team-name change is non-authoritative. |
| 2019 | 3 | `341412060426436608` | `jordanmaslyn` | Shake n Bakers | `shake-n-bakers` | The Shake-N-Bakers | Jordan Maslyn (primary) | confirmed | D; source name; continuity | — |
| 2019 | 4 | `342849293037608960` | `TommyMoore` | Moore’s Monstars | `the-shepherd` | The Shepherd | Tommy Moore (primary) | confirmed | D; tenure; continuity | — |
| 2019 | 5 | `469199353672626176` | `landonelliott1` | Special Brownies | `special-brownies` | Special Brownies | Landon Elliott (legacy owner) | strongly inferred | L; legacy ID map; exact source team; tenure; continuity | Landon's current and historical Sleeper IDs now resolve through one canonical profile. |
| 2019 | 6 | `342838548870762496` | `RVAPanthersFan` | Witchdoctors | `the-wildcard` | The Wildcard | Wade Cameron (primary) | confirmed | D; tenure; continuity | — |
| 2019 | 7 | `73400761740312576` | `JMUHockeyfan` | Patrick Jr. | `hall-pass` | Hall Pass | Doug Fordham (primary) | confirmed | D; approved first season; continuity | Reused Ricky Crickets roster slot; new franchise. |
| 2019 | 8 | `342831451382841344` | `millatime27` | Trash Panda | `kissed-by-a-freckle` | Kissed by a Freckle | Travis Miller (primary) | confirmed | D; tenure; continuity | — |
| 2019 | 9 | `342831898403377152` | `SaintPatty` | Deebo and Arrow | `deebow-and-arrow` | Deebow & Arrow | Patrick Leahey (legacy owner) | strongly inferred | L; legacy ID map; source team; final tenure | This franchise ends after 2019. |
| 2019 | 10 | `343129212162523136` | `stevens247` | — | `buckeye-nation` | Buckeye Nation | Brian Stevens (primary) | confirmed | D; tenure; continuity | Source team name is absent. |
| 2019 | 11 | `470428278931320832` | `ThugsofThanos` | — | `brilly` | Brilly | Billy Biddle (legacy owner) | strongly inferred | L; legacy ID map; approved tenure; continuity | Source team name is absent. |
| 2019 | 12 | `466663208728391680` | `Besedich` | My Beard Smells LikeDicks | `the-bearded-one` | The Bearded One | David Besedich (primary) | confirmed | D; approved first season; source name; continuity | Reused Receding Zuerlein roster slot; new franchise. |

### 2020

League ID: `530115541505298432`

| Season | Roster | Sleeper source owner ID | Display / username | Source team | Proposed franchiseId | Canonical franchise | Canonical owner(s) for season | Confidence | Evidence | Notes / exception |
|---:|---:|---|---|---|---|---|---|---|---|---|
| 2020 | 1 | `342828350391230464` | `1RaybeeZ` | Prestigio Mundial | `prestigio-mundial` | Prestigio Mundial | Ray Long + Jeffrey Hudgins (co-owners) | confirmed | D; team; Jeffrey attached | Shared-franchise attribution. |
| 2020 | 2 | `342850391018356736` | `MadPanda` | F U Minshew | `the-art-of-war` | The Art of War | JD Dowling (primary) | confirmed | D; tenure; continuity | — |
| 2020 | 3 | `341412060426436608` | `jordanmaslyn` | Aaron Jonestown Massacre | `shake-n-bakers` | The Shake-N-Bakers | Jordan Maslyn (primary) | confirmed | D; tenure; continuity | — |
| 2020 | 4 | `342849293037608960` | `TommyMoore` | The Diamond Dogs | `the-shepherd` | The Shepherd | Tommy Moore (primary) | confirmed | D; tenure; continuity | — |
| 2020 | 5 | `469199353672626176` | `landonelliott1` | Special Brownies | `special-brownies` | Special Brownies | Landon Elliott (legacy owner) | strongly inferred | L; legacy ID map; exact team; tenure; continuity | — |
| 2020 | 6 | `342838548870762496` | `RVAPanthersFan` | Witch Doctors | `the-wildcard` | The Wildcard | Wade Cameron (primary) | confirmed | D; tenure; continuity | — |
| 2020 | 7 | `73400761740312576` | `JMUHockeyfan` | Saquon can have my ACL | `hall-pass` | Hall Pass | Doug Fordham (primary) | confirmed | D; tenure; continuity | — |
| 2020 | 8 | `342831451382841344` | `millatime27` | Trash Pandas | `kissed-by-a-freckle` | Kissed by a Freckle | Travis Miller (primary) | confirmed | D; tenure; continuity | — |
| 2020 | 9 | `556676922517524480` | `49erLifer` | Big Dick Nick Pics | `hotub-jellyfish` | Hotub Jellyfish | Adam Lind (legacy owner) | strongly inferred | L; legacy ID map; approved first tenure; roster continuity | Reused Deebow & Arrow slot; new franchise. |
| 2020 | 10 | `343129212162523136` | `stevens247` | Infinity Chubb | `buckeye-nation` | Buckeye Nation | Brian Stevens (primary) | confirmed | D; tenure; continuity | — |
| 2020 | 11 | `470428278931320832` | `ThugsofThanos` | Knights of Chadwick | `brilly` | Brilly | Billy Biddle (legacy owner) | strongly inferred | L; legacy ID map; tenure; continuity | — |
| 2020 | 12 | `466663208728391680` | `Besedich` | BeardSmellsLikeB @all s | `the-bearded-one` | The Bearded One | David Besedich (primary) | confirmed | D; tenure; continuity | — |

### 2021

League ID: `677751457528762368`

| Season | Roster | Sleeper source owner ID | Display / username | Source team | Proposed franchiseId | Canonical franchise | Canonical owner(s) for season | Confidence | Evidence | Notes / exception |
|---:|---:|---|---|---|---|---|---|---|---|---|
| 2021 | 1 | `342828350391230464` | `1RaybeeZ` | Prestigio Mundial | `prestigio-mundial` | Prestigio Mundial | Ray Long + Jeffrey Hudgins (co-owners) | confirmed | D; team; Jeffrey attached | Shared-franchise attribution. |
| 2021 | 2 | `342850391018356736` | `MadPanda` | 冠軍 | `the-art-of-war` | The Art of War | JD Dowling (primary) | confirmed | D; tenure; continuity | — |
| 2021 | 3 | `341412060426436608` | `jordanmaslyn` | Let Russ Cook(s) | `shake-n-bakers` | The Shake-N-Bakers | Jordan Maslyn (primary) | confirmed | D; tenure; continuity | — |
| 2021 | 4 | `342849293037608960` | `TommyMoore` | The Peoples Champs | `the-shepherd` | The Shepherd | Tommy Moore (primary) | confirmed | D; tenure; continuity | — |
| 2021 | 5 | `469199353672626176` | `landonelliott1` | Special Brownies | `special-brownies` | Special Brownies | Landon Elliott (legacy owner) | strongly inferred | L; legacy ID map; exact team; tenure; continuity | — |
| 2021 | 6 | `342838548870762496` | `RVAPanthersFan` | Late Round Flyers | `the-wildcard` | The Wildcard | Wade Cameron (primary) | confirmed | D; tenure; continuity | — |
| 2021 | 7 | `73400761740312576` | `DougFordham` | Back to Jacksonville | `hall-pass` | Hall Pass | Doug Fordham (primary) | confirmed | D; tenure; continuity | — |
| 2021 | 8 | `342831451382841344` | `millatime27` | Trash Pandas | `kissed-by-a-freckle` | Kissed by a Freckle | Travis Miller (primary) | confirmed | D; tenure; continuity | — |
| 2021 | 9 | `556676922517524480` | `49erLifer` | Hot Tub Jellyfish | `hotub-jellyfish` | Hotub Jellyfish | Adam Lind (legacy owner) | strongly inferred | L; legacy ID map; source team; approved final tenure | This franchise ends after 2021. |
| 2021 | 10 | `343129212162523136` | `stevens247` | Not Mad Just Disappointed | `buckeye-nation` | Buckeye Nation | Brian Stevens (primary) | confirmed | D; tenure; continuity | — |
| 2021 | 11 | `470428278931320832` | `BBiddle` | BeeristheANSWER | `brilly` | Brilly | Billy Biddle (legacy owner) | strongly inferred | L; legacy ID map; tenure; continuity | — |
| 2021 | 12 | `466663208728391680` | `Besedich` | The Schmendricks | `the-bearded-one` | The Bearded One | David Besedich (primary) | confirmed | D; tenure; continuity | — |

### 2022

League ID: `784542934581256192`

| Season | Roster | Sleeper source owner ID | Display / username | Source team | Proposed franchiseId | Canonical franchise | Canonical owner(s) for season | Confidence | Evidence | Notes / exception |
|---:|---:|---|---|---|---|---|---|---|---|---|
| 2022 | 1 | `342828350391230464` | `1RaybeeZ` | Prestigio Mundial | `prestigio-mundial` | Prestigio Mundial | Ray Long + Jeffrey Hudgins (co-owners) | confirmed | D; team; Jeffrey attached | Shared-franchise attribution. |
| 2022 | 2 | `342850391018356736` | `MadPanda` | Panda Loco | `the-art-of-war` | The Art of War | JD Dowling (primary) | confirmed | D; tenure; continuity | — |
| 2022 | 3 | `341412060426436608` | `jordanmaslyn` | Dak Daddy | `shake-n-bakers` | The Shake-N-Bakers | Jordan Maslyn (primary) | confirmed | D; tenure; continuity | — |
| 2022 | 4 | `342849293037608960` | `TommyMoore` | The Hellfire Club | `the-shepherd` | The Shepherd | Tommy Moore (primary) | confirmed | D; tenure; continuity | — |
| 2022 | 5 | `469199353672626176` | `landonelliott1` | Special Brownies | `special-brownies` | Special Brownies | Landon Elliott (legacy owner) | strongly inferred | L; legacy ID map; exact team; tenure; continuity | — |
| 2022 | 6 | `342838548870762496` | `RVAPanthersFan` | Tua Many Injuries | `the-wildcard` | The Wildcard | Wade Cameron (primary) | confirmed | D; tenure; continuity | — |
| 2022 | 7 | `73400761740312576` | `DougFordham` | Closed for renovations | `hall-pass` | Hall Pass | Doug Fordham (primary) | confirmed | D; tenure; continuity | — |
| 2022 | 8 | `342831451382841344` | `millatime27` | Trash Pandas | `kissed-by-a-freckle` | Kissed by a Freckle | Travis Miller (primary) | confirmed | D; tenure; continuity | — |
| 2022 | 9 | `864186418971418624` | `Rashad8176` | John Cockslam & 4Skins | `the-gresham-empire` | The Gresham Empire | Rashad Gresham (primary) | confirmed | D; approved first season; continuity | Reused Hotub Jellyfish slot; new franchise. |
| 2022 | 10 | `343129212162523136` | `stevens247` | It’s a New Day | `buckeye-nation` | Buckeye Nation | Brian Stevens (primary) | confirmed | D; tenure; continuity | — |
| 2022 | 11 | `470428278931320832` | `BBiddle` | THE ORIGINALS | `brilly` | Brilly | Billy Biddle (legacy owner) | strongly inferred | L; legacy ID map; tenure; continuity | — |
| 2022 | 12 | `466663208728391680` | `Besedich` | The Schmendricks | `the-bearded-one` | The Bearded One | David Besedich (primary) | confirmed | D; tenure; continuity | — |

### 2023

League ID: `997510104398315520`

| Season | Roster | Sleeper source owner ID | Display / username | Source team | Proposed franchiseId | Canonical franchise | Canonical owner(s) for season | Confidence | Evidence | Notes / exception |
|---:|---:|---|---|---|---|---|---|---|---|---|
| 2023 | 1 | `342828350391230464` | `1RaybeeZ` | The Righteous Gemstones | `prestigio-mundial` | Prestigio Mundial | Ray Long + Jeffrey Hudgins (co-owners) | confirmed | D; tenure; Jeffrey attached; continuity | Source team rename does not change franchise. |
| 2023 | 2 | `342850391018356736` | `MadPanda` | Clown Punchers | `the-art-of-war` | The Art of War | JD Dowling (primary) | confirmed | D; tenure; continuity | — |
| 2023 | 3 | `341412060426436608` | `jordanmaslyn` | Gettin Chiggy Wit It | `shake-n-bakers` | The Shake-N-Bakers | Jordan Maslyn (primary) | confirmed | D; tenure; continuity | — |
| 2023 | 4 | `342849293037608960` | `TommyMoore` | CeeDee’s Nuts | `the-shepherd` | The Shepherd | Tommy Moore (primary) | confirmed | D; tenure; continuity | — |
| 2023 | 5 | `469199353672626176` | `landonelliott1` | Special Brownies | `special-brownies` | Special Brownies | Landon Elliott (legacy owner) | strongly inferred | L; legacy ID map; exact team; tenure; continuity | — |
| 2023 | 6 | `342838548870762496` | `RVAPanthersFan` | Tommy's Karma | `the-wildcard` | The Wildcard | Wade Cameron (primary) | confirmed | D; tenure; continuity | — |
| 2023 | 7 | `73400761740312576` | `DougFordham` | Closed for renovations | `hall-pass` | Hall Pass | Doug Fordham (primary) | confirmed | D + H; approved tenure; continuity | `co_owners` includes Aaron (`583513420586848256`, `adogg6jmu`) as draft helper only. Aaron receives no ownership. |
| 2023 | 8 | `342831451382841344` | `millatime27` | Trash Pandas | `kissed-by-a-freckle` | Kissed by a Freckle | Travis Miller (primary) | confirmed | D; tenure; continuity | — |
| 2023 | 9 | `864186418971418624` | `Rashad8176` | Snyder’s Sloppy Seconds | `the-gresham-empire` | The Gresham Empire | Rashad Gresham (primary) | confirmed | D; tenure; continuity | — |
| 2023 | 10 | `343129212162523136` | `stevens247` | It’s a New Day | `buckeye-nation` | Buckeye Nation | Brian Stevens (primary) | confirmed | D; tenure; continuity | — |
| 2023 | 11 | `470428278931320832` | `BBiddle` | Brilly | `brilly` | Brilly | Billy Biddle (legacy owner) | strongly inferred | L; legacy ID map; exact team; tenure; continuity | — |
| 2023 | 12 | `466663208728391680` | `DBeard` | The Tush Pushers | `the-bearded-one` | The Bearded One | David Besedich (primary) | confirmed | D; tenure; continuity | — |

### 2024

League ID: `1072545817749331968`

| Season | Roster | Sleeper source owner ID | Display / username | Source team | Proposed franchiseId | Canonical franchise | Canonical owner(s) for season | Confidence | Evidence | Notes / exception |
|---:|---:|---|---|---|---|---|---|---|---|---|
| 2024 | 1 | `342828350391230464` | `1RaybeeZ` | The Righteous Gemstones | `prestigio-mundial` | Prestigio Mundial | Ray Long + Jeffrey Hudgins (co-owners) | confirmed | D; tenure; Jeffrey attached; continuity | Shared-franchise attribution. |
| 2024 | 2 | `342850391018356736` | `MadPanda` | The Mad "Panda" | `the-art-of-war` | The Art of War | JD Dowling (primary) | confirmed | D; tenure; continuity | — |
| 2024 | 3 | `341412060426436608` | `jordanmaslyn` | GET. YOUR. GUY. | `shake-n-bakers` | The Shake-N-Bakers | Jordan Maslyn (primary) | confirmed | D; tenure; continuity | Landon does not join this franchise until 2025. |
| 2024 | 4 | `342849293037608960` | `TommyMoore` | Fancy Ass Bitches | `the-shepherd` | The Shepherd | Tommy Moore (primary) | confirmed | D; tenure; continuity | — |
| 2024 | 5 | `469199353672626176` | `landonelliott1` | Special Brownies | `special-brownies` | Special Brownies | Landon Elliott (legacy owner) | strongly inferred | L; legacy ID map; exact team; approved final tenure | Special Brownies history remains separate after Landon joins Jordan in 2025. |
| 2024 | 6 | `342838548870762496` | `RVAPanthersFan` | Stroud 2B An AmerAchane | `the-wildcard` | The Wildcard | Wade Cameron (primary) | confirmed | D; tenure; continuity | — |
| 2024 | 7 | `73400761740312576` | `DougFordham` | NowGiveMeMyThemeMusic | `hall-pass` | Hall Pass | Doug Fordham (primary) | confirmed | D; tenure; continuity | — |
| 2024 | 8 | `342831451382841344` | `millatime27` | How I Metcalf Your Mom | `kissed-by-a-freckle` | Kissed by a Freckle | Travis Miller (primary) | confirmed | D; tenure; continuity | — |
| 2024 | 9 | `864186418971418624` | `Rashad8176` | Snyder’s Sloppy Seconds | `the-gresham-empire` | The Gresham Empire | Rashad Gresham (primary) | confirmed | D; tenure; continuity | — |
| 2024 | 10 | `343129212162523136` | `stevens247` | It’s a New Day | `buckeye-nation` | Buckeye Nation | Brian Stevens (primary) | confirmed | D; tenure; continuity | — |
| 2024 | 11 | `470428278931320832` | `BBiddle` | Brilly | `brilly` | Brilly | Billy Biddle (legacy owner) | strongly inferred | L + H; legacy ID map; exact team; approved final tenure | `co_owners` includes `1133560977729064960` (`NakedBuddha`). The helper's identity remains unresolved and creates no ownership. |
| 2024 | 12 | `466663208728391680` | `DBeard` | The Schmendricks | `the-bearded-one` | The Bearded One | David Besedich (primary) | confirmed | D; tenure; continuity | — |

### 2025

League ID: `1199749375539027968`

| Season | Roster | Sleeper source owner ID | Display / username | Source team | Proposed franchiseId | Canonical franchise | Canonical owner(s) for season | Confidence | Evidence | Notes / exception |
|---:|---:|---|---|---|---|---|---|---|---|---|
| 2025 | 1 | `342828350391230464` | `1RaybeeZ` | Prestigio Mundial | `prestigio-mundial` | Prestigio Mundial | Ray Long + Jeffrey Hudgins (co-owners) | confirmed | D; team; Jeffrey attached; continuity | Shared-franchise attribution. |
| 2025 | 2 | `342850391018356736` | `MadPanda` | The Mad "Panda" | `the-art-of-war` | The Art of War | JD Dowling (primary) | confirmed | D; tenure; continuity | — |
| 2025 | 3 | `341412060426436608` | `jordanmaslyn` | The Shake-n-Bakers | `shake-n-bakers` | The Shake-N-Bakers | Jordan Maslyn (primary) + Landon Elliott (co-owner) | confirmed | D; team; Landon attached; approved 2025 tenure | Landon's earlier Special Brownies history is not merged into this franchise. |
| 2025 | 4 | `342849293037608960` | `TommyMoore` | ETN’ Deez Nutz | `the-shepherd` | The Shepherd | Tommy Moore (primary) | confirmed | D; tenure; continuity | — |
| 2025 | 5 | `1260048448384667648` | `drschoppejr2021` | Stanal Fissures | `tax-season` | Tax Season | Stan Schoppe (primary) | confirmed | D; approved first season | Reused Special Brownies roster slot; new franchise. |
| 2025 | 6 | `342838548870762496` | `RVAPanthersFan` | Carolina Reapers | `the-wildcard` | The Wildcard | Wade Cameron (primary) | confirmed | D; tenure; continuity | — |
| 2025 | 7 | `73400761740312576` | `DougFordham` | Broken Toe Joe | `hall-pass` | Hall Pass | Doug Fordham (primary) | confirmed | D; tenure; continuity | — |
| 2025 | 8 | `342831451382841344` | `millatime27` | Trash Pandas | `kissed-by-a-freckle` | Kissed by a Freckle | Travis Miller (primary) | confirmed | D; tenure; continuity | — |
| 2025 | 9 | `864186418971418624` | `Rashad8176` | #FuckTSwift | `the-gresham-empire` | The Gresham Empire | Rashad Gresham (primary) | confirmed | D; tenure; continuity | — |
| 2025 | 10 | `343129212162523136` | `stevens247` | It’s a New Day | `buckeye-nation` | Buckeye Nation | Brian Stevens (primary) | confirmed | D; tenure; continuity | — |
| 2025 | 11 | `583513420586848256` | `adogg6jmu` | Nudas Priest | `hawkins-heroes` | Hawkins Heroes | Aaron Hawkins (primary) | confirmed | D; approved first season | Reused Brilly roster slot; new franchise. Aaron's 2023 helper attachment does not create earlier history. |
| 2025 | 12 | `466663208728391680` | `DBeard` | The Schmendricks | `the-bearded-one` | The Bearded One | David Besedich (primary) | confirmed | D; tenure; continuity | — |

## 2018 roster 5 focused investigation

### Repository and source references

The repository originally contained no approved identity record for Sleeper
user ID `342885779137216512`. Ray has now confirmed that the account belongs to
Landon Elliott for historical resolution purposes. It is stored alongside
`469199353672626176` in Landon's existing `sleeperIds`; it does not create a
second owner identity or franchise.

The relevant supporting records are:

- Sleeper 2018 league `342868033913540608`, roster 5: primary owner
  `342885779137216512`, display `landonelliott`, no team name, no `co_owners`;
- 2018 Sleeper regular-season settings: 3 wins, 10 losses, 0 ties, 888.26
  points;
- approved manual history: Landon Elliott finished 12th in 2018;
- 2018 losers bracket: roster 5 appears in bracket match 3 against roster 11
  and the final placement match against roster 8; Sleeper marks roster 5 as the
  bracket winner, consistent with Toilet Bowl bracket mechanics, while the
  approved final placement remains 12th;
- postseason source scores for roster 5: 90.84 in week 14 (unpaired source
  row), 46.62 in week 15, and 60.96 in week 16; week 17 is an unpaired trailing
  row and is outside the completed canonical contest;
- approved tenure: Landon is the sole historical owner of Special Brownies in
  2018;
- 2019–2024: Special Brownies is consistently roster 5 under Landon's mapped
  account `469199353672626176`, normally with the exact source team name
  `Special Brownies`;
- 2025: roster 5 is reassigned to Stan Schoppe's new Tax Season franchise while
  Landon joins Jordan's roster 3 as an approved co-owner. This is roster reuse,
  not franchise continuity into Tax Season.

### Commissioner ruling

Ray confirmed that 2018 roster 5 was Landon Elliott's Special Brownies
franchise and that `342885779137216512` is Landon's historical Sleeper ID. The
production mapping is therefore `special-brownies`, ownership resolves to
`landon-elliott`, and confidence is **commissioner-confirmed**. This ruling
removes the final mapping ambiguity.

## Franchise continuity matrix

`—` means the franchise has no approved owner-season in that season.

| Canonical franchise | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Prestigio Mundial (`prestigio-mundial`) | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 |
| The Art of War (`the-art-of-war`) | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
| The Shake-N-Bakers (`shake-n-bakers`) | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 |
| The Shepherd (`the-shepherd`) | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 4 |
| Special Brownies (`special-brownies`) | 5 | 5 | 5 | 5 | 5 | 5 | 5 | — |
| Tax Season (`tax-season`) | — | — | — | — | — | — | — | 5 |
| The Wildcard (`the-wildcard`) | 6 | 6 | 6 | 6 | 6 | 6 | 6 | 6 |
| Ricky Crickets (`ricky-crickets`) | 7 | — | — | — | — | — | — | — |
| Hall Pass (`hall-pass`) | — | 7 | 7 | 7 | 7 | 7 | 7 | 7 |
| Kissed by a Freckle (`kissed-by-a-freckle`) | 8 | 8 | 8 | 8 | 8 | 8 | 8 | 8 |
| Deebow & Arrow (`deebow-and-arrow`) | 9 | 9 | — | — | — | — | — | — |
| Hotub Jellyfish (`hotub-jellyfish`) | — | — | 9 | 9 | — | — | — | — |
| The Gresham Empire (`the-gresham-empire`) | — | — | — | — | 9 | 9 | 9 | 9 |
| Buckeye Nation (`buckeye-nation`) | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| Brilly (`brilly`) | 11 | 11 | 11 | 11 | 11 | 11 | 11 | — |
| Hawkins Heroes (`hawkins-heroes`) | — | — | — | — | — | — | — | 11 |
| Receding Zuerlein (`receding-zuerlein`) | 12 | — | — | — | — | — | — | — |
| The Bearded One (`the-bearded-one`) | — | 12 | 12 | 12 | 12 | 12 | 12 | 12 |

## Roster reuse and historical exceptions

The audit identifies five source slots whose canonical franchise changes:

- roster 7: Ricky Crickets (2018) to Hall Pass (2019 onward);
- roster 9: Deebow & Arrow (2018–2019), Hotub Jellyfish (2020–2021), then The
  Gresham Empire (2022 onward);
- roster 12: Receding Zuerlein (2018) to The Bearded One (2019 onward);
- roster 5: Special Brownies (2018–2024) to Tax Season
  (2025);
- roster 11: Brilly (2018–2024) to Hawkins Heroes (2025).

These are franchise transitions at reused Sleeper roster numbers. No successor
inherits the predecessor's history.

The following attached-account rows do not create ownership or franchise
changes:

- 2023 roster 7 includes Aaron Hawkins as Doug Fordham's draft helper. Hall Pass
  remains Doug's franchise and Doug remains its sole owner.
- 2024 roster 11 includes source account `1133560977729064960`, display
  `NakedBuddha`, as a `co_owner`. Brilly remains Billy Biddle's franchise and
  Billy remains its sole owner. The helper is not identified as Aaron or “The
  Oracle.”
- Prestigio's Jeffrey attachment reflects an approved co-ownership tenure and
  is therefore materially different from a helper attachment.
- Landon's 2025 attachment to roster 3 reflects an approved new co-owner tenure;
  it does not merge his 2018–2024 Special Brownies franchise into The
  Shake-N-Bakers.

## Validation summary

- Associations audited: **96**.
- Per-season rows: **12** in each of 2018, 2019, 2020, 2021, 2022, 2023, 2024,
  and 2025.
- Confidence totals: **76 confirmed**, **19 strongly inferred and
  commissioner-approved**, **1 commissioner-confirmed**, **0 unresolved**.
- Duplicate `(season, rosterId)` associations: **0**.
- Seasons mapping two source rosters to the same proposed canonical franchise:
  **0**.
- Proposed franchise IDs absent from approved identity data: **0**.
- Franchise IDs requiring creation: **0**.
- Mapped owner sets inconsistent with approved season tenure: **0**.
- Helper accounts granted ownership: **0**.
- Production files changed by this audit: **0**.

All 96 mappings are commissioner-approved and implemented in
`lib/history/franchiseRosterMappings.ts`. The production map contains no
unresolved association and introduces no new franchise identity.
