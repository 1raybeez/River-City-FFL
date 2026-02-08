// Sleeper Record Aggregator (CommonJS Version)
// Computes W-L-T for all active + retired managers with Sleeper history

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

// All league IDs from 2018–2026
const leagueIds = [
  "342868033913540608", // 2018
  "466632190273253376", // 2019
  "530115541505298432", // 2020
  "677751457528762368", // 2021
  "784542934581256192", // 2022
  "997510104398315520", // 2023
  "1072545817749331968", // 2024
  "1199749375539027968", // 2025
  "1312149033254416384"  // 2026
];

// ACTIVE + RETIRED OWNERS WITH REAL SLEEPER ROSTERS
const owners = {
  // ACTIVE OWNERS
  "342828350391230464": "Ray",
  "342850391018356736": "JD",
  "341412060426436608": "Jordan",
  "342849293037608960": "Tommy",
  "1260048448384667648": "Stan",
  "342838548870762496": "Wade",
  "73400761740312576": "Doug",
  "342831451382841344": "Travis",
  "864186418971418624": "Rashad",
  "343129212162523136": "Brian",
  "583513420586848256": "Aaron",
  "466663208728391680": "Dave",

  // RETIRED OWNERS WITH SLEEPER HISTORY
  "556676922517524480": "Adam",
  "470428278931320832": "Billy",
  "345934777502699520": "Chris",
  "342831898403377152": "Patrick",
  "98907192333582336": "Ricky",

  // RETIRED: Landon (was active in early years)
  "469199353672626176": "Landon"
};

// Initialize record map
const records = {};
Object.keys(owners).forEach((id) => {
  records[id] = { w: 0, l: 0, t: 0 };
});

// Helper to fetch JSON
async function fetchJSON(url) {
  const res = await fetch(url);
  return res.json();
}

// Main computation
async function compute() {
  for (const leagueId of leagueIds) {
    console.log(`Processing league ${leagueId}...`);

    // Fetch rosters for this league
    const rosters = await fetchJSON(
      `https://api.sleeper.app/v1/league/${leagueId}/rosters`
    );

    // Map roster_id → owner Sleeper ID
    const rosterToOwner = {};
    rosters.forEach((r) => {
      if (owners[r.owner_id]) {
        rosterToOwner[r.roster_id] = r.owner_id;
      }
    });

    // Loop through all possible weeks
    for (let week = 1; week <= 18; week++) {
      const matchups = await fetchJSON(
        `https://api.sleeper.app/v1/league/${leagueId}/matchups/${week}`
      );

      if (!Array.isArray(matchups) || matchups.length === 0) continue;

      // Group matchups by matchup_id
      const grouped = {};
      matchups.forEach((m) => {
        if (!grouped[m.matchup_id]) grouped[m.matchup_id] = [];
        grouped[m.matchup_id].push(m);
      });

      // Process each matchup
      for (const matchupId in grouped) {
        const game = grouped[matchupId];
        if (game.length !== 2) continue;

        const [a, b] = game;
        const ownerA = rosterToOwner[a.roster_id];
        const ownerB = rosterToOwner[b.roster_id];

        if (!ownerA || !ownerB) continue;

        if (a.points > b.points) {
          records[ownerA].w++;
          records[ownerB].l++;
        } else if (b.points > a.points) {
          records[ownerB].w++;
          records[ownerA].l++;
        } else {
          records[ownerA].t++;
          records[ownerB].t++;
        }
      }
    }
  }

  // Output final results
  console.log("\nFINAL RECORDS:");
  const output = {};
  for (const id in records) {
    const { w, l, t } = records[id];
    output[id] = t > 0 ? `${w}-${l}-${t}` : `${w}-${l}`;
  }

  console.log(JSON.stringify(output, null, 2));
}

compute();
