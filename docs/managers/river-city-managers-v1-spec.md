# River City Managers v1 Specification

## Status and product principle

This document records the approved Managers v1 product and architecture requirements through Phase 2. It is a specification for the existing River City Fantasy Football project only; Long Country Club identities or history must not be imported or inferred.

The product principle is:

> Does this help tell the owner’s River City story?

Managers v1 preserves the existing interface while reusable, validated history engines are established underneath it. Historical facts must be represented honestly. Missing or ambiguous information remains null, unavailable, or explicitly unresolved rather than being inferred.

## Product vision

Managers is the owner-centered view of River City history. It should bring together:

- current, retired, co-owner, and staff identities;
- the franchises and ownership tenures attached to each person;
- season-by-season placement history and career résumé;
- manually curated biography, personality, contact, fandom, and league-role information; and
- future matchup, rivalry, draft, trade, award, and financial context when trusted engines for those subjects exist.

Owner identity and franchise identity are separate concepts. A franchise may have multiple recognized owners, and one owner may have history with multiple franchises. League-wide franchise achievements must not be double-counted merely because an approved result is attributed to more than one co-owner’s personal career.

## Current landing-page behavior

The existing `/managers` landing page remains the v1 presentation contract until a later UI phase is approved.

- The page has Active Owners, Retired Owners, and Staff tabs.
- Active Owners is the default view.
- Active owners can be viewed as All Owners or By Division.
- The All Owners, Retired Owners, and Staff views render the existing responsive portrait-card grids.
- The By Division view loads the current Sleeper league, users, and rosters. It applies live Sleeper team names and groups active owners by the current roster division, with an Unassigned fallback.
- Sleeper loading, unavailable, and empty states remain visible; failure does not remove the All Owners view.
- Divisions displayed here describe the loaded season only. They are not permanent owner attributes.

The landing page continues to use the existing visual design, responsive card layout, navigation, owner groups, and links. Phase 1 and Phase 2 do not connect the new engines to this UI.

## Current owner-profile section order

The existing individual owner route and `OwnerProfile` presentation remain unchanged through Phase 2.

1. Hero
2. Main owner-story column:
   1. Team Legacy
   2. Timeline, when entries exist
   3. Current Division
3. Supporting column:
   1. Career Snapshot
   2. Best Way to Talk Trades
   3. Personality
   4. Rivalry

At large widths the owner-story and supporting sections form two columns. At smaller widths they retain their existing responsive stacking behavior. A staff profile or profile without tenure history may use the existing reduced section arrangement.

## Data ownership and source-of-truth rules

Managers v1 must reuse the repository’s canonical sources and must not create a competing owner registry or identity resolver.

- `lib/managers/identityData.ts` owns normalized owner profiles, franchises, ownership tenures, co-owner relationships, and league-service tenures.
- Existing identity types, selectors, and resolvers own canonical IDs, slugs, statuses, and identity lookup behavior.
- `lib/history/historicalSeasonResults.ts` owns the approved final-placement ledger. Owner Season History consumes that typed layer directly; `lib/manual-history.ts` is not an independent placement source.
- The unused manual ledger remains present for compatibility; removal is deferred to a separately approved cleanup milestone.
- Existing franchise identity data owns normalized franchise IDs and current canonical franchise names.
- Existing season-to-league mappings own the Sleeper league ID for each season.
- Sleeper-derived data may be used where it is already available, but current Sleeper membership must not erase retired-owner history.
- Manually curated manager records remain the source for biographies, photos, fandom, contact preferences, philosophy, and other survey/profile content until a later approved migration.
- An `ownerSeasonKey` is the immutable identifier for each resolved or unresolved owner-season attribution. Consumers must not substitute array position or a display label as identity.

Raw historical labels and normalized values serve different purposes. The raw placement label must remain traceable, while normalized owner and franchise fields come from the canonical identity and tenure model. A current canonical franchise name is not evidence of the exact historical team name in every season.

All ten approved 2011 placement identities resolve. JD's fifth-place result remains explicitly franchise-unresolved because no approved 2011 franchise mapping exists; no franchise may be invented for it.

## Season-specific division rules

Division membership is season-level data, not an enduring owner or franchise property.

The approved future resolution flow is:

1. selected season;
2. that season’s Sleeper league ID;
3. that league’s rosters and division settings;
4. normalized owner identity; and
5. division grouping for that season.

The reusable history engines must not permanently assign a current division to an owner. If a source already contains division data, it must be treated as belonging only to its source season.

## Ownership and co-owner rules

### Ray Long and Jeffrey Hudgins

- Ray Long was a solo River City owner in 2011.
- Ray’s 2011 solo franchise was Prestigio Mundial.
- Ray did not participate in 2012.
- Ray and Jeffrey became Prestigio co-owners beginning in 2013.
- Jeffrey must not receive Ray’s 2011 solo result.
- Both owners receive Prestigio placement accomplishments for seasons within their approved shared tenure.
- Jeffrey retains his own owner identity and profile; he is not a separate competing franchise during the shared seasons.

