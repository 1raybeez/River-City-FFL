export function generateVerdict(summaries: {
  managerName: string | null;
  netSurplus: number;
  faabNet: number;
}[]): string {
  if (summaries.length < 2) return "Not enough teams to evaluate trade fairness.";

  const totals = summaries.map((s) => ({
    name: s.managerName ?? `Team`,
    net: s.netSurplus + s.faabNet
  }));

  const sorted = [...totals].sort((a, b) => b.net - a.net);
  const winner = sorted[0];
  const loser = sorted[sorted.length - 1];
  const spread = winner.net - loser.net;

  let tone = "";
  if (spread < 10) {
    tone = `This trade is pretty balanced. Slight edge to ${winner.name}.`;
  } else if (spread < 20) {
    tone = `${winner.name} comes out ahead here. ${loser.name} gives up more than they get.`;
  } else if (spread < 30) {
    tone = `${winner.name} wins this trade clean (+${winner.net.toFixed(1)}). ${loser.name} takes a hit (–${loser.net.toFixed(1)}).`;
  } else {
    tone = `${winner.name} absolutely bodies this trade (+${winner.net.toFixed(1)}). ${loser.name} might need a hug (–${loser.net.toFixed(1)}).`;
  }

  return tone;
}
