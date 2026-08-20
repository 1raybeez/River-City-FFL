export type LeagueInfoSection =
  | 'overview'
  | 'constitution'
  | 'legislation'
  | 'history'
  | 'rivalries'
  | 'draft'
  | 'analyzer'
  | 'resources';

export type LeagueInfoSectionItem = {
  id: LeagueInfoSection;
  label: string;
  href: string;
};

export const LEAGUE_INFO_SECTION_ITEMS: readonly LeagueInfoSectionItem[] = [
  { id: 'overview', label: 'Overview', href: '/league-info' },
  { id: 'constitution', label: 'Constitution', href: '/league-info/constitution' },
  { id: 'legislation', label: 'Legislation', href: '/league-info/legislative' },
  { id: 'history', label: 'History', href: '/history' },
  { id: 'rivalries', label: 'Rivalries', href: '/league-info/rivalries' },
  { id: 'draft', label: 'Draft', href: '/league-info/draft' },
  { id: 'analyzer', label: 'Trade Analyzer', href: '/league-info/analyzer' },
  { id: 'resources', label: 'Resources', href: '/league-info/resources' },
] as const;

const ROUTE_MAPPINGS: readonly { section: LeagueInfoSection; exact?: string; prefix?: string }[] = [
  { section: 'constitution', exact: '/history/version-history' },
  { section: 'history', exact: '/history' },
  { section: 'overview', exact: '/league-info' },
  { section: 'overview', exact: '/league-info/payouts' },
  { section: 'history', exact: '/league-info/archives' },
  { section: 'history', exact: '/league-info/trophy-room' },
  { section: 'constitution', exact: '/league-info/constitution' },
  { section: 'constitution', prefix: '/league-info/constitution/' },
  { section: 'legislation', prefix: '/league-info/legislative/' },
  { section: 'legislation', exact: '/league-info/legislative' },
  { section: 'rivalries', prefix: '/league-info/rivalries/' },
  { section: 'rivalries', exact: '/league-info/rivalries' },
  { section: 'draft', prefix: '/league-info/draft/' },
  { section: 'draft', exact: '/league-info/draft' },
  { section: 'analyzer', prefix: '/league-info/analyzer/' },
  { section: 'analyzer', exact: '/league-info/analyzer' },
  { section: 'resources', prefix: '/league-info/resources/' },
  { section: 'resources', exact: '/league-info/resources' },
] as const;

export function getLeagueInfoSectionForPath(pathname: string): LeagueInfoSection {
  const normalizedPath = pathname.replace(/\/$/, '') || '/';
  const mapping = ROUTE_MAPPINGS.find(({ exact, prefix }) => exact === normalizedPath || (prefix && normalizedPath.startsWith(prefix)));
  return mapping?.section ?? 'overview';
}

export function isLeagueInfoDestination(pathname: string): boolean {
  return pathname === '/history' || pathname.startsWith('/history/') || pathname === '/league-info' || pathname.startsWith('/league-info/');
}
