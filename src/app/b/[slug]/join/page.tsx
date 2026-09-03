'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

function JoinBoardContent() {
  const params = useParams();
  const slug = params?.slug as string;
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const router = useRouter();

  const [supabase] = useState(() => createClient());
  const [board, setBoard] = useState<{ id: string; name: string; slug: string } | null>(null);
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

  const handleJoin = async () => {
    if (!user) {
      router.push(`/login?redirect=/b/${slug}/join${token ? `?token=${encodeURIComponent(token)}` : ''}`);
      return;
    }

    setJoining(true);
    setError(null);
    try {
      const res = await fetch(`/api/boards/${slug}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
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
      <div className="container" style={{ padding: '6rem 0', textAlign: 'center' }}>
        <p className="text-secondary">Loading invitation...</p>
      </div>
    );
  }

  if (error && !board) {
    return (
      <div className="container" style={{ padding: '6rem 0', textAlign: 'center' }}>
        <div className="card" style={{ maxWidth: '440px', margin: '0 auto' }}>
          <h2>Invite Not Found</h2>
          <p className="text-secondary" style={{ margin: '1rem 0' }}>{error}</p>
          <Link href="/" className="btn btn-primary">Go to Home</Link>
        </div>
      </div>
    );
  }

  const displayName = board?.name || slug;

  return (
    <div className="container" style={{ padding: '6rem 0' }}>
      <div className="card" style={{ maxWidth: '480px', margin: '0 auto', textAlign: 'center', padding: '3rem 2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
        <span className="badge badge-primary" style={{ marginBottom: '1rem' }}>
          Group Invitation
        </span>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{displayName}</h1>
        <p className="text-secondary" style={{ marginBottom: '2rem' }}>
          You’ve been invited to join <strong>{displayName}</strong> on Memeboard to collect and browse links with friends.
        </p>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
            {error}
          </div>
        )}

        {user ? (
          <button
            onClick={handleJoin}
            disabled={joining}
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
            id="accept-invite-btn"
          >
            {joining ? 'Joining...' : `Join ${displayName} →`}
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <Link
              href={`/login?redirect=/b/${slug}/join${token ? `?token=${encodeURIComponent(token)}` : ''}`}
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
            >
              Sign In to Join Board
            </Link>
            <p style={{ fontSize: '0.825rem', color: 'var(--color-text-muted)' }}>
              Takes 10 seconds. No passwords required if using magic link.
            </p>
          </div>
        )}
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
