type Rank = number | null | undefined;

export type OwnerDraftVerdictInput = {
  teamName: string;
  overallRank: Rank;
  grade: string;
  draftQualityRank: Rank;
  auctionEfficiencyRank: Rank;
  startingLineupRank: Rank;
  usefulDepthRank: Rank;
  biggestStrength: string;
  biggestWeakness: string;
};

const diagnosticRank = (value: string) => { const match = value.match(/#(\d+)/); return match ? Number(match[1]) : null; };
const friendlyLabel = (value: string) => {
  const label = value.split(" — ")[0].toUpperCase();
  return ({ QB: "Quarterback", "QB ROOM": "Quarterback room", RB: "Running back", "RB ROOM": "Running back room", WR: "Wide receiver", "WR ROOM": "Wide receiver room", TE: "Tight end", "TE ROOM": "Tight end room", "STARTING LINEUP": "Starting lineup", "USEFUL DEPTH": "Useful depth", "AUCTION EFFICIENCY": "Auction Efficiency" } as Record<string, string>)[label] ?? value.split(" — ")[0].toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
};

function gradeArticle(grade: string) { return /^[AEIOU]/i.test(grade) ? "an" : "a"; }

function placementSentence(input: OwnerDraftVerdictInput, overallRank: string) {
  const grade = `${gradeArticle(input.grade)} ${input.grade} grade`;
  if (input.startingLineupRank != null && input.startingLineupRank <= 3 && input.auctionEfficiencyRank != null && input.auctionEfficiencyRank <= 3) return `A top-three starting lineup and strong auction execution powered ${input.teamName} to a ${overallRank} finish with ${grade}.`;
  if (input.startingLineupRank != null && input.startingLineupRank <= 3) return `A top-three starting lineup anchored the draft for ${input.teamName}, which finished ${overallRank} with ${grade}.`;
  if (input.auctionEfficiencyRank != null && input.auctionEfficiencyRank <= 3) return `Strong auction execution boosted ${input.teamName} to a ${overallRank} finish with ${grade}.`;
  if (input.usefulDepthRank === 1) return `League-leading depth kept ${input.teamName} competitive at ${overallRank}, despite a less effective overall roster build and ${grade}.`;
  if (input.usefulDepthRank != null && input.usefulDepthRank <= 3) return `Top-three depth kept ${input.teamName} competitive at ${overallRank}, despite a less effective overall roster build and ${grade}.`;
  if (input.draftQualityRank != null && input.draftQualityRank <= 6) return `A solid roster build helped ${input.teamName} finish ${overallRank} with ${grade}.`;
  return `${input.teamName} finished ${overallRank} with ${grade}, leaving room to improve the roster build and auction result.`;
}

export function buildOwnerDraftVerdict(input: OwnerDraftVerdictInput) {
  const overallRank = input.overallRank == null ? "in the league" : `No. ${input.overallRank}`;
  const strength = friendlyLabel(input.biggestStrength);
  const weakness = friendlyLabel(input.biggestWeakness);
  const strengthRank = diagnosticRank(input.biggestStrength);
  const weaknessRank = diagnosticRank(input.biggestWeakness);
  const strengthWithRank = strengthRank == null ? strength : `${strength} at No. ${strengthRank} in the league`;
  const weaknessWithRank = weaknessRank == null ? weakness : `the No. ${weaknessRank} ${weakness}`;
  let limiter = weaknessWithRank;
  if (input.overallRank != null && input.overallRank <= 3 && weaknessRank != null && weaknessRank >= 10) limiter = `${weaknessWithRank} was the primary blemish on an otherwise elite result`;
  else if (input.overallRank != null && input.overallRank >= 10) limiter = `${weaknessWithRank} left the team with room to climb`;
  else if (weaknessRank != null && weaknessRank >= 10) limiter = `${weaknessWithRank} kept the team from climbing higher`;
  else if (weaknessRank != null && weaknessRank >= 7) limiter = `${weaknessWithRank} left room to climb`;
  if (input.overallRank != null && input.overallRank >= 4 && input.overallRank <= 6 && input.startingLineupRank != null && input.startingLineupRank <= 3 && input.auctionEfficiencyRank != null && input.auctionEfficiencyRank <= 3 && input.usefulDepthRank != null && input.usefulDepthRank >= 7 && weaknessRank != null && weaknessRank >= 7) limiter = `${weaknessWithRank} and middle-of-the-pack depth kept the team out of the top tier`;
  return `${placementSentence(input, overallRank)} ${strengthWithRank} was the roster's calling card, while ${limiter}.`;
}
