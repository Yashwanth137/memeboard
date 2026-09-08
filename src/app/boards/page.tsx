'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Plus } from 'lucide-react';
import WorkspaceLayout, { useWorkspace } from '@/components/dashboard/WorkspaceLayout';
import BoardCard from '@/components/dashboard/BoardCard';
import CreateBoardModal from '@/components/dashboard/CreateBoardModal';
import EmptyBoards from '@/components/dashboard/EmptyBoards';

import {
  getBoardsCache,
  setBoardsCache,
  invalidateBoardsCache,
} from '@/lib/cache/boards-cache';

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

function BoardsBody({
  loading,
  boards,
  onCreateClick,
}: {
  loading: boolean;
  boards: Board[];
  onCreateClick: () => void;
}) {
  const workspace = useWorkspace();

  return (
    <>
      {/* Contextual Header: Strictly Aligned with Board Grid */}
      <div className="flex items-end justify-between gap-4 mb-5 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary mb-1">
            Your Boards
          </h1>
          <p className="text-xs sm:text-sm font-medium text-text-secondary">
            The places your group keeps things.
          </p>
        </div>

        {/* Visually Subordinate Secondary CTA */}
        <button
          onClick={onCreateClick}
          className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-surface hover:bg-surface-elevated border border-border-subtle text-text-secondary hover:text-text-primary text-xs font-bold transition-colors shadow-2xs"
          title="Create a new board"
        >
          <Plus className="w-3.5 h-3.5 text-primary" />
          <span>New Board</span>
        </button>
      </div>

      {/* Board Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 w-full">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex flex-col bg-surface rounded-[24px] border border-border-subtle overflow-hidden h-[340px]"
            >
              <div className="aspect-[16/10] w-full bg-surface-elevated animate-pulse border-b border-border-subtle/80" />
              <div className="p-5 flex flex-col gap-3.5 flex-1">
                <div className="h-6 w-3/4 bg-surface-elevated rounded-md animate-pulse" />
                <div className="h-4 w-1/2 bg-surface-elevated rounded animate-pulse" />
                <div className="mt-auto flex items-center justify-between pt-3">
                  <div className="w-7 h-7 rounded-full bg-surface-elevated animate-pulse" />
                  <div className="h-3 w-1/4 bg-surface-elevated rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : boards.length === 0 ? (
        <EmptyBoards onCreateClick={onCreateClick} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 w-full">
          {boards.map((board) => (
            <BoardCard
              key={board.id}
              id={board.id}
              name={board.name}
              slug={board.slug}
              member_count={board.member_count}
              link_count={board.link_count}
              thumbnails={board.thumbnails}
              members={board.members}
            />
          ))}
        </div>
      )}
    </>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push('/login?redirect=/boards');
          return;
        }
        if (active) setUser(user);

        // 1. Instant Cache Hydration (0ms render on back-navigation)
        const cached = getBoardsCache(user.id);
        if (cached && active) {
          setBoards(cached);
          setLoading(false);
        }

        // 2. Fetch fresh board memberships
        const { data: memberRows, error: memberErr } = await supabase
          .from('board_members')
          .select('role, boards ( id, name, slug, owner_id, created_at )')
          .eq('user_id', user.id);

        if (memberErr || !memberRows) {
          if (!cached && active) {
            setBoards([]);
            setLoading(false);
          }
          return;
        }

        const validBoards = memberRows
          .filter((row: any) => Boolean(row.boards))
          .map((row: any) => ({
            role: row.role,
            board: row.boards as { id: string; name: string; slug: string; owner_id: string; created_at: string },
          }));

        if (validBoards.length === 0) {
          if (active) {
            setBoards([]);
            setLoading(false);
          }
          setBoardsCache(user.id, []);
          return;
        }

        // 3. Parallelize count and thumbnail queries across all boards concurrently
        const boardDetails = await Promise.all(
          validBoards.map(async ({ role, board: b }) => {
            const [memberRes, linkRes, thumbsRes, membersRes] = await Promise.all([
              supabase
                .from('board_members')
                .select('*', { count: 'exact', head: true })
                .eq('board_id', b.id),
              supabase
                .from('links')
                .select('*', { count: 'exact', head: true })
                .eq('board_id', b.id),
              supabase
                .from('links')
                .select('thumbnail_url')
                .eq('board_id', b.id)
                .not('thumbnail_url', 'is', null)
                .neq('thumbnail_url', '')
                .order('created_at', { ascending: false })
                .limit(4),
              supabase
                .from('board_members')
                .select('user_id')
                .eq('board_id', b.id)
                .limit(5),
            ]);

            const memberUids =
              membersRes.data
                ?.map((m) => m.user_id)
                .filter((u): u is string => Boolean(u)) || [];

            return {
              ...b,
              role,
              member_count: memberRes.count || 1,
              link_count: linkRes.count || 0,
              thumbnails:
                thumbsRes.data
                  ?.map((l) => l.thumbnail_url)
                  .filter((t): t is string => Boolean(t)) || [],
              memberUids,
            };
          })
        );

        // 4. Batch fetch all member usernames across all boards in a single query
        const allUserIds = Array.from(
          new Set(boardDetails.flatMap((bd) => bd.memberUids))
        );

        const profilesMap = new Map<string, string>();
        if (allUserIds.length > 0) {
          const { data: profs } = await supabase
            .from('public_profiles')
            .select('id, username')
            .in('id', allUserIds);

          if (profs) {
            profs.forEach((p) => {
              if (p.id && p.username) profilesMap.set(p.id, p.username);
            });
          }
        }

        const finalBoardList: Board[] = boardDetails.map((bd) => {
          const memberUsernames = bd.memberUids
            .map((uid) => profilesMap.get(uid))
            .filter((u): u is string => Boolean(u));

          const { memberUids, ...rest } = bd;
          return {
            ...rest,
            members: memberUsernames,
          };
        });

        if (active) {
          setBoards(finalBoardList);
          setLoading(false);
        }
        setBoardsCache(user.id, finalBoardList);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, [supabase, router, refreshKey]);

  return (
    <WorkspaceLayout>
      <BoardsBody
        loading={loading}
        boards={boards}
        onCreateClick={() => setShowCreateModal(true)}
      />

      {user && (
        <CreateBoardModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            invalidateBoardsCache(user.id);
            setRefreshKey((k) => k + 1);
          }}
          userId={user.id}
        />
      )}
    </WorkspaceLayout>
  );
}
