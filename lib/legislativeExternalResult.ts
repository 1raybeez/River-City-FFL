export function resolveExternalLegislativeResult(yes: number, no: number) {
  return yes === no ? "tied" : yes > no ? "passed" : "failed";
}
