'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Search, History, XCircle,
  ChevronRight, Gavel
} from 'lucide-react';
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot } from "firebase/firestore";
import constitutionData from '@/lib/constitutionData';
import ConstitutionSection from '@/components/ConstitutionSection';
import SiteShell from '@/components/SiteShell';

type RatifiedRule = {
  id: string;
  proposalId: string;
  sectionId: string;
  title: string;
  content: string[];
  passedAt: string;
  voteTotals: {
    yes: number;
    no: number;
  };
};

type SearchResult = {
  id: string;
  sectionId: string;
  sectionTitle: string;
  subsectionId?: string;
  subsectionTitle?: string;
  matchType: 'Section' | 'Subsection' | 'Rule Text';
  snippet: string;
};

function getRatifiedRuleContent(rule: RatifiedRule) {
  return rule.content;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text;

  const regex = new RegExp(`(${escapeRegExp(query.trim())})`, 'ig');
  const exactMatch = new RegExp(`^${escapeRegExp(query.trim())}$`, 'i');
  return text.split(regex).map((part, index) => (
    exactMatch.test(part) ? (
      <mark key={`${part}-${index}`} className="rounded bg-orange-500/20 px-1 text-orange-700 dark:text-orange-300">
        {part}
      </mark>
    ) : part
  ));
}

