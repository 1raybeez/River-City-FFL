# River City Commissioner Hub v2 Phase 1 contract

The hub is a read-only aggregation model. Existing Finance, Weekly Operations,
governance, Predictor, recap, feedback, and War Room services remain the source
of truth and retain their server-side mutation guards.

`AttentionItem` means a human commissioner action is required. Operational
blockers are separate and may describe waiting, live-game, provider, or
automation conditions that do not create a task. Multiple attention items may
come from one capability.

The universal primary capability IDs are `FINANCE`, `LEGISLATIVE_HUB`,
`SEASON_OPERATIONS`, `WAR_ROOM`, `LEAGUE_INTELLIGENCE`, and `OWNER_FEEDBACK`.
`SYSTEM_HEALTH` is secondary. Home and return navigation are not capabilities.

`CommissionerHubModel` always includes `leagueSpecificCapabilities[]`; River
City currently returns an empty array. The model also exposes
`leagueIntelligenceProducts[]` as a normalized top-level collection. This is a
deliberate cross-project contract decision, not a River City-only variation:
the `LEAGUE_INTELLIGENCE` capability remains present, while each child product
keeps independent availability, workflow, publication, and route state.

Availability, health, seasonal relevance, and human action are independent
state dimensions. Intelligence child products retain their own availability,
workflow/publication state, and routes. Hub visibility does not grant child-route
mutation authority, and War Room visibility remains commissioner- or
owner-scoped. Unknown or partial source state is represented honestly.
