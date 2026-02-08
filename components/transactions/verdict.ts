export function generateVerdict(
  summaries: {
    managerName: string | null;
    netSurplus: number;
    faabNet: number;
  }[]
): string {
  if (!summaries || summaries.length < 2) {
    return "Not enough teams to evaluate trade fairness.";
  }

  // Compute totals
  const totals = summaries.map((s, i) => ({
    index: i,
    name: s.managerName ?? `Team ${i + 1}`,
    net: s.netSurplus + s.faabNet
  }));

  // Sort by net gain
  const sorted = [...totals].sort((a, b) => b.net - a.net);

  const topNet = sorted[0].net;
  const bottomNet = sorted[sorted.length - 1].net;
  const spread = topNet - bottomNet;

  // Identify winners (teams tied for top)
  const winners = sorted.filter((t) => t.net === topNet);
  const losers = sorted.filter((t) => t.net === bottomNet);

  const winnerNames = winners.map((w) => w.name).join(", ");
  const loserNames = losers.map((l) => l.name).join(", ");

  // Perfectly balanced
  if (spread <= 5) {
    return "This trade is perfectly balanced. No winners, no losers — just clean business.";
  }

  // Slight edge
  if (spread <= 15) {
    return `Slight edge to ${winnerNames}, but nothing that’ll make the group chat explode.`;
  }

  // Noticeable advantage
  if (spread <= 30) {
    return `${winnerNames} clearly come out ahead here. Not a fleece, but definitely a win.`;
  }

  // Borderline robbery
  if (spread <= 60) {
    return `${winnerNames} should be investigated by the league office. This is bordering on a heist.`;
  }

  // Full-blown fleecing
  return `${winnerNames} committed a felony on the trade block. ${loserNames} might need emotional support after this one.`;
}
