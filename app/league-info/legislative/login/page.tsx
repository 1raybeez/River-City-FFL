'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FirebaseError } from 'firebase/app';
import { signInWithPopup } from 'firebase/auth';
import { ArrowLeft, Lock } from 'lucide-react';
import SiteShell from '@/components/SiteShell';
import { auth, googleAuthProvider } from '@/lib/firebase';

function LoginContent() {
  const router = useRouter(); const params = useSearchParams(); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const signIn = async () => { setBusy(true); setError(null); try { const credential = await signInWithPopup(auth, googleAuthProvider); const idToken = await credential.user.getIdToken(); const response = await fetch('/api/auth/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) }); const payload = (await response.json()) as { success?: boolean; error?: string }; if (!response.ok || !payload.success) throw new Error(payload.error ?? 'That Google account is not an approved River City owner.'); const returnTo = params.get('returnTo'); router.replace(returnTo?.startsWith('/league-info/legislative') && !returnTo.startsWith('//') ? returnTo : '/league-info/legislative'); router.refresh(); } catch (loginError) { setError(loginError instanceof FirebaseError && loginError.code === 'auth/popup-closed-by-user' ? 'Google sign-in was closed before it finished.' : loginError instanceof Error ? loginError.message : 'Unable to sign in.'); } finally { setBusy(false); } };
  return <SiteShell><main className="mx-auto flex min-h-[calc(100vh-80px)] max-w-xl flex-col justify-center px-4 py-12 sm:px-6"><Link href="/league-info/legislative" className="mb-5 inline-flex min-h-10 items-center gap-2 text-xs font-black uppercase tracking-widest text-orange-700 hover:underline"><ArrowLeft size={15} /> Legislative Hub</Link><section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8"><p className="text-xs font-black uppercase tracking-[0.18em] text-orange-600">River City Legislative Hub</p><h1 className="mt-2 text-3xl font-black italic uppercase tracking-tight text-slate-950">Owner sign in</h1><p className="mt-4 text-sm leading-6 text-slate-600">Sign in with your approved Google account to submit proposals and vote as yourself.</p>{error && <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</p>}<button type="button" onClick={signIn} disabled={busy} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-60"><Lock size={15} /> {busy ? 'Signing in...' : 'Sign in with Google'}</button></section></main></SiteShell>;
}

export default function LegislativeLoginPage() { return <Suspense fallback={null}><LoginContent /></Suspense>; }
