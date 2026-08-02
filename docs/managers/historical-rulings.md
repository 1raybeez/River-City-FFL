# River City Historical Ownership Rulings

## Purpose and authority

This file records commissioner-approved ownership rulings used by Managers history engines. Approved canonical ownership tenure is authoritative over Sleeper platform metadata.

Temporary draft helpers, substitute managers, `co_owners`, and attached Sleeper accounts do not create canonical ownership, franchise, matchup, placement, championship, career, or rivalry attribution.

No identity or ownership-tenure record may be created solely from a helper attachment.

## 2023 Doug and Aaron

- Doug was the sole historical owner of his franchise.
- Aaron was attached only to assist Doug during the draft.
- Aaron receives no 2023 owner-season, franchise, matchup, placement, championship, career, opponent, or rivalry attribution.
- Doug receives the complete 2023 franchise and matchup history.
- No Doug/Aaron co-ownership tenure may be created.

## Billy’s final season

- Billy remained the sole owner of his franchise through his final season, 2024.
- Any Sleeper account temporarily attached to Billy for draft assistance receives no ownership or historical-statistics attribution.
- Repository evidence does not independently prove that `NakedBuddha` was attached to Billy’s roster or that the account represented the person known as “The Oracle.” Both the attachment and identity remain unresolved.
- `NakedBuddha` and “The Oracle” must not be identified as Aaron.
- No identity or ownership-tenure record for Aaron, “The Oracle,” or `NakedBuddha` may be created from helper metadata alone.
- If reviewed source evidence later confirms a helper attachment, preserve it only as source evidence; Billy’s approved sole ownership remains unchanged.

## Attribution precedence

1. Approved canonical ownership tenures are authoritative.
2. Commissioner-approved historical corrections override platform metadata.
3. Sleeper primary-owner data may help connect a roster to an approved owner.
4. Sleeper `co_owners`, substitute managers, draft helpers, and attached users are evidence only.
5. Platform attachment alone never creates canonical ownership.
6. Unapproved or unresolved attached users receive no historical attribution.

## Historical final standings

- The commissioner workbook archived at
  `data/source/historical/river-city-final-standings-and-payouts.xlsx` is the
  approved source evidence for the typed Historical Season Results layer.
- The application must consume reviewed TypeScript data and must not parse the
  XLSX during production builds.
- 2011 was a 10-team season. The workbook's ten-place order is authoritative;
  no eleventh-place, twelfth-place, or synthetic unknown result may be
  created.
- 2012 onward was a 12-team league.
- Final season results do not create pre-Sleeper matchup records, scores,
  points, winning percentages, playoff game records, or opponent history.
- Historical Season Results is the authoritative final-placement source for
  Owner Season History. The former manual ledger is not applied independently.
- Last place derives from the accepted season's actual final result: tenth in
  the 10-team 2011 season and twelfth in 12-team seasons.

## 2022 co-championship

- The Damar Hamlin game left the 2022 fantasy championship unresolved.
- Sleeper/platform order remains Tommy Moore first and David Besedich second.
- River City historical recognition awards the 2022 championship to both
  Tommy and Dave.
- Typed history must preserve `platformChampion` Tommy,
  `platformRunnerUp` Dave, and historical champion credit for both owners.
- Owner Career Summary reports platform and historical championship totals as
  separate fields. Dave's historical co-championship does not change his
  second-place platform finish or create another podium result.
- The ruling does not create a combined Tommy/Dave owner identity.
- JD Dowling finished 12th and last in 2022. Jordan Maslyn finished 11th and
  next-to-last.

## ESPN-era franchise mappings

- Landon Elliott's ESPN-era franchise is Special Brownies, normalized as
  `special-brownies`.
- Travis Miller's ESPN-era franchise is I'm Your Huckleberry, normalized to
  his canonical `kissed-by-a-freckle` franchise continuity.
- Darren Kusaj's ESPN-era franchise is Team Darren, normalized as
  `team-kusaj`.
- These commissioner-approved mappings resolve the corresponding 2012 typed
  season results without creating new owner identities or franchises.

## Confirmed unresolved and deferred history work

- JD Dowling's approved fifth-place 2011 result remains franchise-unresolved.
  No franchise may be inferred without a later commissioner ruling.
- `LB Winner` remains an unresolved workbook label and must not be classified
  as Toilet Bowl winner.
- Payout reconciliation remains deferred. Workbook payout entries remain
  source evidence rather than normalized career finance data.
- `lib/manual-history.ts` remains in the repository but is no longer an Owner
  Season History placement source. Removing it is deferred to a separate
  cleanup milestone.

## Franchise History rulings

### Ownership-era boundaries

- Start a new franchise ownership era when the approved owner set changes, an
  ownership role changes, the franchise returns after inactivity, or an
  explicit commissioner ruling changes franchise identity.
- Historical team names, Sleeper roster IDs, temporary helper accounts,
  spelling variations, and temporary nicknames do not create ownership eras.

### Historical-name presentation

- Complete Franchise Name History preserves every sourced historical team
  name, including temporary names and misspellings.
- The primary Franchise Timeline includes only sustained names or separately
  approved historically meaningful changes. It must not list every raw label.

### Franchise status

- `active` means currently competing.
- `dormant` means not currently competing while continuity remains available
  for a future return.
- `retired` means explicitly concluded with no expected continuation.
- Special Brownies is dormant after 2024. It remains Landon Elliott's separate
  franchise history and is not merged into Shake-N-Bakers.

### Succession and matchup scope

- No predecessor or successor relationship exists without an explicit
  commissioner ruling. Roster-slot reuse, owner movement, co-owner changes,
  inactivity, and a new franchise using a former owner are insufficient.
- Special Brownies is not a predecessor of Shake-N-Bakers.
- The default franchise matchup résumé includes only overall, regular,
  championship-playoff, and championship-game records. Overall contains only
  regular and championship-playoff games.
- Third-place, placement, consolation, and Toilet Bowl records remain separate
  secondary scopes. Byes and incomplete contests create no statistics.
