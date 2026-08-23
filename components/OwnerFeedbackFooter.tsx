"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { normalizeFeedbackPagePath } from "@/lib/feedback";

export default function OwnerFeedbackFooter() {
  const pathname = usePathname();
  const feedbackFrom = normalizeFeedbackPagePath(pathname ?? "/", "/feedback");
  const feedbackHref = `/feedback?from=${encodeURIComponent(feedbackFrom)}`;

  return <footer className="border-t border-slate-200/80 bg-[#f7f8fa] px-4 py-5 text-slate-500 dark:border-white/10 dark:bg-[#0a0a0a] dark:text-white/50 sm:px-6">
    <div className="mx-auto flex max-w-7xl flex-col gap-2 text-[10px] font-bold uppercase tracking-widest sm:flex-row sm:items-center sm:justify-between">
      <span>River City FFL</span>
      <span className="flex flex-col gap-2 normal-case tracking-normal sm:flex-row sm:items-center sm:gap-3">
        <span>Found a problem or have an idea?</span>
        <Link href={feedbackHref} className="inline-flex min-h-11 items-center font-black uppercase tracking-widest text-orange-700 underline decoration-orange-300 underline-offset-4 hover:text-orange-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 dark:text-orange-300 dark:decoration-orange-700">Send feedback</Link>
      </span>
    </div>
  </footer>;
}
