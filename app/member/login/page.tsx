'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FirebaseError } from 'firebase/app';
import { signInWithPopup } from 'firebase/auth';
import { ArrowLeft, Lock } from 'lucide-react';
import { ModeToggle } from '@/components/ModeToggle';
import { auth, googleAuthProvider } from '@/lib/firebase';
import { getSafeReturnTo } from '@/lib/auth/safeReturnTo';

type SessionResponse = { success?: boolean; error?: string };

function getFriendlyAuthError(error: unknown) {
  if (error instanceof FirebaseError) {
    if (error.code === 'auth/popup-closed-by-user') return 'Google sign-in was closed before it finished.';
    if (error.code === 'auth/popup-blocked') return 'Your browser blocked the Google sign-in window.';
  }
  if (error instanceof Error) return error.message;
  return 'Unable to sign in. Try again in a moment.';
}

function MemberLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const signInWithGoogle = async () => {
    setIsSigningIn(true);
    setErrorMessage(null);

    try {
      const credential = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await credential.user.getIdToken();
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const payload = (await response.json()) as SessionResponse;

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? 'That Google account is not an approved River City member.');
      }

      router.replace(getSafeReturnTo(searchParams.get('returnTo')));
      router.refresh();
    } catch (error) {
      setErrorMessage(getFriendlyAuthError(error));
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#071525] px-4 pb-20 font-sans text-white sm:px-6">
      <nav className="mx-auto flex max-w-5xl items-center justify-between border-b border-white/10 py-4">
        <Link href="/" className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-white/70 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
        <ModeToggle />
      </nav>
      <main className="mx-auto flex min-h-[calc(100vh-88px)] max-w-xl items-center justify-center py-12">
        <section className="w-full rounded-3xl border border-white/15 bg-white p-6 text-slate-950 shadow-2xl sm:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-600">River City FFL</p>
          <h1 className="mt-3 text-4xl font-black uppercase italic leading-none tracking-tighter sm:text-5xl">League Member Login</h1>
          <p className="mt-5 text-sm leading-6 text-slate-600">Sign in to access member-only features such as your War Room, voting, and private league information.</p>
          {errorMessage && <p role="alert" className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{errorMessage}</p>}
          <button type="button" onClick={signInWithGoogle} disabled={isSigningIn} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl bg-orange-600 px-5 py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg transition hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-300 disabled:cursor-not-allowed disabled:opacity-60">
            <Lock className="h-4 w-4" />
            {isSigningIn ? 'Signing in...' : 'Sign in with Google'}
          </button>
        </section>
      </main>
    </div>
  );
}

export default function MemberLoginPage() {
  return <Suspense fallback={null}><MemberLoginContent /></Suspense>;
}
