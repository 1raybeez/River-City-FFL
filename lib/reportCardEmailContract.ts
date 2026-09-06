export const REPORT_CARD_PRODUCTION_ORIGIN = "https://river-city-ffl.web.app";
export const REPORT_CARD_OVERVIEW_HREF = `${REPORT_CARD_PRODUCTION_ORIGIN}/league-info/draft-report/overview`;
export const REPORT_CARD_PERSONAL_HREF = `${REPORT_CARD_PRODUCTION_ORIGIN}/league-info/draft-report`;
export const REPORT_CARD_EMAIL_SUBJECT = "2026 River City Draft Report Cards Are Live";

export type RecipientResolutionStatus = "READY" | "MISSING_EMAIL" | "AMBIGUOUS" | "DUPLICATE_EMAIL" | "INTEGRITY_ERROR";

export type ReportCardEmailRecipient = {
  ownerId: string;
  ownerName: string;
  email: string | null;
};

export type ReportCardEmailAuditRow = {
  franchiseId: string;
  teamName: string;
  owners: ReportCardEmailRecipient[];
  reportCardHref: string;
  status: RecipientResolutionStatus;
  warning: string | null;
};

export function buildReportCardEmailContent(rows: ReadonlyArray<{ teamName: string; draftGrade: string | null; draftScore: number | null }>) {
  const ranked = rows.filter((row) => row.draftScore !== null).slice().sort((a, b) => b.draftScore! - a.draftScore!);
  const top = ranked[0];
  const bottom = ranked.at(-1);
  const teaser = top && bottom
    ? `Top of the class:\n${top.teamName} — ${top.draftGrade ?? "N/A"} (${top.draftScore!.toFixed(2)})\n\nSomebody had to finish last:\n${bottom.teamName} — ${bottom.draftGrade ?? "N/A"} (${bottom.draftScore!.toFixed(2)})`
    : "The 2026 league report-card results are ready to review.";
  const text = `River City FFL\n\nGentlemen,\n\nThe computers have crunched the numbers, judged our questionable financial decisions, and officially handed out the 2026 River City Draft Report Cards.\n\n${teaser}\n\nSee how all 12 teams graded out, then sign in to check out your full personal report card — including where you nailed the draft, where you reached, roster construction, value, budget management, and more.\n\nView the 2026 Draft Report Cards: ${REPORT_CARD_OVERVIEW_HREF}\n\nAs always, complaints about your grade may be submitted directly to the algorithm. I'm sure it'll care.\n\n— Ray\nRiver City Commissioner`;
  const html = `<div style="background:#f8fafc;color:#071a33;font-family:Arial,sans-serif;line-height:1.6;margin:0;padding:32px 16px"><div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;margin:0 auto;max-width:600px;padding:32px"><p style="color:#ea580c;font-size:12px;font-weight:700;letter-spacing:2px;margin:0 0 16px;text-transform:uppercase">River City FFL</p><h1 style="font-size:28px;line-height:1.15;margin:0 0 24px">2026 Draft Report Cards Are Live</h1><p>Gentlemen,</p><p>The computers have crunched the numbers, judged our questionable financial decisions, and officially handed out the 2026 River City Draft Report Cards.</p><p><strong>Top of the class:</strong><br />${top ? `${top.teamName} — ${top.draftGrade ?? "N/A"} (${top.draftScore!.toFixed(2)})` : "The results are ready to review."}<br /><br /><strong>Somebody had to finish last:</strong><br />${bottom ? `${bottom.teamName} — ${bottom.draftGrade ?? "N/A"} (${bottom.draftScore!.toFixed(2)})` : "The results are ready to review."}</p><p>See how all 12 teams graded out, then sign in to check out your full personal report card — including where you nailed the draft, where you reached, roster construction, value, budget management, and more.</p><p style="margin:28px 0;text-align:center"><a href="${REPORT_CARD_OVERVIEW_HREF}" style="background:#ea580c;border-radius:8px;color:#ffffff;display:inline-block;font-weight:700;padding:14px 22px;text-decoration:none">View the 2026 Draft Report Cards</a></p><p>As always, complaints about your grade may be submitted directly to the algorithm. I'm sure it'll care.</p><p>— Ray<br />River City Commissioner</p></div></div>`;
  return { subject: REPORT_CARD_EMAIL_SUBJECT, text, html };
}
