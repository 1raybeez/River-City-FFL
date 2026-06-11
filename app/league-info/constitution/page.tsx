'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Scale, Search, History, XCircle, 
  ChevronRight, Gavel
} from 'lucide-react';
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot } from "firebase/firestore";
import constitutionData from '@/lib/constitutionData';
import ConstitutionSection from '@/components/ConstitutionSection';

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
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-black dark:text-white transition-colors duration-300 pb-20 selection:bg-orange-500 selection:text-white">
      
      {/* NAVIGATION BAR */}
      <nav className="border-b border-black/5 dark:border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-4">
          <Link 
            href="/league-info" 
            className="inline-flex items-center gap-2 rounded-lg bg-black/5 px-3 py-2 text-[10px] font-black uppercase italic tracking-tight transition-all hover:text-orange-600 dark:bg-white/5 border border-black/10 dark:border-white/10"
          >
            <ArrowLeft size={16} />
            Back to League Info Hub
          </Link>
        </div>

        <div className="flex items-center gap-2">
           <Scale className="text-orange-600 hidden sm:block" size={20} />
           <span className="text-sm font-black uppercase italic tracking-tighter">Constitution</span>
        </div>
      </nav>

      <header className="px-6 py-12 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 shadow-lg text-orange-600">
          <Scale size={28} />
        </div>
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-600/20 bg-orange-600/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-orange-600">
          <Gavel size={10} /> Live Legislative Sync Active
        </div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic leading-none">
          <span className="text-orange-600">Constitution</span>
        </h1>
        <p className="mt-4 text-[10px] font-bold opacity-40 uppercase tracking-[0.3em]">Bylaws, Scoring & League Rules</p>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {rulesError && (
          <div className="mb-8 rounded-2xl border border-red-600/20 bg-red-600/10 px-5 py-4 text-sm font-bold text-red-700 dark:text-red-300">
            {rulesError}
          </div>
        )}

        {/* SEARCH BAR */}
        <div className="relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-black/20 dark:text-white/20 group-focus-within:text-orange-600 transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Search regulations (e.g. 'Trade', 'Scoring')..." 
            className="w-full pl-14 pr-12 py-5 rounded-[2rem] border border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5 focus:bg-white dark:focus:bg-white/10 focus:ring-4 focus:ring-orange-600/10 outline-none transition-all text-base font-medium shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={clearSearch} className="absolute right-5 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100 hover:text-orange-600 transition-all">
              <XCircle size={24} />
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
        <div className="space-y-6">
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
        </div>

        {/* FOOTER ACTION */}
        <div className="mt-20 pt-10 border-t border-black/5 dark:border-white/10 text-center">
          <Link href="/history/version-history" className="group inline-flex items-center gap-3 px-8 py-4 rounded-full bg-orange-600 text-white font-black uppercase text-xs tracking-widest shadow-lg shadow-orange-900/40 hover:scale-105 transition-all">
            Version History <History size={16} /> <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </main>
    </div>
  );
}
