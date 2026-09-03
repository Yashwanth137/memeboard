'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Board, Category, LinkWithDetails } from '@/types/database';
import { detectPlatform, normalizePlatform, resolveEmbedInfo } from '@/lib/platform';
import WorkspaceLayout from '@/components/dashboard/WorkspaceLayout';
import { SidebarMember } from '@/components/dashboard/Sidebar';
import BoardHeader from '@/components/board/BoardHeader';
import BoardToolbar from '@/components/board/BoardToolbar';
import PostGrid from '@/components/board/PostGrid';
import EmptyBoard from '@/components/board/EmptyBoard';
import AddLinkModal from '@/components/board/AddLinkModal';
import ShareBoardModal from '@/components/board/ShareBoardModal';
import PreviewModal from '@/components/board/PreviewModal';
import EditPostModal from '@/components/board/EditPostModal';

interface MemberOption {
  id: string;
  name: string;
}

const PAGE_SIZE = 24;

export default function BoardPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params?.slug as string;
  const supabase = createClient();

  // User & Board State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [board, setBoard] = useState<(Board & { owner_username?: string | null }) | null>(null);
  const [memberCount, setMemberCount] = useState<number>(1);
  const [isMember, setIsMember] = useState<boolean>(false);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [boardLoading, setBoardLoading] = useState<boolean>(true);
  const [boardError, setBoardError] = useState<string | null>(null);

  // Dynamic Categories & Board Members
  const [categories, setCategories] = useState<Category[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);

  // Filter & Search State
  const [mediaType, setMediaType] = useState<string>(searchParams.get('type') || '');
  const [platform, setPlatform] = useState<string>(searchParams.get('platform') || '');
  const [member, setMember] = useState<string>(searchParams.get('member') || '');
  const [date, setDate] = useState<string>(searchParams.get('date') || '');
  const [sort, setSort] = useState<'newest' | 'oldest'>(
    (searchParams.get('sort') as 'newest' | 'oldest') || 'newest'
  );
  const [search, setSearch] = useState<string>(searchParams.get('q') || '');
  const [debouncedSearch, setDebouncedSearch] = useState<string>(search);

  // Links & Pagination State
  const [links, setLinks] = useState<LinkWithDetails[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [feedLoading, setFeedLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [page, setPage] = useState<number>(0);

  // Active Modals State
  const [previewLink, setPreviewLink] = useState<LinkWithDetails | null>(null);
  const [editingLink, setEditingLink] = useState<LinkWithDetails | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);

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
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // 2. Sync Active Filters with URL Search Params
  const updateUrlParams = useCallback(
    (newType: string, newPlatform: string, newMember: string, newDate: string, newSort: string, newSearch: string) => {
      const sp = new URLSearchParams();
      if (newType) sp.set('type', newType);
      if (newPlatform) sp.set('platform', newPlatform);
      if (newMember) sp.set('member', newMember);
      if (newDate) sp.set('date', newDate);
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
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user || null;
      setCurrentUser(user);

      // Fetch Board
      const { data: bData, error: bErr } = await supabase
        .from('boards')
        .select('*')
        .eq('slug', slug)
        .single();

      if (bErr || !bData) {
        setBoardError('Board not found.');
        setBoardLoading(false);
        return;
      }

      // Fetch Owner Details
      let ownerUsername: string | null = null;
      if (bData.owner_id) {
        const { data: pData } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', bData.owner_id)
          .single();
        if (pData?.username) ownerUsername = pData.username;
      }

      setBoard({
        ...bData,
        owner_username: ownerUsername,
      });
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

      // Fetch Categories
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

  // Helper: Date filter bounds calculation
  const getDateBounds = useCallback((dKey: string) => {
    if (!dKey) return null;
    const now = new Date();
    if (dKey === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { gte: start.toISOString() };
    }
    if (dKey === 'yesterday') {
      const startYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { gte: startYesterday.toISOString(), lt: startToday.toISOString() };
    }
    if (dKey === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { gte: weekAgo.toISOString() };
    }
    if (dKey === 'month') {
      const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return { gte: startMonth.toISOString() };
    }
    return null;
  }, []);

  // 4. PostgreSQL Filtered & Server-Paginated Feed Query
  const fetchLinks = useCallback(
    async (pageIndex: number = 0, append: boolean = false) => {
      if (!board) return;

      try {
        if (!append) setFeedLoading(true);
        else setLoadingMore(true);

        // A. Count Query for Pagination
        let countQuery = supabase
          .from('links')
          .select('*', { count: 'exact', head: true })
          .eq('board_id', board.id);

        if (mediaType) {
          countQuery = countQuery.eq('content_type', mediaType as 'image' | 'video' | 'link');
        }

        if (platform) {
          if (platform === 'x') {
            countQuery = countQuery.or('platform.eq.x,platform.eq.twitter,url.ilike.%x.com%,url.ilike.%twitter.com%');
          } else {
            countQuery = countQuery.or(`platform.eq.${platform},url.ilike.%${platform}%`);
          }
        }

        if (member) {
          countQuery = countQuery.eq('submitted_by', member);
        }

        const dateBounds = getDateBounds(date);
        if (dateBounds?.gte) {
          countQuery = countQuery.gte('created_at', dateBounds.gte);
        }
        if (dateBounds?.lt) {
          countQuery = countQuery.lt('created_at', dateBounds.lt);
        }

        if (debouncedSearch.trim()) {
          const s = debouncedSearch.trim();
          countQuery = countQuery.or(`title.ilike.%${s}%,url.ilike.%${s}%,description.ilike.%${s}%`);
        }

        const { count: totalPosts } = await countQuery;
        const total = totalPosts || 0;
        setTotalCount(total);
        setHasMore((pageIndex + 1) * PAGE_SIZE < total);

        // B. Data Query
        let query = supabase
          .from('links')
          .select('id, board_id, submitted_by, url, platform, content_type, title, description, thumbnail_url, category_id, created_at, updated_at')
          .eq('board_id', board.id);

        if (mediaType) {
          query = query.eq('content_type', mediaType as 'image' | 'video' | 'link');
        }

        if (platform) {
          if (platform === 'x') {
            query = query.or('platform.eq.x,platform.eq.twitter,url.ilike.%x.com%,url.ilike.%twitter.com%');
          } else {
            query = query.or(`platform.eq.${platform},url.ilike.%${platform}%`);
          }
        }

        if (member) {
          query = query.eq('submitted_by', member);
        }

        if (dateBounds?.gte) {
          query = query.gte('created_at', dateBounds.gte);
        }
        if (dateBounds?.lt) {
          query = query.lt('created_at', dateBounds.lt);
        }

        if (debouncedSearch.trim()) {
          const s = debouncedSearch.trim();
          query = query.or(`title.ilike.%${s}%,url.ilike.%${s}%,description.ilike.%${s}%`);
        }

        if (sort === 'oldest') {
          query = query.order('created_at', { ascending: true });
        } else {
          query = query.order('created_at', { ascending: false });
        }

        const from = pageIndex * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        query = query.range(from, to);

        const { data: rawLinks, error: linksErr } = await query;

        if (linksErr) {
          console.error('Error querying links in PostgreSQL:', linksErr);
          if (!append) setLinks([]);
          return;
        }

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
            const normalized = normalizePlatform(l.platform || detected.id);
            const actualPlatform = normalized !== 'other' ? normalized : detected.id;
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

          // Background auto-repair for links with unmigrated platform, content_type, or missing title/metadata
          rawLinks.forEach((l) => {
            const detected = detectPlatform(l.url);
            const normalized = normalizePlatform(l.platform);
            const isReddit = detected.id === 'reddit';
            const isKnownVideo =
              l.content_type === 'video' ||
              detected.id === 'youtube' ||
              detected.id === 'tiktok' ||
              l.url.includes('v.redd.it') ||
              Boolean(l.url.match(/\.(mp4|webm|mov|m3u8)(\?.*)?$/i)) ||
              Boolean(l.url.match(/\/(reel|reels|shorts|clip|clips)\//i));

            const needsRepair =
              normalized !== l.platform ||
              !l.title ||
              (isReddit && l.content_type !== 'video') ||
              (isKnownVideo && l.content_type !== 'video');

            if (needsRepair) {
              fetch(`/api/metadata?url=${encodeURIComponent(l.url)}`)
                .then((r) => r.json())
                .then((meta) => {
                  if (meta && meta.title) {
                    const resolvedType = meta.contentType || (isKnownVideo ? 'video' : l.content_type);
                    
                    // Immediately update local React state so UI reflects it without page reload
                    setLinks((prev) =>
                      prev.map((item) =>
                        item.id === l.id
                          ? {
                              ...item,
                              platform: detected.id,
                              content_type: resolvedType,
                              title: meta.title,
                              description: meta.description || item.description,
                              thumbnail_url: meta.thumbnailUrl || item.thumbnail_url,
                            }
                          : item
                      )
                    );

                    supabase
                      .from('links')
                      .update({
                        platform: detected.id,
                        content_type: resolvedType,
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

        if (append) {
          setLinks((prev) => [...prev, ...enriched]);
        } else {
          setLinks(enriched);
        }
      } catch (err: any) {
        console.error('Failed to fetch board links:', err);
      } finally {
        setFeedLoading(false);
        setLoadingMore(false);
      }
    },
    [board, mediaType, platform, member, date, sort, debouncedSearch, categories, getDateBounds, supabase]
  );

  // Trigger feed reload on filter or board changes
  useEffect(() => {
    if (board) {
      updateUrlParams(mediaType, platform, member, date, sort, search);
      setPage(0);
      fetchLinks(0, false);
    }
  }, [board, mediaType, platform, member, date, sort, debouncedSearch, fetchLinks, updateUrlParams]);

  // 5. Supabase Realtime Subscription (postgres_changes)
  useEffect(() => {
    if (!board) return;

    const channel = supabase
      .channel(`board-realtime:${board.id}`)
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
          let profile = null;
          if (newRow.submitted_by) {
            const { data: p } = await supabase
              .from('profiles')
              .select('id, username, email')
              .eq('id', newRow.submitted_by)
              .single();
            profile = p;
          }

          const detected = detectPlatform(newRow.url);
          const embedInfo = resolveEmbedInfo(newRow.url);

          const enrichedItem: LinkWithDetails = {
            ...newRow,
            platform: detected.id,
            title: newRow.title || `${detected.label} Post`,
            embed_type: embedInfo.embedType,
            external_id: embedInfo.externalId,
            resolved_url: embedInfo.permalink || null,
            profile,
            category: categories.find((c) => c.id === newRow.category_id) || null,
          };

          // If sort is newest, prepend to current links
          if (sort === 'newest') {
            setLinks((prev) => [enrichedItem, ...prev]);
          }
          setTotalCount((prev) => prev + 1);
          showToast('✨ New post added to this board!');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [board, categories, sort, supabase]);

  // Handler: Join Board
  const handleJoinBoard = async () => {
    if (!board) return;
    if (!currentUser) {
      showToast('Please sign in to join this board');
      return;
    }

    try {
      const { error } = await supabase.from('board_members').insert({
        board_id: board.id,
        user_id: currentUser.id,
      });

      if (error) {
        if (error.code === '23505') {
          setIsMember(true);
          showToast('You are already a member of this board!');
          return;
        }
        throw error;
      }

      setIsMember(true);
      setMemberCount((prev) => prev + 1);
      showToast('🎉 Successfully joined board!');
    } catch (err: any) {
      showToast(err.message || 'Error joining board');
    }
  };

  // Handler: Delete Post
  const handleDeletePost = async (linkId: string) => {
    if (!confirm('Are you sure you want to remove this post?')) return;

    try {
      const res = await fetch(`/api/links/${linkId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }

      setLinks((prev) => prev.filter((l) => l.id !== linkId));
      setTotalCount((prev) => Math.max(0, prev - 1));
      showToast('🗑 Post deleted');
    } catch (err: any) {
      showToast(err.message || 'Error deleting post');
    }
  };

  const handlePostSaved = (updated: LinkWithDetails) => {
    setLinks((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  };

  const handleClearAllFilters = () => {
    setMediaType('');
    setPlatform('');
    setMember('');
    setDate('');
    setSort('newest');
    setSearch('');
    setPage(0);
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchLinks(nextPage, true);
  };

  const isFiltered = Boolean(mediaType || platform || member || date || debouncedSearch || sort !== 'newest');

  // Next / Previous Navigation for PreviewModal
  const currentPreviewIndex = previewLink ? links.findIndex((l) => l.id === previewLink.id) : -1;
  const hasNext = currentPreviewIndex >= 0 && currentPreviewIndex < links.length - 1;
  const hasPrevious = currentPreviewIndex > 0;
  const handleNext = () => {
    if (hasNext) setPreviewLink(links[currentPreviewIndex + 1]);
  };
  const handlePrevious = () => {
    if (hasPrevious) setPreviewLink(links[currentPreviewIndex - 1]);
  };

  // Format members for sidebar
  const sidebarMembers: SidebarMember[] = members.map((m) => ({
    id: m.id,
    username: m.name.replace(/^@/, ''),
  }));

  if (boardLoading) {
    return (
      <WorkspaceLayout activeSlug={slug} activeBoardName={board?.name} boardMembers={sidebarMembers}>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-3.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div
              key={i}
              className="flex flex-col bg-surface rounded-xl border border-border-subtle overflow-hidden h-[240px]"
            >
              <div className="w-full aspect-[16/10] bg-surface-elevated animate-pulse border-b border-border-subtle/80" />
              <div className="p-2.5 flex flex-col gap-1.5 flex-1">
                <div className="h-3.5 w-3/4 bg-surface-elevated rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-surface-elevated rounded animate-pulse" />
                <div className="mt-auto flex items-center justify-between pt-1.5 border-t border-border-subtle/40">
                  <div className="w-14 h-2.5 bg-surface-elevated rounded animate-pulse" />
                  <div className="w-3.5 h-3.5 bg-surface-elevated rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </WorkspaceLayout>
    );
  }

  if (boardError || !board) {
    return (
      <WorkspaceLayout activeSlug={slug}>
        <div className="w-full py-20 px-4 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-3xl bg-surface border border-border-subtle flex items-center justify-center text-3xl mb-4 shadow-sm">
            🔍
          </div>
          <h2 className="text-2xl font-extrabold text-text-primary tracking-tight mb-2">
            Board Not Found
          </h2>
          <p className="text-sm text-text-secondary max-w-sm mb-6">
            {boardError || 'This board does not exist or has been removed.'}
          </p>
          <Link
            href="/boards"
            className="px-6 py-2.5 rounded-xl bg-primary text-white font-extrabold text-xs shadow-xs hover:opacity-90 active:scale-95 transition-all"
          >
            Go to Your Boards
          </Link>
        </div>
      </WorkspaceLayout>
    );
  }

  return (
    <WorkspaceLayout activeSlug={slug} activeBoardName={board?.name} boardMembers={sidebarMembers}>
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in pointer-events-none">
          <div className="px-4 py-3 rounded-2xl bg-surface border border-border-subtle text-text-primary text-xs font-bold shadow-xl flex items-center gap-2">
            <span>{toast}</span>
          </div>
        </div>
      )}

      {/* 1. Compressed Header Component with Board Identity & Board Actions */}
      <BoardHeader
        boardName={board.name}
        boardSlug={board.slug}
        memberCount={memberCount}
        postCount={totalCount || links.length}
        isMember={isMember}
        creatorName={board.owner_username}
        onJoinBoard={handleJoinBoard}
        onOpenAddModal={() => setShowAddModal(true)}
        onOpenShareModal={() => setShowShareModal(true)}
        onToast={showToast}
      />

      {/* 2. Final Toolbar: All/Images/Videos + Platform/Member/Date/Sort Dropdowns */}
      <BoardToolbar
        selectedMediaType={mediaType}
        selectedPlatform={platform}
        selectedMember={member}
        selectedDate={date}
        selectedSort={sort}
        members={members}
        searchQuery={search}
        onMediaTypeChange={(t) => {
          setMediaType(t);
        }}
        onPlatformChange={(p) => {
          setPlatform(p);
        }}
        onMemberChange={(m) => {
          setMember(m);
        }}
        onDateChange={(d) => {
          setDate(d);
        }}
        onSortChange={(s) => {
          setSort(s);
        }}
        onSearchChange={setSearch}
        onClearAllFilters={handleClearAllFilters}
      />

      {/* 3. Post Grid or Empty / Filter-Empty State */}
      {feedLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-3.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div
              key={i}
              className="flex flex-col bg-surface rounded-xl border border-border-subtle overflow-hidden h-[240px]"
            >
              <div className="w-full aspect-[16/10] bg-surface-elevated animate-pulse border-b border-border-subtle/80" />
              <div className="p-2.5 flex flex-col gap-1.5 flex-1">
                <div className="h-3.5 w-3/4 bg-surface-elevated rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-surface-elevated rounded animate-pulse" />
                <div className="mt-auto flex items-center justify-between pt-1.5 border-t border-border-subtle/40">
                  <div className="w-14 h-2.5 bg-surface-elevated rounded animate-pulse" />
                  <div className="w-3.5 h-3.5 bg-surface-elevated rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : links.length === 0 ? (
        <EmptyBoard
          onAddClick={() => setShowAddModal(true)}
          isFiltered={isFiltered}
          onClearFilters={handleClearAllFilters}
        />
      ) : (
        <PostGrid
          links={links}
          currentUserId={currentUser?.id}
          isBoardOwner={isOwner}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onLoadMore={handleLoadMore}
          onOpenPreview={(l) => setPreviewLink(l)}
          onEditPost={(l) => setEditingLink(l)}
          onDeletePost={handleDeletePost}
          onToast={showToast}
        />
      )}

      {/* Full-Screen Media Preview Modal with Next/Previous Navigation */}
      <PreviewModal
        link={previewLink}
        onClose={() => setPreviewLink(null)}
        onToast={showToast}
        hasNext={hasNext}
        hasPrevious={hasPrevious}
        onNext={handleNext}
        onPrevious={handlePrevious}
      />

      {/* Edit Post Modal */}
      <EditPostModal
        link={editingLink}
        categories={categories}
        onClose={() => setEditingLink(null)}
        onSave={handlePostSaved}
        onToast={showToast}
      />

      {/* Add Link Modal */}
      <AddLinkModal
        isOpen={showAddModal}
        boardId={board.id}
        boardName={board.name}
        categories={categories}
        currentUserId={currentUser?.id}
        onClose={() => setShowAddModal(false)}
        onAdded={() => fetchLinks(0, false)}
        onToast={showToast}
      />

      {/* Share Board Modal */}
      <ShareBoardModal
        isOpen={showShareModal}
        boardName={board.name}
        boardSlug={board.slug}
        onClose={() => setShowShareModal(false)}
        onToast={showToast}
      />
    </WorkspaceLayout>
  );
}
