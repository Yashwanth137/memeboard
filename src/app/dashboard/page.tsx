'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { slugify } from '@/lib/utils';
import Link from 'next/link';

interface Board {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
  member_count?: number;
  link_count?: number;
  role?: string;
}

interface Profile {
  id: string;
  username: string | null;
  email: string | null;
  telegram_user_id: number | null;
  telegram_username: string | null;
  telegram_link_code: string | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);

  // Create Board state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardSlug, setNewBoardSlug] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/#auth');
        return;
      }
      setUser(user);

      // Fetch or create profile
      let { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (!prof && !profErr) {
        // Create profile if trigger hadn't fired yet
        const newCode = Math.random().toString(36).substring(2, 10);
        const { data: createdProf } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            username: user.user_metadata?.username || user.email?.split('@')[0],
            telegram_link_code: newCode,
          })
          .select()
          .single();
        prof = createdProf;
      } else if (prof && !prof.telegram_user_id && !prof.telegram_link_code) {
        // Ensure an unlinked profile has an active connect code
        const newCode = Math.random().toString(36).substring(2, 10);
        await supabase
          .from('profiles')
          .update({ telegram_link_code: newCode })
          .eq('id', user.id);
        prof.telegram_link_code = newCode;
      }

      setProfile(prof);

      // Fetch user's boards
      const { data: memberRows } = await supabase
        .from('board_members')
        .select('role, boards ( id, name, slug, owner_id, created_at )')
        .eq('user_id', user.id);

      if (memberRows) {
        const boardList: Board[] = [];
        for (const row of memberRows) {
          const b = (row as any).boards;
          if (b) {
            // Count members & links
            const { count: memberCount } = await supabase
              .from('board_members')
              .select('*', { count: 'exact', head: true })
              .eq('board_id', b.id);

            const { count: linkCount } = await supabase
              .from('links')
              .select('*', { count: 'exact', head: true })
              .eq('board_id', b.id);

            boardList.push({
              ...b,
              role: row.role,
              member_count: memberCount || 1,
              link_count: linkCount || 0,
            });
          }
        }
        setBoards(boardList);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewBoardName(val);
    setNewBoardSlug(slugify(val));
  };

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardName.trim() || !newBoardSlug.trim() || !user) return;

    setCreateLoading(true);
    setCreateError('');

    try {
      const { data: newBoard, error: bError } = await supabase
        .from('boards')
        .insert({
          name: newBoardName.trim(),
          slug: newBoardSlug.trim(),
          owner_id: user.id,
        })
        .select()
        .single();

      if (bError) {
        if (bError.code === '23505') {
          throw new Error('A board with this slug already exists. Please pick a different name or slug.');
        }
        throw bError;
      }

      // Add as owner member (upsert with ignoreDuplicates in case trigger already inserted it)
      await supabase.from('board_members').upsert(
        {
          board_id: newBoard.id,
          user_id: user.id,
          role: 'owner',
        },
        { onConflict: 'board_id,user_id', ignoreDuplicates: true }
      );

      setShowCreateModal(false);
      router.push(`/b/${newBoard.slug}`);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create board');
    } finally {
      setCreateLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
        <p className="text-secondary">Loading your boards...</p>
      </div>
    );
  }

  const telegramBotUsername = 'memeboard_bot';
  const telegramConnectUrl = profile?.telegram_link_code
    ? `https://t.me/${telegramBotUsername}?start=${profile.telegram_link_code}`
    : `https://t.me/${telegramBotUsername}`;

  return (
    <div className="container" style={{ paddingBottom: '5rem' }}>
      {/* Telegram Connection Banner */}
      <div className="telegram-banner" style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
          <div className="telegram-banner-icon">🤖</div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Telegram Bot Agent</h3>
              {profile?.telegram_user_id ? (
                <span className="badge badge-success">✓ Connected</span>
              ) : (
                <span className="badge badge-telegram">Action Required</span>
              )}
            </div>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', margin: 0 }}>
              {profile?.telegram_user_id
                ? `Linked to @${profile.telegram_username || 'Telegram User'}. Links you send to @${telegramBotUsername} will instantly appear on your active board.`
                : 'Connect your Telegram account so any link you share with the bot instantly drops onto your board.'}
            </p>
          </div>
        </div>

        <div>
          {profile?.telegram_user_id ? (
            <a
              href={`https://t.me/${telegramBotUsername}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary btn-sm"
            >
              Open Bot in Telegram ↗
            </a>
          ) : (
            <a
              href={telegramConnectUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-telegram"
              id="connect-telegram-btn"
            >
              Connect Telegram 🚀
            </a>
          )}
        </div>
      </div>

      {/* Boards Section */}
      <div className="dashboard-header">
        <div>
          <h2>Your Boards</h2>
          <p className="text-secondary" style={{ fontSize: '0.95rem' }}>
            Shared collections of content for your groups.
          </p>
        </div>

        <button
          onClick={() => {
            setShowCreateModal(true);
            setNewBoardName('');
            setNewBoardSlug('');
            setCreateError('');
          }}
          className="btn btn-primary"
          id="create-board-modal-btn"
        >
          + Create Board
        </button>
      </div>

      {boards.length === 0 ? (
        <div className="card empty-state" style={{ padding: '4rem 2rem' }}>
          <div className="empty-state-icon">📂</div>
          <h3 style={{ marginBottom: '0.5rem' }}>No Boards Yet</h3>
          <p style={{ maxWidth: '400px', margin: '0 auto 1.5rem', color: 'var(--color-text-secondary)' }}>
            Create your first board to start collecting memes, videos, and links with your friends.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
            id="first-board-btn"
          >
            Create Your First Board
          </button>
        </div>
      ) : (
        <div className="boards-grid">
          {boards.map((board) => (
            <Link key={board.id} href={`/b/${board.slug}`} className="card card-hover board-card">
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 className="board-card-name">{board.name}</h3>
                  <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                    {board.role}
                  </span>
                </div>
                <div className="board-card-slug font-mono">/b/{board.slug}</div>
              </div>

              <div className="board-card-footer">
                <span>👥 {board.member_count} {board.member_count === 1 ? 'member' : 'members'}</span>
                <span>🔗 {board.link_count} {board.link_count === 1 ? 'link' : 'links'}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Board Modal */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: '460px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0 }}>Create a New Board</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ color: 'var(--color-text-muted)', fontSize: '1.25rem', padding: '0.25rem' }}
              >
                ✕
              </button>
            </div>

            {createError && (
              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1rem',
                  fontSize: '0.85rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  color: 'var(--color-danger)',
                }}
              >
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateBoard} className="flex flex-col gap-4">
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    color: 'var(--color-text-secondary)',
                    marginBottom: '0.35rem',
                    fontWeight: 500,
                  }}
                >
                  Board Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. The Boys, Weekend Chaos, Movie Night"
                  value={newBoardName}
                  onChange={handleNameChange}
                  className="input"
                  id="board-name-input"
                  autoFocus
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    color: 'var(--color-text-secondary)',
                    marginBottom: '0.35rem',
                    fontWeight: 500,
                  }}
                >
                  Shareable Slug (URL)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="text-muted font-mono" style={{ fontSize: '0.9rem' }}>
                    memeboard.app/b/
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="the-boys"
                    value={newBoardSlug}
                    onChange={(e) => setNewBoardSlug(slugify(e.target.value))}
                    className="input font-mono"
                    id="board-slug-input"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="btn btn-primary"
                  id="board-submit-btn"
                >
                  {createLoading ? 'Creating...' : 'Create Board'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
