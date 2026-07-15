'use client';

import { useRef, useState } from 'react';

import { signInMagicLink, signInPassword, signUp } from '@/lib/supabase/actions';

export default function LoginPage() {
  const [mode, setMode] = useState<'magic-link' | 'password'>('magic-link');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);

  async function handleMagicLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await signInMagicLink(formData);

    if (result?.error) {
      setError(result.error);
      setPending(false);
    } else {
      setSubmitted(true);
      setPending(false);
    }
  }

  async function handlePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const action = isSignUp ? signUp : signInPassword;
    const result = await action(formData);

    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
    // If no error, the server action redirects — no need to set submitted/pending
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        {/* Logo / Title */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-semibold tracking-tight text-amber-400">
            Z&apos;manim
          </h1>
          <p className="text-sm text-slate-400 mt-2">Jewish Holiday Reminders</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          {/* Mode Tabs */}
          <div className="flex mb-6 border-b border-slate-700">
            <button
              type="button"
              onClick={() => {
                setMode('magic-link');
                setError(null);
                setSubmitted(false);
              }}
              className={`pb-2 px-4 text-sm font-medium transition-colors ${
                mode === 'magic-link'
                  ? 'text-amber-400 border-b-2 border-amber-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Magic Link
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('password');
                setError(null);
                setSubmitted(false);
              }}
              className={`pb-2 px-4 text-sm font-medium transition-colors ${
                mode === 'password'
                  ? 'text-amber-400 border-b-2 border-amber-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Password
            </button>
          </div>

          {/* Magic Link Form */}
          {mode === 'magic-link' && (
            <form ref={formRef} onSubmit={handleMagicLink} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm text-slate-300 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 text-sm"
                />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              {submitted ? (
                <div className="bg-slate-900 rounded-lg p-4 text-sm text-slate-300">
                  Check your email for a login link. It may take a moment to arrive.
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={pending}
                  className="w-full py-2 px-4 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 text-slate-900 font-medium rounded-lg transition-colors text-sm"
                >
                  {pending ? 'Sending...' : 'Send Magic Link'}
                </button>
              )}
            </form>
          )}

          {/* Password Form */}
          {mode === 'password' && (
            <form onSubmit={handlePassword} className="space-y-4">
              <div>
                <label htmlFor="email-pw" className="block text-sm text-slate-300 mb-1">
                  Email
                </label>
                <input
                  id="email-pw"
                  name="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 text-sm"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm text-slate-300 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 text-sm"
                />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <div className="space-y-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="w-full py-2 px-4 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 text-slate-900 font-medium rounded-lg transition-colors text-sm"
                >
                  {pending
                    ? 'Please wait...'
                    : isSignUp
                      ? 'Create Account'
                      : 'Sign In'}
                </button>

                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="w-full text-sm text-slate-400 hover:text-slate-300 transition-colors"
                >
                  {isSignUp
                    ? 'Already have an account? Sign in'
                    : "Don't have an account? Create one"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 mt-6">
          Times calculated using Hebcal
        </p>
      </div>
    </div>
  );
}