export default function ConstitutionPage() {
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openSections, setOpenSections] = useState<string[]>([]);
  const [liveRules, setLiveRules] = useState<RatifiedRule[]>([]);
  const [rulesError, setRulesError] = useState<string | null>(null);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Listen for Ratified Rule Changes from the Legislative Hub
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "ratified_rules"),
      (snapshot) => {
        const rules = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            proposalId: data.proposalId,
            sectionId: data.sectionId,
            title: data.title,
            content: Array.isArray(data.content) ? data.content : [],
            passedAt: data.passedAt,
            voteTotals: data.voteTotals ?? { yes: 0, no: 0 },
          };
        });
        setLiveRules(rules);
        setRulesError(null);
      },
      (error) => {
        console.error("Ratified rules listener failed:", error);
        setRulesError("Live ratified rules could not be loaded. Check Firestore read permissions for ratified_rules.");
      }
    );
    return () => unsubscribe();
  }, []);

  const amendmentCountsBySection = useMemo(() => {
    return constitutionData.reduce((acc, section) => {
      const subsectionIds = new Set(section.subsections?.map((sub) => sub.id) ?? []);
      const count = liveRules.filter(
        (rule) => rule.sectionId === section.id || subsectionIds.has(rule.sectionId)
      ).length;

      if (count > 0) acc[section.id] = count;
      return acc;
    }, {} as Record<string, number>);
  }, [liveRules]);

  /**
   * 2. THE LOGIC BRIDGE:
   * This merges your static bylaws with ratified amendments.
   * Matching subsection amendments append to the static text.
   * Matching top-level section amendments are added as generated subsections.
   */
  const combinedRules = useMemo(() => {
    const rulesBySectionId = liveRules.reduce((acc, rule) => {
      if (!rule.sectionId) return acc;
      acc[rule.sectionId] = [...(acc[rule.sectionId] ?? []), rule];
      return acc;
    }, {} as Record<string, RatifiedRule[]>);

    return constitutionData.map(section => {
      const sectionAmendments = rulesBySectionId[section.id] ?? [];
      
      const updatedSubsections = section.subsections?.map(sub => {
        const subAmendments = rulesBySectionId[sub.id] ?? [];

        if (subAmendments.length === 0) return sub;

        return {
          ...sub,
          content: [
            ...sub.content,
            ...subAmendments.flatMap(getRatifiedRuleContent),
          ],
        };
      }) ?? [];

      const generatedAmendmentSubsections = sectionAmendments.map((rule) => ({
        id: `${section.id}-ratified-${rule.proposalId}`,
        title: `${rule.sectionId} Additional Rule`,
        content: getRatifiedRuleContent(rule),
      }));

      return {
        ...section,
        subsections: [
          ...updatedSubsections,
          ...generatedAmendmentSubsections,
        ],
      };
    });
  }, [liveRules]);

  const toggleSection = (id: string) => {
    setOpenSections(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const clearSearch = () => {
    setSearchQuery('');
    setOpenSections([]);
  };

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const isSearchActive = normalizedSearchQuery.length >= 3;

  const searchResults = useMemo(() => {
    if (!isSearchActive) return [];

    const results: SearchResult[] = [];

    combinedRules.forEach((section) => {
      if (section.title.toLowerCase().includes(normalizedSearchQuery)) {
        results.push({
          id: `${section.id}-section`,
          sectionId: section.id,
          sectionTitle: section.title,
          matchType: 'Section',
          snippet: section.title,
        });
      }

      section.subsections?.forEach((sub: any) => {
        if (sub.title.toLowerCase().includes(normalizedSearchQuery)) {
          results.push({
            id: `${section.id}-${sub.id}-subsection`,
            sectionId: section.id,
            sectionTitle: section.title,
            subsectionId: sub.id,
            subsectionTitle: sub.title,
            matchType: 'Subsection',
            snippet: sub.title,
          });
        }

        const matchingLine = sub.content.find((text: string) => text.toLowerCase().includes(normalizedSearchQuery));
        if (matchingLine) {
          results.push({
            id: `${section.id}-${sub.id}-content`,
            sectionId: section.id,
            sectionTitle: section.title,
            subsectionId: sub.id,
            subsectionTitle: sub.title,
            matchType: 'Rule Text',
            snippet: matchingLine,
          });
        }
      });
    });

    return results;
  }, [combinedRules, isSearchActive, normalizedSearchQuery]);

  const scrollToResult = (result: SearchResult) => {
    setOpenSections(prev => prev.includes(result.sectionId) ? prev : [...prev, result.sectionId]);

    window.setTimeout(() => {
      const targetId = result.subsectionId
        ? `constitution-subsection-${result.subsectionId}`
        : `constitution-section-${result.sectionId}`;
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 0);
  };

  // Auto-open the first matching section once search is active.
  useEffect(() => {
    if (!isSearchActive || searchResults.length === 0) return;

    const firstSectionId = searchResults[0].sectionId;
    if (firstSectionId) {
      setOpenSections(prev => prev.includes(firstSectionId) ? prev : [...prev, firstSectionId]);
    }
  }, [isSearchActive, searchResults]);

  const filteredData = isSearchActive ? combinedRules.filter(section => 
    section.title.toLowerCase().includes(normalizedSearchQuery) ||
    section.subsections?.some((sub: any) => 
      sub.title.toLowerCase().includes(normalizedSearchQuery) ||
      sub.content.some((text: string) => text.toLowerCase().includes(normalizedSearchQuery))
    )
  ) : combinedRules;

  if (!mounted) return null;

  return (
    <SiteShell activePath="/league-info">
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8" aria-labelledby="constitution-title">
          <Link href="/league-info" className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 transition hover:text-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2">
            <ArrowLeft size={14} aria-hidden="true" /> Back to League Info
          </Link>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-orange-600">League Info</p>
          <h1 id="constitution-title" className="mt-2 font-sans text-4xl font-black italic uppercase tracking-tight text-slate-950 sm:text-5xl">River City Constitution</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">Bylaws, scoring, trade rules, and approved amendments for River City FFL.</p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-orange-700"><Gavel size={12} aria-hidden="true" /> Live legislative sync active</p>
        </section>
        {rulesError && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700" role="alert">
            {rulesError}
          </div>
        )}

        {/* SEARCH BAR */}
        <div className="relative group mt-6 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <label htmlFor="constitution-search" className="sr-only">Search Constitution rules</label>
          <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-600 transition-colors" size={20} aria-hidden="true" />
          <input 
            id="constitution-search"
            type="text" 
            placeholder="Search regulations (e.g. 'Trade', 'Scoring')..." 
            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-12 text-base font-medium text-slate-900 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-600/20"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button type="button" aria-label="Clear Constitution search" onClick={clearSearch} className="absolute right-6 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:text-orange-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600">
              <XCircle size={22} aria-hidden="true" />
            </button>
          )}
        </div>

        {searchQuery && (
          <div className="mt-4 mb-8 text-center">
            {isSearchActive ? (
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-600">
                {searchResults.length > 0 ? `${searchResults.length} matches found` : 'No rules found'}
              </p>
            ) : (
              <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30">
                Type at least 3 characters to search rules
              </p>
            )}
          </div>
        )}

        {isSearchActive && searchResults.length > 0 && (
          <div className="mb-10 space-y-3">
            {searchResults.map((result) => (
              <button
                key={result.id}
                onClick={() => scrollToResult(result)}
                className="w-full rounded-2xl border border-black/5 bg-black/[0.03] px-5 py-4 text-left transition-all hover:border-orange-500/30 hover:bg-orange-500/5 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-orange-500/10"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-orange-600/20 bg-orange-600/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-widest text-orange-600">
                    {result.matchType}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-40">
                    {result.subsectionTitle ? result.subsectionTitle : result.sectionTitle}
                  </span>
                </div>
                {result.subsectionTitle && (
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest opacity-30">
                    {result.sectionTitle}
                  </p>
                )}
                <p className="text-sm font-semibold leading-relaxed text-gray-700 dark:text-gray-300">
                  {highlightMatch(result.snippet, searchQuery)}
                </p>
              </button>
            ))}
          </div>
        )}

        {/* REGULATION SECTIONS */}
        <section className="mt-6 space-y-4" aria-labelledby="constitution-sections-title">
          <h2 id="constitution-sections-title" className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Constitution sections</h2>
          {filteredData.length > 0 ? (
            filteredData.map((section) => (
              <div key={section.id} id={`constitution-section-${section.id}`} className="scroll-mt-32">
                <ConstitutionSection
                  title={section.title}
                  icon={section.icon}
                  subsections={section.subsections}
                  isOpen={openSections.includes(section.id)}
                  onToggle={() => toggleSection(section.id)}
                  amendmentCount={amendmentCountsBySection[section.id] ?? 0}
                />
              </div>
            ))
          ) : (
            <div className="text-center py-20 opacity-30 border-2 border-dashed border-black/10 dark:border-white/10 rounded-[2.5rem]">
              <Search size={48} className="mx-auto mb-4" />
              <p className="font-black uppercase italic">No Regulations Found</p>
            </div>
          )}
        </section>

        {/* FOOTER ACTION */}
        <div className="mt-12 border-t border-slate-200 pt-8 text-center">
          <Link href="/history/version-history" className="group inline-flex items-center gap-3 rounded-lg bg-orange-600 px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-sm transition hover:bg-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2">
            Version History <History size={16} /> <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </main>
    </SiteShell>
  );
}
