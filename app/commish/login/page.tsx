'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FirebaseError } from 'firebase/app';
import { signInWithPopup } from 'firebase/auth';
import { ArrowLeft, Lock, Shield } from 'lucide-react';
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

function CommissionerLoginContent() {
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
        throw new Error(payload.error ?? 'That Google account is not authorized for the Commissioner Hub.');
      }
      const requestedReturnTo = getSafeReturnTo(searchParams.get('returnTo'));
      const returnTo = requestedReturnTo.startsWith('/commish') ? requestedReturnTo : '/commish';
      router.replace(returnTo);
      router.refresh();
    } catch (error) {
      setErrorMessage(getFriendlyAuthError(error));
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-white pb-20 font-sans text-black dark:bg-[#0a0a0a] dark:text-white">
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-black/5 bg-white/80 px-6 py-4 backdrop-blur-md dark:border-white/10 dark:bg-[#0a0a0a]/80">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 transition-colors hover:text-orange-600 dark:text-gray-400">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
        <ModeToggle />
      </nav>
      <main className="mx-auto flex min-h-[calc(100vh-88px)] max-w-xl flex-col justify-center px-6 py-12">
        <section className="rounded-3xl border border-black/10 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-[#121212] sm:p-8">
          <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-lg">
              <Shield className="h-7 w-7" />
            </div>
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.25em] text-orange-600">Private Access</p>
              <h1 className="text-4xl font-black uppercase italic leading-none tracking-tighter sm:text-5xl">River City Commissioner Hub</h1>
            </div>
          </div>
          <div className="mb-6 rounded-2xl border border-orange-600/20 bg-orange-600/10 px-4 py-3 text-orange-700 dark:text-orange-300">
            <p className="text-[10px] font-black uppercase tracking-widest">Sign in with your authorized commissioner account to access league administration.</p>
          </div>
          {errorMessage && (
            <div className="mb-6 rounded-2xl border border-rose-600/20 bg-rose-600/10 px-4 py-3 text-rose-700 dark:text-rose-300">
              <p className="text-sm font-bold leading-relaxed">{errorMessage}</p>
            </div>
          )}
          <button type="button" onClick={signInWithGoogle} disabled={isSigningIn} className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-orange-600 px-5 py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60">
            <Lock className="h-4 w-4" />
            {isSigningIn ? 'Signing in...' : 'Sign in with Google'}
          </button>
        </section>
      </main>
    </div>
  );
}

export default function CommissionerLoginPage() {
  return <Suspense fallback={null}><CommissionerLoginContent /></Suspense>;
}
