'use client';

import React from 'react';
import Link from 'next/link';
import { 
  ChevronDown, ChevronUp, AlertCircle, CheckCircle2, 
  Gavel, Flag, Scale, Clipboard, ArrowLeftRight, 
  Hammer, Calendar, Trophy, MessageSquare, DollarSign, 
  History, ExternalLink 
} from 'lucide-react';

const IconMap: Record<string, React.ReactNode> = {
  gavel: <Gavel size={20} />,
  flag: <Flag size={20} />,
  scale: <Scale size={20} />,
  clipboard: <Clipboard size={20} />,
  'clipboard-list': <Clipboard size={20} />,
  arrows: <ArrowLeftRight size={20} />,
  zap: <ArrowLeftRight size={20} />,
  hammer: <Hammer size={20} />,
  calendar: <Calendar size={20} />,
  trophy: <Trophy size={20} />,
  balance: <Scale size={20} />,
  handshake: <Scale size={20} />,
  chat: <MessageSquare size={20} />,
  'message-square': <MessageSquare size={20} />,
  dollar: <DollarSign size={20} />,
  'dollar-sign': <DollarSign size={20} />,
  history: <History size={20} />
};

interface Subsection {
  id: string;
  title: string;
  content: string[];
  type?: 'standard' | 'loophole' | 'sleeper' | 'alert';
}

interface Props {
  title: string;
  icon: string;
  subsections?: Subsection[];
  isOpen: boolean; // Managed by parent now
  onToggle: () => void; // Managed by parent now
  amendmentCount?: number;
}

export default function ConstitutionSection({ title, icon, subsections, isOpen, onToggle, amendmentCount = 0 }: Props) {
  
  const renderContentWithLinks = (text: string) => {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      parts.push(
        <Link 
          key={match.index} 
          href={match[2]} 
          className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-700 font-bold underline decoration-orange-500/30 underline-offset-4 transition-colors px-1 rounded hover:bg-orange-50 dark:hover:bg-orange-900/20"
        >
          {match[1]} <ExternalLink size={12} />
        </Link>
      );
      lastIndex = linkRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    return parts.length > 0 ? parts : text;
  };

  return (
    <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm transition-all hover:border-orange-500/30">
      <button 
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 sm:p-6 text-left hover:bg-gray-50 dark:hover:bg-white/5 transition"
      >
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="p-1.5 sm:p-2 bg-gray-100 dark:bg-black/20 rounded-lg shrink-0 text-orange-600">
            {IconMap[icon] || <Gavel size={20} />}
          </div>
          <h3 className="text-sm sm:text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">{title}</h3>
          {amendmentCount > 0 && (
            <span className="rounded-full border border-orange-600/20 bg-orange-600/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-orange-600">
              {amendmentCount} Amendment{amendmentCount === 1 ? '' : 's'}
            </span>
          )}
        </div>
        {isOpen ? <ChevronUp className="text-gray-400" size={18}/> : <ChevronDown className="text-gray-400" size={18}/>}
      </button>

      {isOpen && (
        <div className="px-4 sm:px-8 pb-8 pt-2 border-t dark:border-white/10 bg-gray-50/30 dark:bg-black/10 animate-in slide-in-from-top-2 duration-200">
          <div className="space-y-8 mt-4">
            {subsections?.map((sub) => (
              <div key={sub.id} id={`constitution-subsection-${sub.id}`} className="scroll-mt-32">
                {(sub.type === 'loophole' || sub.type === 'alert') ? (
                  <div className="p-5 bg-yellow-50 dark:bg-yellow-900/10 rounded-xl border border-yellow-100 dark:border-yellow-800/30 shadow-sm">
                    <h5 className="font-black text-xs sm:text-sm text-yellow-800 dark:text-yellow-500 uppercase flex items-center gap-2 mb-3">
                      <AlertCircle size={14} /> {sub.title}
                    </h5>
                    <div className="space-y-2">
                      {sub.content.map((line, i) => (
                        <p key={i} className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed italic">• {renderContentWithLinks(line)}</p>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <h4 className="font-black text-sm sm:text-base text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                      {sub.title}
                      {sub.type === 'sleeper' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-600 border border-blue-200 uppercase">
                          <CheckCircle2 size={10} /> Sleeper Setting
                        </span>
                      )}
                    </h4>
                    <div className="space-y-2 pl-4 border-l-2 border-gray-100 dark:border-white/5">
                      {sub.content.map((line, i) => (
                        <p key={i} className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed italic">{renderContentWithLinks(line)}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
