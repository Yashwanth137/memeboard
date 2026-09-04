'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

function extractToken(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (trimmed.includes('token=')) {
    try {
      const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
      return url.searchParams.get('token') || '';
    } catch {
      const match = trimmed.match(/[?&]token=([^&#\s]+)/);
      if (match) return match[1];
    }
  }
  return trimmed;
}

function JoinBoardContent() {
  const params = useParams();
  const slug = params?.slug as string;
  const searchParams = useSearchParams();
  const urlToken = searchParams.get('token') || '';
  const router = useRouter();

  const [supabase] = useState(() => createClient());
  const [board, setBoard] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [tokenInput, setTokenInput] = useState(urlToken);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBoard = useCallback(async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      const { data: bData, error: bErr } = await supabase
        .from('boards')
        .select('id, name, slug')
        .eq('slug', slug)
        .maybeSingle();

      if (bErr || !bData) {
        // If user is not yet a member, RLS prevents reading board row directly
        // That's expected for private boards, so we allow joining via token
        setBoard({ id: '', name: slug, slug });
      } else {
        setBoard(bData);

        // If already a member, navigate straight to board
        if (user) {
          const { data: member } = await supabase
            .from('board_members')
            .select('user_id')
            .eq('board_id', bData.id)
            .eq('user_id', user.id)
            .maybeSingle();

          if (member) {
            router.push(`/b/${slug}`);
            return;
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error loading invitation');
    } finally {
      setLoading(false);
    }
  }, [slug, supabase, router]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  // Sync tokenInput if searchParams change
  useEffect(() => {
    if (urlToken) {
      setTokenInput(urlToken);
    }
  }, [urlToken]);

  const handleJoin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const effectiveToken = extractToken(tokenInput || urlToken);

    if (!effectiveToken) {
      setError('Please enter an invite code or link to join this board.');
      return;
    }

    if (!user) {
      router.push(`/login?redirect=/b/${slug}/join?token=${encodeURIComponent(effectiveToken)}`);
      return;
    }

    setJoining(true);
    setError(null);
    try {
      const res = await fetch(`/api/boards/${slug}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: effectiveToken }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid or expired invite link');
      }

      router.push(`/b/${slug}`);
    } catch (err: any) {
      setError(err.message || 'Failed to join board');
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-3" />
        <p className="text-text-secondary text-sm font-medium">Checking board invitation...</p>
      </div>
    );
  }

  if (error && !board) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-surface border border-border-subtle rounded-3xl p-8 text-center shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4 text-xl">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">Invite Not Found</h2>
          <p className="text-sm text-text-secondary mb-6">{error}</p>
          <Link
            href="/boards"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:opacity-90 transition-all shadow-md"
          >
            Go to My Boards
          </Link>
        </div>
      </div>
    );
  }

  const displayName = board?.name || slug;
  const hasDirectToken = Boolean(urlToken.trim());

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-surface border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-center">
        {/* Ambient Top Glow */}
        <div className="absolute -top-20 -right-20 w-44 h-44 bg-accent/15 blur-3xl rounded-full pointer-events-none" />

        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4 text-2xl shadow-inner">
          🎉
        </div>

        <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-extrabold uppercase tracking-wider mb-3">
          Group Invitation
        </span>

        <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight mb-2">
          {displayName}
        </h1>

        <p className="text-xs sm:text-sm text-text-secondary mb-6 font-medium leading-relaxed">
          {hasDirectToken
            ? `You’ve been invited to join ${displayName} on Memeboard to collect and browse memes together.`
            : `This board is private. Paste your invite link or code below to join ${displayName}.`}
        </p>

        {error && (
          <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl text-left flex items-start gap-2.5">
            <span className="text-red-500 text-sm mt-0.5">⚠️</span>
            <p className="text-xs font-semibold text-red-600 dark:text-red-400 leading-snug">{error}</p>
          </div>
        )}

        <form onSubmit={handleJoin} className="flex flex-col gap-4 text-left">
          {!hasDirectToken && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                Invite Link or Code
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-surface-elevated border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-semibold placeholder-text-secondary/50 text-xs shadow-xs"
                placeholder="Paste full link (e.g. ...?token=...) or token"
                value={tokenInput}
                onChange={(e) => {
                  setTokenInput(e.target.value);
                  if (error) setError(null);
                }}
                autoFocus
                required
              />
            </div>
          )}

          {user ? (
            <button
              type="submit"
              disabled={joining || (!hasDirectToken && !tokenInput.trim())}
              className="w-full py-3.5 px-6 rounded-xl bg-primary hover:opacity-90 active:scale-[0.98] text-white text-sm font-extrabold transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              id="accept-invite-btn"
            >
              {joining ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Joining {displayName}...</span>
                </>
              ) : (
                <>
                  <span>Join {displayName}</span>
                  <span>→</span>
                </>
              )}
            </button>
          ) : (
            <div className="flex flex-col gap-3 mt-2">
              <Link
                href={`/login?redirect=/b/${slug}/join${
                  tokenInput.trim() ? `?token=${encodeURIComponent(extractToken(tokenInput))}` : ''
                }`}
                className="w-full py-3.5 px-6 rounded-xl bg-primary hover:opacity-90 active:scale-[0.98] text-white text-sm font-extrabold transition-all shadow-md text-center flex items-center justify-center gap-2"
              >
                Sign In to Join Board →
              </Link>
              <p className="text-[11px] text-text-secondary text-center">
                Takes 10 seconds. No passwords required if using magic link.
              </p>
            </div>
          )}
        </form>

        <div className="mt-6 pt-5 border-t border-border-subtle/50 flex items-center justify-center">
          <Link
            href="/boards"
            className="text-xs font-bold text-text-secondary hover:text-text-primary transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function JoinBoardPage() {
  return (
    <Suspense fallback={<div className="container" style={{ padding: '6rem 0', textAlign: 'center' }}>Loading...</div>}>
      <JoinBoardContent />
    </Suspense>
  );
}
