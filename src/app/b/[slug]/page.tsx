'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Category, LinkWithDetails } from '@/types/database';
import BoardHeader from '@/components/board/BoardHeader';
import FilterBar from '@/components/board/FilterBar';
import FeedCard from '@/components/board/FeedCard';
import PreviewModal from '@/components/board/PreviewModal';
import EditPostModal from '@/components/board/EditPostModal';
import QuickAddModal from '@/components/board/QuickAddModal';
import SkeletonCard from '@/components/board/SkeletonCard';
import { detectPlatform, resolveEmbedInfo } from '@/lib/platform';
import Link from 'next/link';

const PAGE_SIZE = 24;

interface BoardData {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
}

interface MemberOption {
  id: string;
  name: string;
}

export default function BoardPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const router = useRouter();
  const searchParams = useSearchParams();

  const [supabase] = useState(() => createClient());

  // Board State
  const [board, setBoard] = useState<BoardData | null>(null);
  const [memberCount, setMemberCount] = useState<number>(1);
  const [isMember, setIsMember] = useState<boolean>(false);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [boardLoading, setBoardLoading] = useState<boolean>(true);
  const [boardError, setBoardError] = useState<string | null>(null);

  // Metadata Filters & Options
  const [categories, setCategories] = useState<Category[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);

  // Filter & Search State (Initialized from URL search params)
  const [platform, setPlatform] = useState<string>(searchParams.get('platform') || '');
  const [category, setCategory] = useState<string>(searchParams.get('category') || '');
  const [member, setMember] = useState<string>(searchParams.get('member') || '');
  const [sort, setSort] = useState<'newest' | 'oldest'>(
    (searchParams.get('sort') as 'newest' | 'oldest') || 'newest'
  );
  const [search, setSearch] = useState<string>(searchParams.get('q') || '');
  const [debouncedSearch, setDebouncedSearch] = useState<string>(search);

  // Links & Pagination State
  const [links, setLinks] = useState<LinkWithDetails[]>([]);
  const [feedLoading, setFeedLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

  // Active Modals State
  const [previewLink, setPreviewLink] = useState<LinkWithDetails | null>(null);
  const [editingLink, setEditingLink] = useState<LinkWithDetails | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // Toast Notification State
  const [toast, setToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast(msg);
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
  };

  // 1. Debounce Search Input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // 2. Sync Active Filters with URL Search Params
  const updateUrlParams = useCallback(
    (newPlatform: string, newCategory: string, newMember: string, newSort: string, newSearch: string) => {
      const sp = new URLSearchParams();
      if (newPlatform) sp.set('platform', newPlatform);
      if (newCategory) sp.set('category', newCategory);
      if (newMember) sp.set('member', newMember);
      if (newSort !== 'newest') sp.set('sort', newSort);
      if (newSearch) sp.set('q', newSearch);

      const qs = sp.toString();
      const targetUrl = qs ? `/b/${slug}?${qs}` : `/b/${slug}`;
      window.history.replaceState(null, '', targetUrl);
    },
    [slug]
  );

  // 3. Initial Board Data & Categories / Members Fetching
  const loadInitialBoard = useCallback(async () => {
    if (!slug) return;
    try {
      setBoardLoading(true);

      // Auth user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);

      // Board
      const { data: bData, error: bErr } = await supabase
        .from('boards')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (bErr || !bData) {
        setBoardError('Board not found. Please check the URL.');
        setBoardLoading(false);
        return;
      }
      setBoard(bData);
      setIsOwner(user?.id === bData.owner_id);

      // Member Count & Membership
      const { count } = await supabase
        .from('board_members')
        .select('*', { count: 'exact', head: true })
        .eq('board_id', bData.id);
      setMemberCount(count || 1);

      if (user) {
        const { data: m } = await supabase
          .from('board_members')
          .select('*')
          .eq('board_id', bData.id)
          .eq('user_id', user.id)
          .maybeSingle();
        setIsMember(Boolean(m));
      }

      // Fetch Categories (global defaults + board-specific)
      const { data: catData } = await supabase
        .from('categories')
        .select('*')
        .or(`board_id.is.null,board_id.eq.${bData.id}`)
        .order('name');
      if (catData) setCategories(catData);

      // Fetch Board Members and Authors for User filter
      const { data: memberRows } = await supabase
        .from('board_members')
        .select('user_id, profiles(id, username, email)')
        .eq('board_id', bData.id);

      const memberMap = new Map<string, string>();
      if (memberRows) {
        memberRows.forEach((row: any) => {
          const p = row.profiles;
          if (row.user_id) {
            memberMap.set(row.user_id, p?.username ? `@${p.username}` : 'Member');
          }
        });
      }

      // Also ensure current user or any poster is included in the dropdown
      if (user && !memberMap.has(user.id)) {
        memberMap.set(user.id, 'You');
      }

      const memberList: MemberOption[] = Array.from(memberMap.entries()).map(([id, name]) => ({
        id,
        name,
      }));
      setMembers(memberList);
    } catch (err: any) {
      console.error('Error loading board:', err);
      setBoardError('Error loading board data.');
    } finally {
      setBoardLoading(false);
    }
  }, [slug, supabase]);

  useEffect(() => {
    loadInitialBoard();
  }, [loadInitialBoard]);

  // 4. PostgreSQL Filtered & Paginated Feed Query
  const fetchLinks = useCallback(
    async (pageIndex: number, append: boolean = false) => {
      if (!board) return;

      try {
        if (!append) setFeedLoading(true);
        else setLoadingMore(true);

        // Build PostgreSQL query directly
        let query = supabase
          .from('links')
          .select('id, board_id, submitted_by, url, platform, content_type, title, description, thumbnail_url, category_id, created_at, updated_at')
          .eq('board_id', board.id);

        if (platform) {
          query = query.eq('content_type', platform as 'image' | 'video' | 'link');
        }
        if (category) {
          query = query.eq('category_id', category);
        }
        if (member) {
          query = query.eq('submitted_by', member);
        }
        if (debouncedSearch.trim()) {
          const s = debouncedSearch.trim();
          query = query.or(`title.ilike.%${s}%,url.ilike.%${s}%,description.ilike.%${s}%`);
        }

        // Sort in PostgreSQL
        if (sort === 'oldest') {
          query = query.order('created_at', { ascending: true });
        } else {
          query = query.order('created_at', { ascending: false });
        }

        // Pagination range
        const from = pageIndex * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        query = query.range(from, to);

        const { data: rawLinks, error: linksErr } = await query;

        if (linksErr) {
          console.error('Error querying links in PostgreSQL:', linksErr);
          if (!append) setLinks([]);
          return;
        }

        // Hydrate submitter profiles and category details
        let enriched: LinkWithDetails[] = [];
        if (rawLinks && rawLinks.length > 0) {
          const submitterIds = Array.from(
            new Set(rawLinks.map((l) => l.submitted_by).filter(Boolean))
          ) as string[];

          const profilesMap = new Map<string, any>();
          if (submitterIds.length > 0) {
            const { data: profs } = await supabase
              .from('profiles')
              .select('id, username, email')
              .in('id', submitterIds);
            profs?.forEach((p) => profilesMap.set(p.id, p));
          }

          enriched = rawLinks.map((l) => {
            const detected = detectPlatform(l.url);
            const actualPlatform = (l.platform && l.platform !== 'other') ? l.platform : detected.id;
            const fallbackTitle = l.title || `${detected.label} Post`;
            const embedInfo = resolveEmbedInfo(l.url);
            return {
              ...l,
              platform: actualPlatform,
              title: fallbackTitle,
              embed_type: embedInfo.embedType,
              external_id: embedInfo.externalId,
              resolved_url: embedInfo.permalink || null,
              profile: l.submitted_by ? profilesMap.get(l.submitted_by) || null : null,
              category: categories.find((c) => c.id === l.category_id) || null,
            };
          });

          // Background auto-repair for links with unmigrated platform or missing title/metadata
          rawLinks.forEach((l) => {
            const detected = detectPlatform(l.url);
            if ((l.platform === 'other' && detected.id !== 'other') || !l.title) {
              fetch(`/api/metadata?url=${encodeURIComponent(l.url)}`)
                .then((r) => r.json())
                .then((meta) => {
                  if (meta && meta.title) {
                    supabase
                      .from('links')
                      .update({
                        platform: detected.id,
                        title: meta.title,
                        description: meta.description || null,
                        thumbnail_url: meta.thumbnailUrl || null,
                        updated_at: new Date().toISOString(),
                      })
                      .eq('id', l.id)
                      .then(() => {});
                  }
                })
                .catch(() => {});
            }
          });
        }

        setHasMore(rawLinks ? rawLinks.length === PAGE_SIZE : false);
        setPage(pageIndex);

        if (append) {
          setLinks((prev) => [...prev, ...enriched]);
        } else {
          setLinks(enriched);
        }
      } catch (err) {
        console.error('Feed query error:', err);
      } finally {
        setFeedLoading(false);
        setLoadingMore(false);
      }
    },
    [board, platform, category, member, sort, debouncedSearch, categories, supabase]
  );

  // Trigger PostgreSQL feed query when filters or search change
  useEffect(() => {
    if (board) {
      updateUrlParams(platform, category, member, sort, debouncedSearch);
      fetchLinks(0, false);
    }
  }, [board, platform, category, member, sort, debouncedSearch, fetchLinks, updateUrlParams]);

  // 5. Supabase Realtime Subscription with Filter Matching (User Adjustment 2)
  useEffect(() => {
    if (!board) return;

    const channel = supabase
      .channel(`board-realtime-${board.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'links',
          filter: `board_id=eq.${board.id}`,
        },
        async (payload) => {
          const newRow = payload.new as any;

          // Check if new link matches the active filters
          if (platform && newRow.content_type !== platform) return;
          if (category && newRow.category_id !== category) return;
          if (member && newRow.submitted_by !== member) return;
          if (debouncedSearch.trim()) {
            const s = debouncedSearch.toLowerCase().trim();
            const matches =
              (newRow.title && newRow.title.toLowerCase().includes(s)) ||
              (newRow.url && newRow.url.toLowerCase().includes(s)) ||
              (newRow.description && newRow.description.toLowerCase().includes(s));
            if (!matches) return;
          }

          // Fetch submitter profile
          let prof = null;
          if (newRow.submitted_by) {
            const { data: p } = await supabase
              .from('profiles')
              .select('id, username, email')
              .eq('id', newRow.submitted_by)
              .maybeSingle();
            prof = p;
          }

          const fullLink: LinkWithDetails = {
            ...newRow,
            profile: prof,
            category: categories.find((c) => c.id === newRow.category_id) || null,
          };

          // Prepend to visible feed only when sorting by newest
          if (sort === 'newest') {
            setLinks((prev) => [fullLink, ...prev]);
          } else {
            setLinks((prev) => [...prev, fullLink]);
          }
          showToast('⚡ New link added to board!');
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'links',
          filter: `board_id=eq.${board.id}`,
        },
        (payload) => {
          setLinks((prev) => prev.filter((l) => l.id !== (payload.old as any).id));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'links',
          filter: `board_id=eq.${board.id}`,
        },
        (payload) => {
          const updated = payload.new as any;
          setLinks((prev) =>
            prev.map((l) =>
              l.id === updated.id
                ? {
                    ...l,
                    ...updated,
                    category: categories.find((c) => c.id === updated.category_id) || null,
                  }
                : l
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [board, platform, category, member, sort, debouncedSearch, categories, supabase]);

  // Handlers for Post Actions
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

      if (error && error.code !== '23505') throw error;

      setIsMember(true);
      setMemberCount((c) => c + 1);
      showToast(`🎉 Joined "${board.name}"!`);
    } catch {
      showToast('Error joining board');
    }
  };

  const handleDeletePost = async (linkId: string) => {
    if (!confirm('Are you sure you want to delete this link?')) return;

    try {
      const res = await fetch(`/api/links/${linkId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }

      setLinks((prev) => prev.filter((l) => l.id !== linkId));
      showToast('🗑 Post deleted');
    } catch (err: any) {
      showToast(err.message || 'Error deleting post');
    }
  };

  const handlePostSaved = (updated: LinkWithDetails) => {
    setLinks((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  };

  if (boardLoading) {
    return (
      <div className="container" style={{ paddingTop: '7rem', paddingBottom: '6rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (boardError || !board) {
    return (
      <div className="container" style={{ paddingTop: '7rem', paddingBottom: '6rem', textAlign: 'center' }}>
        <div className="card" style={{ maxWidth: '460px', margin: '0 auto', padding: '3rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
          <h2>Board Not Found</h2>
          <p className="text-secondary" style={{ margin: '1rem 0 1.5rem' }}>
            {boardError || 'This board does not exist or has been removed.'}
          </p>
          <Link href="/boards" className="btn btn-primary">
            Go to Your Boards
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container pt-28" style={{ paddingBottom: '6rem' }}>
      {/* Toast Notification */}
      {toast && (
        <div className="toast-container">
          <div className="toast">{toast}</div>
        </div>
      )}

      {/* 1. Header Component */}
      <BoardHeader
        boardName={board.name}
        boardSlug={board.slug}
        memberCount={memberCount}
        isMember={isMember}
        searchQuery={search}
        onSearchChange={setSearch}
        onJoinBoard={handleJoinBoard}
        onOpenAddModal={() => setShowAddModal(true)}
        onToast={showToast}
      />

      {/* 2. Composable Filter Bar */}
      <FilterBar
        selectedPlatform={platform}
        selectedCategory={category}
        selectedMember={member}
        selectedSort={sort}
        categories={categories}
        members={members}
        onPlatformChange={setPlatform}
        onCategoryChange={setCategory}
        onMemberChange={setMember}
        onSortChange={setSort}
        totalCount={links.length}
      />

      {/* 3. Feed Cards Grid */}
      {feedLoading ? (
        <div className="v2-card-grid">
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : links.length === 0 ? (
        <div className="card empty-state" style={{ marginTop: '2rem' }}>
          <div className="empty-state-icon">📥</div>
          {debouncedSearch || platform || category || member ? (
            <>
              <h3>No matching links found</h3>
              <p style={{ maxWidth: '440px', margin: '0.5rem auto 1.5rem', color: 'var(--color-text-secondary)' }}>
                Try adjusting your search terms or clearing some of the filters above.
              </p>
              <button
                onClick={() => {
                  setPlatform('');
                  setCategory('');
                  setMember('');
                  setSearch('');
                }}
                className="btn btn-secondary btn-sm"
              >
                Clear All Filters
              </button>
            </>
          ) : (
            <>
              <h3>Nothing here yet</h3>
              <p style={{ maxWidth: '440px', margin: '0.5rem auto 1.5rem', color: 'var(--color-text-secondary)' }}>
                Send a link to the Telegram bot or tap + Add Link above and it will appear here.
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
            </>
          )}
        </div>
      ) : (
        <>
          <div className="v2-card-grid">
            {links.map((item) => (
              <FeedCard
                key={item.id}
                link={item}
                currentUserId={currentUser?.id}
                isBoardOwner={isOwner}
                onOpenPreview={(l) => setPreviewLink(l)}
                onEditPost={(l) => setEditingLink(l)}
                onDeletePost={handleDeletePost}
                onToast={showToast}
              />
            ))}
          </div>

          {/* Pagination / Load More */}
          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: '3rem' }}>
              <button
                onClick={() => fetchLinks(page + 1, true)}
                disabled={loadingMore}
                className="btn btn-secondary btn-lg"
                id="load-more-btn"
              >
                {loadingMore ? 'Loading more...' : 'Load More Posts ↓'}
              </button>
            </div>
          )}
        </>
      )}

      {/* Inline Preview Modal / Drawer */}
      <PreviewModal
        link={previewLink}
        onClose={() => setPreviewLink(null)}
        onToast={showToast}
      />

      {/* Edit Post Modal */}
      <EditPostModal
        link={editingLink}
        categories={categories}
        onClose={() => setEditingLink(null)}
        onSave={handlePostSaved}
        onToast={showToast}
      />

      {/* Quick Add Modal */}
      {showAddModal && (
        <QuickAddModal
          boardId={board.id}
          categories={categories}
          currentUserId={currentUser?.id}
          onClose={() => setShowAddModal(false)}
          onAdded={() => fetchLinks(0, false)}
          onToast={showToast}
        />
      )}
    </div>
  );
}
