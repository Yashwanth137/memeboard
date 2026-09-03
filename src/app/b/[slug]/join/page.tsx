'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function JoinBoardPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const router = useRouter();

  const [supabase] = useState(() => createClient());
  const [board, setBoard] = useState<any>(null);
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
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (bErr || !bData) {
        setError('Board not found.');
        return;
      }
      setBoard(bData);

      // If already logged in, check if already member
      if (user) {
        const { data: member } = await supabase
          .from('board_members')
          .select('*')
          .eq('board_id', bData.id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (member) {
          // Already a member, go to board
          router.push(`/b/${slug}`);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error loading board');
    } finally {
      setLoading(false);
    }
  }, [slug, supabase, router]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  const handleJoin = async () => {
    if (!user) {
      router.push('/#auth');
      return;
    }

    setJoining(true);
    try {
      const { error } = await supabase.from('board_members').insert({
        board_id: board.id,
        user_id: user.id,
        role: 'member',
      });

      if (error && error.code !== '23505') {
        throw error;
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

  if (error || !board) {
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

  return (
    <div className="container" style={{ padding: '6rem 0' }}>
      <div className="card" style={{ maxWidth: '480px', margin: '0 auto', textAlign: 'center', padding: '3rem 2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
        <span className="badge badge-primary" style={{ marginBottom: '1rem' }}>
          Group Invitation
        </span>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{board.name}</h1>
        <p className="text-secondary" style={{ marginBottom: '2rem' }}>
          You’ve been invited to join <strong>{board.name}</strong> on Memeboard to collect and browse links with friends.
        </p>

        {user ? (
          <button
            onClick={handleJoin}
            disabled={joining}
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
            id="accept-invite-btn"
          >
            {joining ? 'Joining...' : `Join ${board.name} →`}
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <Link
              href={`/login?redirect=/b/${slug}/join`}
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
