import assert from "node:assert/strict";

import { buildCurrentSeasonTeamIdentityMap } from "../lib/currentSeasonTeamIdentity";

const identities = buildCurrentSeasonTeamIdentityMap({
  rosters: [
    { roster_id: 4, owner_id: "342849293037608960" },
    { roster_id: 5, owner_id: "1260048448384667648" },
    { roster_id: 7, owner_id: "73400761740312576" },
  ],
  users: [
    { user_id: "342849293037608960", display_name: "TommyMoore", metadata: { team_name: "The Mind Goblins" } },
    { user_id: "1260048448384667648", display_name: "drschoppejr2021", metadata: { team_name: "Stanal Fissures" } },
    { user_id: "73400761740312576", display_name: "DougFordham", metadata: {} },
  ],
});

assert.equal(identities.get("the-shepherd")?.currentTeamName, "The Mind Goblins");
assert.equal(identities.get("the-shepherd")?.franchiseId, "the-shepherd");
assert.equal(identities.get("tax-season")?.currentTeamName, "Stanal Fissures");
assert.equal(identities.get("tax-season")?.franchiseId, "tax-season");
assert.equal(identities.get("hall-pass")?.currentTeamName, "DougFordham");
assert.equal(identities.get("hall-pass")?.franchiseId, "hall-pass");

const noSleeperNames = buildCurrentSeasonTeamIdentityMap({ users: [], rosters: [] });
assert.equal(noSleeperNames.get("the-shepherd")?.currentTeamName, "The Shepherd");
assert.equal(noSleeperNames.get("tax-season")?.currentTeamName, "Tax Season");

console.log("Current-season team identity checks passed.");
