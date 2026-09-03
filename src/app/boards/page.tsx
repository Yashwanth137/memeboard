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
  thumbnails?: string[];
  members?: string[];
}

interface Profile {
  id: string;
  username: string | null;
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
        router.push('/login?redirect=/boards');
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

            // Fetch recent thumbnails
            const { data: recentLinks } = await supabase
              .from('links')
              .select('thumbnail_url')
              .eq('board_id', b.id)
              .not('thumbnail_url', 'is', null)
              .neq('thumbnail_url', '')
              .order('created_at', { ascending: false })
              .limit(4);

            // Fetch member usernames
            const { data: membersData } = await supabase
              .from('board_members')
              .select('profiles(username)')
              .eq('board_id', b.id)
              .limit(5);

            boardList.push({
              ...b,
              role: row.role,
              member_count: memberCount || 1,
              link_count: linkCount || 0,
              thumbnails: recentLinks?.map(l => l.thumbnail_url).filter(Boolean) || [],
              members: membersData?.map(m => (m.profiles as any)?.username).filter(Boolean) || [],
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
      <div className="container pt-28" style={{ paddingBottom: '4rem', textAlign: 'center' }}>
        <p className="text-secondary">Loading your boards...</p>
      </div>
    );
  }

  const telegramBotUsername = 'memeboard_bot';
  const telegramConnectUrl = profile?.telegram_link_code
    ? `https://t.me/${telegramBotUsername}?start=${profile.telegram_link_code}`
    : `https://t.me/${telegramBotUsername}`;

  return (
    <div className="container pt-28" style={{ paddingBottom: '5rem' }}>
      {/* Telegram Connection Banner */}
      {!profile?.telegram_user_id && (
        <div className="telegram-banner" style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
            <div className="telegram-banner-icon">🤖</div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Action Required</h3>
                <span className="badge badge-telegram">Connect Telegram</span>
              </div>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                Connect your Telegram account so any link you share with the bot instantly drops onto your board.
              </p>
            </div>
          </div>
          <div>
            <a href={telegramConnectUrl} target="_blank" rel="noreferrer" className="btn btn-telegram" id="connect-telegram-btn">
              Connect Telegram 🚀
            </a>
          </div>
        </div>
      )}

      {/* Boards Section */}
      <div className="boards-header">
        <h2>Your Boards</h2>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)} id="open-create-board-btn">
          + Create Board
        </button>
      </div>

      {boards.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📁</div>
          <h3>No Boards Yet</h3>
          <p className="text-secondary" style={{ marginBottom: '1.5rem', maxWidth: '400px' }}>
            Boards are private spaces where your group's content is saved. Create one to get started.
          </p>
          <button className="btn btn-primary btn-lg" onClick={() => setShowCreateModal(true)}>
            Create Your First Board
          </button>
        </div>
      ) : (
        <div className="boards-grid">
          {boards.map((board) => (
            <Link href={`/b/${board.slug}`} key={board.id} className="board-card">
              <div className="board-card-content">
                <div className="board-card-thumbnails">
                  {board.thumbnails && board.thumbnails.length > 0 ? (
                    board.thumbnails.map((thumb, idx) => (
                      <div key={idx} className="board-card-thumb" style={{ backgroundImage: `url(${thumb})` }} />
                    ))
                  ) : (
                    <div className="board-card-thumb-empty" />
                  )}
                </div>
                <h3 className="board-card-title">{board.name}</h3>
                
                <div className="board-card-stats">
                  <span>{board.member_count} members</span>
                  <span>•</span>
                  <span>{board.link_count} posts</span>
                </div>
                
                <div className="board-card-members">
                  {board.members?.map((m, i) => (
                    <span key={i} className="board-member-pill">@{m}</span>
                  ))}
                  {board.member_count && board.member_count > (board.members?.length || 0) && (
                    <span className="board-member-pill more">+{board.member_count - (board.members?.length || 0)}</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Board Modal */}
      {showCreateModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content compact-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowCreateModal(false)}>
              ×
            </button>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Create a New Board</h3>

            {createError && (
              <div className="error-text" style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)' }}>
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateBoard}>
              <div style={{ marginBottom: '1rem' }}>
                <label className="input-label">Board Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. The Boys, Movie Club"
                  value={newBoardName}
                  onChange={handleNameChange}
                  required
                  autoFocus
                  id="new-board-name-input"
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label className="input-label">URL Slug</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="text-secondary" style={{ fontSize: '0.9rem' }}>
                    memeboard.app/b/
                  </span>
                  <input
                    type="text"
                    className="input"
                    style={{ flex: 1 }}
                    value={newBoardSlug}
                    onChange={(e) => setNewBoardSlug(slugify(e.target.value))}
                    required
                    id="new-board-slug-input"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createLoading || !newBoardName.trim() || !newBoardSlug.trim()}
                  id="submit-create-board-btn"
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
