export type SiteNavItem = {
  label: string;
  href: string;
  match: "exact" | "section";
};

export const PRIMARY_SITE_NAV_ITEMS = [
  { label: "Home", href: "/", match: "exact" },
  { label: "Matchups", href: "/matchups", match: "exact" },
  { label: "Managers", href: "/managers", match: "section" },
  { label: "League Info", href: "/league-info", match: "section" },
] as const satisfies readonly SiteNavItem[];

export const MOBILE_SITE_NAV_ITEMS = [
  ...PRIMARY_SITE_NAV_ITEMS,
  { label: "Power Rankings", href: "/predictor", match: "exact" },
] as const satisfies readonly SiteNavItem[];

export function isSiteNavItemActive(item: SiteNavItem, pathname: string) {
  if (item.match === "exact") return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
