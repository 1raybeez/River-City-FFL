import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildOwnerDraftVerdict, type OwnerDraftVerdictInput } from "../lib/draftReportV2/ownerVerdict";

const teams: OwnerDraftVerdictInput[] = [
  ["Nudas Priest", 1, "A+", 1, 1, 1, 10, "FLEX — #1 IN LEAGUE", "QB ROOM — #11 IN LEAGUE"],
  ['The Mad "Panda"', 2, "A", 2, 8, 2, 12, "RB ROOM — #1 IN LEAGUE", "QB ROOM — #12 IN LEAGUE"],
  ["The Bowers That Be", 3, "B+", 3, 2, 5, 3, "TE ROOM — #2 IN LEAGUE", "WR ROOM — #12 IN LEAGUE"],
  ["Carolina Reapers", 4, "B", 4, 6, 3, 5, "STARTING LINEUP — #3 IN LEAGUE", "TE ROOM — #10 IN LEAGUE"],
  ["2 Buds Smoking Bud, Bud", 5, "B", 6, 3, 3, 7, "QB ROOM — #2 IN LEAGUE", "TE ROOM — #9 IN LEAGUE"],
  ["Richmond Bengals", 6, "B-", 5, 4, 7, 4, "WR ROOM — #1 IN LEAGUE", "TE ROOM — #12 IN LEAGUE"],
  ["It’s a New Day", 7, "C+", 7, 7, 6, 6, "QB ROOM — #5 IN LEAGUE", "WR ROOM — #8 IN LEAGUE"],
  ["Trash Pandas", 8, "C", 8, 9, 8, 8, "WR ROOM — #2 IN LEAGUE", "RB ROOM — #10 IN LEAGUE"],
  ["The Schmendricks", 9, "C", 9, 5, 10, 1, "DEPTH — #1 IN LEAGUE", "RB ROOM — #12 IN LEAGUE"],
  ["Stanal Fissures", 10, "D", 10, 11, 9, 11, "QB ROOM — #1 IN LEAGUE", "WR ROOM — #11 IN LEAGUE"],
  ["#FuckTSwift", 11, "D", 11, 12, 11, 9, "TE ROOM — #3 IN LEAGUE", "FLEX — #12 IN LEAGUE"],
  ["The Mind Goblins", 12, "D-", 12, 10, 12, 2, "DEPTH — #2 IN LEAGUE", "STARTING LINEUP — #12 IN LEAGUE"],
].map(([teamName, overallRank, grade, draftQualityRank, auctionEfficiencyRank, startingLineupRank, usefulDepthRank, biggestStrength, biggestWeakness]) => ({ teamName, grade, overallRank, draftQualityRank, auctionEfficiencyRank, startingLineupRank, usefulDepthRank, biggestStrength, biggestWeakness })) as OwnerDraftVerdictInput[];

const verdicts = teams.map(buildOwnerDraftVerdict);
assert.equal(verdicts.length, 12);
assert.match(verdicts[0], /No\. 1 finish with an A\+ grade/);
assert.match(verdicts[0], /Flex at No\. 1 in the league/);
assert.match(verdicts[0], /No\. 11 Quarterback room/);
assert.match(verdicts[1], /No\. 2 with an A grade/);
assert.match(verdicts[2], /auction execution boosted/);
assert.match(verdicts[4], /top-three starting lineup.*strong auction execution/);
assert.match(verdicts[4], /Quarterback room at No\. 2/);
assert.match(verdicts[4], /No\. 9 Tight end room/);
assert.match(verdicts[5], /No\. 1 in the league/);
assert.match(verdicts[5], /No\. 12 Tight end room/);
assert.match(verdicts[7], /No\. 2 in the league/);
assert.match(verdicts[7], /No\. 10 Running back room/);
assert.match(verdicts[8], /League-leading depth/);
assert.match(verdicts[11], /room to climb/);
assert.match(verdicts[11], /Top-three depth/);
assert.doesNotMatch(verdicts[11], /League-leading depth/);
assert.ok(verdicts.every((verdict) => !/a A\+|a A grade|\bQb Room\b|\bWr Room\b|\bTe Room\b|\bRb Room\b/.test(verdict)));
assert.ok(verdicts.every((verdict) => verdict.replace(/No\./g, "").split(/[.!?]/).filter(Boolean).length === 2));
assert.ok(verdicts.every((verdict) => !/robust|percentile|formula c|method d|evidence score|capped contribution|bad|terrible|bust/i.test(verdict)));
assert.equal(buildOwnerDraftVerdict(teams[4]), buildOwnerDraftVerdict({ ...teams[4] }));
const renamedVerdict = buildOwnerDraftVerdict({ ...teams[4], teamName: "Renamed Preview Team" });
assert.equal(renamedVerdict.replace("Renamed Preview Team", teams[4].teamName), verdicts[4]);
const helper = readFileSync("lib/draftReportV2/ownerVerdict.ts", "utf8");
const client = readFileSync("app/commish/post-draft/v2/owner-preview/OwnerPreviewClient.tsx", "utf8");
assert.doesNotMatch(helper, /Nudas Priest|Panda|Bowers|Carolina|2 Buds|Schmendricks|Mind Goblins/);
assert.doesNotMatch(helper, /fetch\(|openai|anthropic|llm|generate/i);
assert.match(client, /STARTING CORE/);
assert.match(client, /POSITION CONTRIBUTORS/);
assert.match(client, /USEFUL DEPTH/);
assert.match(client, /FLEX CONTEXT/);
assert.match(client, /Auction Efficiency shows how effectively/);
console.log("Draft Report Card V2 owner verdict checks passed.");
console.log(verdicts.map((verdict, index) => `${index + 1}. ${teams[index].teamName}: ${verdict}`).join("\n"));