Prestigio therefore has franchise continuity across Ray’s 2011 solo season and the shared era, but it has no owner-season record in 2012. The 2011 primary tenure and the 2013 shared-tenure start are approved separately; Jeffrey’s history begins only with the latter.

### Jordan Maslyn and Landon Elliott

- Jordan and Landon remain distinct owner identities.
- Landon’s earlier Special Brownies history remains Landon’s independent franchise history.
- Jordan’s earlier Shake-N-Bakers accomplishments are not copied into Landon’s career.
- Landon joined Jordan’s Shake-N-Bakers as a co-owner beginning in 2025.
- Approved Shake-N-Bakers results are shared with Landon only during that co-owner tenure.

### Retired owners and staff

- Retired owners retain their historical seasons and accomplishments even when absent from current Sleeper membership.
- Staff identities without competitive owner-season records receive no invented competitive history.
- League-service roles such as commissioner are separate from franchise ownership.

## Phased v1 architecture and output contracts

### Phase 1 — Owner Season History

`lib/history/ownerSeasonHistory.ts` is the reusable, framework-free season history source. It emits typed owner-season records containing immutable identity, normalized owner and franchise fields, ownership role and co-owners, placement flags, season activity, Sleeper league linkage, source metadata, coverage states, and notes.

Resolved owners may have one record per owner-season attribution. Approved co-owners therefore receive separate personal records pointing to the same physical Historical Season Result. Platform placement and historical championship recognition are separate fields. Current-season tenure records may exist without a completed season result.

### Phase 2 — Owner Career Summary

`lib/history/ownerCareerSummary.ts` consumes Owner Season History and emits one normalized career summary per resolved owner. It returns raw values only and contains no React or display formatting. Its detailed contract and calculations are defined in `owner-career-summary-spec.md`.

Phase 2 covers:

- season participation and ownership-role counts;
- placement résumé and coverage;
- latest resolved franchise;
- franchise-grouped placement history;
- honest null placeholders for deferred enrichment; and
- global coverage and duplicate reporting.

It does not alter source history, infer missing facts, or replace the Phase 1 engine.

## Current v1 scope

The approved implemented foundation is limited to:

- canonical owner/franchise/tenure reuse;
- normalized owner-season records;
- placement and actual-season last-place flags from Historical Season Results;
- separate platform-championship and historical-championship recognition;
- raw historical team names when the approved source supplies them;
- approved co-owner attribution;
- unresolved and coverage reporting;
- placement-, season-, role-, and franchise-based career summaries;
- immutable consumer results; and
- focused validation scripts.

The Managers UI is not changed in these phases.

## Deferred features

The following require later approved phases and trusted source work:

- regular-season and playoff records;
- winning percentage and playoff appearances;
- points for and points against;
- head-to-head records, favorite victim, nemesis, most-played opponent, and statistical rivalries;
- career winnings and net earnings;
- draft, auction, keeper, trade, and transaction performance;
- awards and records integration;
- historical team-name timelines where the exact names are not currently sourced;
- season-switching and season-specific division UI; and
- connecting the history engines to redesigned landing or owner-profile interfaces.

Typed Phase 2 placeholders for deferred career enrichment remain null and do not authorize new data collection.

## Validation requirements

Each engine must have a focused TypeScript validation script consistent with the repository’s conventions.

Owner Season History validation must cover Ray, Jeffrey, Jordan, Landon, one active solo owner, one retired owner, the ten-team 2011 result set, JD's unresolved 2011 franchise, duplicate keys, seasons covered, source coverage, and special ownership boundaries.

Owner Career Summary validation must cover:

- unique summary owner IDs and unique consumed `ownerSeasonKey` values;
- distinct platform and historical championship totals;
- placement-based podium totals;
- averages calculated from known placements only;
- latest-franchise selection;
- separate franchise histories;
- immutable return values;
- null future-enrichment placeholders;
- exclusion of unresolved placeholders as fake owners;
- shared Prestigio results only during approved shared seasons;
- preservation of Landon’s independent history; and
- retired and staff handling.

Required release checks are the focused validation scripts, TypeScript, scoped ESLint, production build, and `git diff --check`. Failures caused by the work must be resolved before approval.

## Responsibilities and approval

Ray/ChatGPT owns:

- the product vision and approved requirements;
- authoritative River City facts and manual historical curation;
- resolution of ambiguous identity, franchise, tenure, or source conflicts;
- scope and phase approval; and
- approval of any historical correction.

Codex owns:

- evidence-based repository inspection;
- implementing only the approved phase and contract;
- reusing canonical identity and historical sources;
- preserving unresolved gaps instead of inventing facts;
- focused tests, validation, and transparent reporting; and
- stopping for approval before changing historical facts, beginning a later phase, redesigning the UI, or committing.

Implementation convenience does not override an approved historical fact. When repository data conflicts with approved history, Codex reports the precise source and recommends the smallest correction without applying it until authorized.
