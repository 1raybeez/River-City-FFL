'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Scale, Search, History, XCircle } from 'lucide-react';
import { ModeToggle } from '@/components/ModeToggle';
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot } from "firebase/firestore";
import constitutionData from '@/lib/constitutionData';
import ConstitutionSection from '@/components/ConstitutionSection';

export default function ConstitutionPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [openSections, setOpenSections] = useState<string[]>([]);
  const [liveRules, setLiveRules] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "ratified_rules"), (snapshot) => {
      const rules = snapshot.docs.map(doc => ({
        id: doc.id,
        anchor: doc.data().anchor || `rule-${doc.id}`,
        ...doc.data()
      }));
      setLiveRules(rules);
    });
    return () => unsubscribe();
  }, []);

  const combinedRules = [...constitutionData, ...liveRules];

  const toggleSection = (id: string) => {
    setOpenSections(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const clearSearch = () => {
    setSearchQuery('');
    setOpenSections([]);
  };

  // Fixed useEffect: We only depend on the query string to prevent array size errors
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
      const element = document.getElementById(matched.anchor);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [searchQuery]); // Removed combinedRules from deps to satisfy React's constant size rule

  const filteredData = combinedRules.filter(section => 
    section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.subsections?.some((sub: any) => 
      sub.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.content.some((text: string) => text.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#121212] font-sans pb-20">
      <div className="bg-white dark:bg-[#1e1e1e] border-b dark:border-white/5 pb-8 pt-4 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 text-center relative">
          <Link href="/league-info" className="absolute top-4 left-4 flex items-center gap-2 text-gray-500 hover:text-orange-600 font-bold text-xs uppercase">
            <ArrowLeft size={16} /> Hub
          </Link>
          <div className="absolute top-4 right-4"><ModeToggle /></div>
          <h1 className="text-2xl font-black uppercase tracking-tighter flex items-center justify-center gap-3 italic text-gray-900 dark:text-white">
            <Scale className="text-orange-600" /> League Constitution
          </h1>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="relative mb-8 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Search regulations..." 
            className="w-full pl-10 pr-12 py-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1e1e1e] focus:ring-2 focus:ring-orange-500 outline-none transition text-sm sm:text-base text-gray-900 dark:text-white shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={clearSearch} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-600">
              <XCircle size={20} />
            </button>
          )}
        </div>

        <div className="space-y-4">
          {filteredData.map((section) => (
            <div key={section.id} id={section.anchor} className="scroll-mt-28">
              <ConstitutionSection
                title={section.title}
                icon={section.icon}
                subsections={section.subsections}
                isOpen={openSections.includes(section.id)}
                onToggle={() => toggleSection(section.id)}
              />
            </div>
          ))}
        </div>

        <div className="text-center mt-16">
          <Link href="/history/version-history" className="text-orange-600 hover:text-orange-700 font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2">
            View Full Version History <History size={16} />
          </Link>
        </div>
      </main>
    </div>
  );
}