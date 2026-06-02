'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useTheme } from "next-themes";
import { 
  Home, Scale, Search, History, XCircle, 
  Sun, Moon, Monitor, ChevronRight, Gavel
} from 'lucide-react';
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot } from "firebase/firestore";
import constitutionData from '@/lib/constitutionData';
import ConstitutionSection from '@/components/ConstitutionSection';

export default function ConstitutionPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openSections, setOpenSections] = useState<string[]>([]);
  const [liveRules, setLiveRules] = useState<any[]>([]);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Listen for Ratified Rule Changes from the Legislative Hub
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "ratified_rules"), (snapshot) => {
      const rules = snapshot.docs.map(doc => ({
        id: doc.id,
        // We expect a 'sectionId' field to match against constitutionData (e.g., "1.4")
        sectionId: doc.data().sectionId || doc.id, 
        ...doc.data()
      }));
      setLiveRules(rules);
    });
    return () => unsubscribe();
  }, []);

  /**
   * 2. THE LOGIC BRIDGE:
   * This merges your static bylaws with the live votes. 
   * If Section 1.4 or 4.3 exists in Firebase, it overrides the static text.
   */
  const combinedRules = useMemo(() => {
    // Create a lookup map for live rules
    const liveMap = liveRules.reduce((acc, rule) => {
      acc[rule.sectionId] = rule;
      return acc;
    }, {} as Record<string, any>);

    return constitutionData.map(section => {
      // Check if this top-level section has a live override
      const sectionOverride = liveMap[section.id];
      
      // Also check if any SUBSECTIONS have overrides (e.g. 1.4 inside 1.0)
      const updatedSubsections = section.subsections?.map(sub => {
        const subOverride = liveMap[sub.id];
        if (subOverride) {
          return {
            ...sub,
            content: subOverride.content || sub.content,
            title: subOverride.title || sub.title,
            isRatified: true // Flag to show "New Law" UI if needed
          };
        }
        return sub;
      });

      return {
        ...section,
        subsections: updatedSubsections,
        // Override top-level content if applicable
        content: sectionOverride?.content || section.content,
        isRatified: !!sectionOverride
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

  // Auto-scroll and expand on search match
  useEffect(() => {
    if (searchQuery.length < 3) return;
    const q = searchQuery.toLowerCase();
    
    const matched = combinedRules.find(section => 
      section.title.toLowerCase().includes(q) ||
      section.subsections?.some((sub: any) => 
        sub.title.toLowerCase().includes(q) || 
        sub.content.some((text: string) => text.toLowerCase().includes(q))
      )
    );

    if (matched) {
      if (!openSections.includes(matched.id)) {
        setOpenSections(prev => [...new Set([...prev, matched.id])]);
      }
      const element = document.getElementById(matched.anchor || matched.id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [searchQuery, combinedRules]);

  const filteredData = combinedRules.filter(section => 
    section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.subsections?.some((sub: any) => 
      sub.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.content.some((text: string) => text.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  );

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-black dark:text-white transition-colors duration-300 pb-20 selection:bg-orange-500 selection:text-white">
      
      {/* NAVIGATION BAR */}
      <nav className="border-b border-black/5 dark:border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-4">
          <Link 
            href="/league-info" 
            className="p-2 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:scale-105 transition-all"
          >
            <Home size={18} />
          </Link>
          
          <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-lg border border-black/10 dark:border-white/10">
            <button onClick={() => setTheme('light')} className={`p-1.5 rounded-md transition-all ${theme === 'light' ? 'bg-white text-black shadow-sm' : 'opacity-40'}`}><Sun size={14} /></button>
            <button onClick={() => setTheme('dark')} className={`p-1.5 rounded-md transition-all ${theme === 'dark' ? 'bg-white/10 text-white shadow-sm' : 'opacity-40'}`}><Moon size={14} /></button>
            <button onClick={() => setTheme('system')} className={`p-1.5 rounded-md transition-all ${theme === 'system' ? 'bg-white/10 text-white shadow-sm' : 'opacity-40'}`}><Monitor size={14} /></button>
          </div>
        </div>

        <div className="flex items-center gap-2">
           <Scale className="text-orange-600 hidden sm:block" size={20} />
           <span className="text-sm font-black uppercase italic tracking-tighter">Constitution</span>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <header className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-600/10 border border-orange-600/20 text-orange-600 text-[9px] font-black uppercase tracking-widest mb-4">
              <Gavel size={10} /> Live Legislative Sync Active
            </div>
            <h1 className="text-5xl font-black uppercase italic tracking-tighter mb-4">League Bylaws</h1>
            <p className="text-[10px] font-bold opacity-40 uppercase tracking-[0.3em]">Last Update Refreshed: {new Date().toLocaleDateString()}</p>
        </header>

        {/* SEARCH BAR */}
        <div className="relative mb-12 group">
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

        {/* REGULATION SECTIONS */}
        <div className="space-y-6">
          {filteredData.length > 0 ? (
            filteredData.map((section) => (
              <div key={section.id} id={section.anchor || section.id} className="scroll-mt-32">
                <ConstitutionSection
                  title={section.title}
                  icon={section.icon}
                  subsections={section.subsections}
                  isOpen={openSections.includes(section.id)}
                  onToggle={() => toggleSection(section.id)}
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