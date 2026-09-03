'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatTimeAgo, getDomain } from '@/lib/utils';
import Link from 'next/link';

interface LinkItem {
  id: string;
  board_id: string;
  submitted_by: string | null;
  url: string;
  created_at: string;
  profile?: {
    username: string | null;
    email: string | null;
  } | null;
}

interface BoardData {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
}

export default function BoardPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const router = useRouter();

  const [supabase] = useState(() => createClient());
  const [board, setBoard] = useState<BoardData | null>(null);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [memberCount, setMemberCount] = useState<number>(1);
  const [isMember, setIsMember] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Quick link input
  const [urlInput, setUrlInput] = useState('');
  const [submittingUrl, setSubmittingUrl] = useState(false);

  // Toast
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadBoardData = useCallback(async () => {
    if (!slug) return;
    try {
      setLoading(true);

      // 1. Fetch current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);

      // 2. Fetch Board by slug
      const { data: bData, error: bError } = await supabase
        .from('boards')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (bError || !bData) {
        setError('Board not found. Please check the link or create a new board.');
        setLoading(false);
        return;
      }
      setBoard(bData);

      // 3. Fetch Member Count & Check Membership
      const { count } = await supabase
        .from('board_members')
        .select('*', { count: 'exact', head: true })
        .eq('board_id', bData.id);
      setMemberCount(count || 1);

      if (user) {
        const { data: membership } = await supabase
          .from('board_members')
          .select('*')
          .eq('board_id', bData.id)
          .eq('user_id', user.id)
          .maybeSingle();
        setIsMember(!!membership);
      }

      // 4. Fetch Links directly
      const { data: linksData, error: linksError } = await supabase
        .from('links')
        .select('id, board_id, submitted_by, url, created_at')
        .eq('board_id', bData.id)
        .order('created_at', { ascending: false });

      if (linksError) {
        console.error('Error fetching links:', linksError);
        setLinks([]);
      } else if (linksData && linksData.length > 0) {
        // Collect unique submitter IDs to fetch profile display names
        const submitterIds = Array.from(
          new Set(
            linksData
              .map((l) => l.submitted_by)
              .filter((id): id is string => Boolean(id))
          )
        );

        let profilesMap = new Map<string, { username: string | null; email: string | null }>();
        if (submitterIds.length > 0) {
          const { data: profs } = await supabase
            .from('profiles')
            .select('id, username, email')
            .in('id', submitterIds);

          if (profs) {
            profs.forEach((p) =>
              profilesMap.set(p.id, { username: p.username, email: p.email })
            );
          }
        }

        const enrichedLinks: LinkItem[] = linksData.map((l) => ({
          ...l,
          profile: l.submitted_by ? profilesMap.get(l.submitted_by) || null : null,
        }));

        setLinks(enrichedLinks);
      } else {
        setLinks([]);
      }
    } catch (err: any) {
      console.error('Error loading board:', err);
      setError('Could not load board.');
    } finally {
      setLoading(false);
    }
  }, [slug, supabase]);

  useEffect(() => {
    loadBoardData();
  }, [loadBoardData]);

  // Realtime subscription for instant link appearance!
  useEffect(() => {
    if (!board) return;

    const channel = supabase
      .channel(`board-${board.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'links',
          filter: `board_id=eq.${board.id}`,
        },
        async (payload) => {
          const newRow = payload.new as LinkItem;

          // Fetch submitter username if available
          let profileInfo = null;
          if (newRow.submitted_by) {
            const { data: p } = await supabase
              .from('profiles')
              .select('username, email')
              .eq('id', newRow.submitted_by)
              .maybeSingle();
            profileInfo = p;
          }

          const fullLink: LinkItem = {
            ...newRow,
            profile: profileInfo,
          };

          // Prepend new link immediately
          setLinks((prev) => [fullLink, ...prev]);
          showToast('⚡ New link added to board!');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [board, supabase]);

  const handleShareBoard = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      showToast('📋 Board link copied to clipboard!');
    }
  };

  const handleJoinBoard = async () => {
    if (!currentUser) {
      router.push('/#auth');
      return;
    }
    if (!board) return;

    try {
      const { error } = await supabase.from('board_members').insert({
        board_id: board.id,
        user_id: currentUser.id,
        role: 'member',
      });

      if (error && error.code !== '23505') {
        throw error;
      }

      setIsMember(true);
      setMemberCount((c) => c + 1);
      showToast(`🎉 Joined "${board.name}"!`);
    } catch (err: any) {
      showToast('Error joining board');
    }
  };

  const handleAddLinkDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim() || !board) return;

    let targetUrl = urlInput.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    setSubmittingUrl(true);
    try {
      const { error } = await supabase.from('links').insert({
        board_id: board.id,
        submitted_by: currentUser?.id || null,
        url: targetUrl,
      });

      if (error) throw error;
      setUrlInput('');
      showToast('Link added!');
    } catch (err: any) {
      showToast(err.message || 'Failed to add link');
    } finally {
      setSubmittingUrl(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '6rem 0', textAlign: 'center' }}>
        <p className="text-secondary">Loading board...</p>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="container" style={{ padding: '6rem 0', textAlign: 'center' }}>
        <div className="card" style={{ maxWidth: '480px', margin: '0 auto', padding: '3rem 2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔍</div>
          <h2 style={{ marginBottom: '0.5rem' }}>Board Not Found</h2>
          <p className="text-secondary" style={{ marginBottom: '1.5rem' }}>
            {error || "The board you are looking for doesn't exist or has moved."}
          </p>
          <Link href="/dashboard" className="btn btn-primary">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Toast Notification */}
      {toast && (
        <div className="toast-container">
          <div className="toast">{toast}</div>
        </div>
      )}

      {/* Board Header (Matching Spec) */}
      <header className="board-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="board-title">{board.name}</h1>
            <div className="board-stats">
              <span>👥 {memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
              <span>•</span>
              <span className="font-mono text-muted">/b/{board.slug}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={handleShareBoard}
              className="btn btn-primary"
              id="share-board-btn"
            >
              🔗 Share Board
            </button>

            {!isMember && (
              <button
                onClick={handleJoinBoard}
                className="btn btn-secondary"
                id="join-board-btn"
              >
                + Join Board
              </button>
            )}
          </div>
        </div>

        {/* Quick Add Form on Web */}
        <form onSubmit={handleAddLinkDirect} style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
          <input
            type="url"
            placeholder="Paste a URL (Instagram, YouTube, Reddit, X, TikTok...)"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="input"
            id="quick-url-input"
            required
          />
          <button
            type="submit"
            disabled={submittingUrl}
            className="btn btn-secondary"
            id="quick-add-btn"
            style={{ minWidth: '120px' }}
          >
            {submittingUrl ? 'Adding...' : 'Add Link'}
          </button>
        </form>
      </header>

      {/* Chronological Link Feed */}
      <section className="board-feed">
        {links.length === 0 ? (
          <div className="card empty-state">
            <div className="empty-state-icon">📥</div>
            <h3 style={{ marginBottom: '0.5rem' }}>No links yet!</h3>
            <p style={{ maxWidth: '440px', margin: '0 auto 1.5rem', color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>
              Send a link to the Telegram bot or paste one above. It will appear here instantly in real-time.
            </p>
            <div style={{ display: 'inline-flex', gap: '0.75rem' }}>
              <a
                href="https://t.me/memeboard_bot"
                target="_blank"
                rel="noreferrer"
                className="btn btn-telegram btn-sm"
              >
                Open @memeboard_bot ↗
              </a>
            </div>
          </div>
        ) : (
          links.map((item) => {
            const domain = getDomain(item.url);
            const submitterName =
              item.profile?.username ||
              (item.profile?.email ? item.profile.email.split('@')[0] : null) ||
              'Member';

            return (
              <article key={item.id} className="link-card" id={`link-${item.id}`}>
                <div className="link-content">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-url"
                  >
                    {item.url}
                  </a>

                  <div className="link-meta">
                    <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                      {domain}
                    </span>
                    <span>
                      Shared by <strong style={{ color: 'var(--color-text-secondary)' }}>{submitterName}</strong>
                    </span>
                    <span>•</span>
                    <time dateTime={item.created_at}>{formatTimeAgo(item.created_at)}</time>
                  </div>
                </div>

                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '0.4rem 0.6rem' }}
                  title="Open Link"
                >
                  ↗
                </a>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
