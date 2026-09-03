'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Plus } from 'lucide-react';
import WorkspaceLayout from '@/components/dashboard/WorkspaceLayout';
import BoardCard from '@/components/dashboard/BoardCard';
import CreateBoardModal from '@/components/dashboard/CreateBoardModal';
import EmptyBoards from '@/components/dashboard/EmptyBoards';

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

        const { data: memberRows } = await supabase
          .from('board_members')
          .select('role, boards ( id, name, slug, owner_id, created_at )')
          .eq('user_id', user.id);

        if (memberRows && active) {
          const boardList: Board[] = [];
          for (const row of memberRows) {
            const b = (row as any).boards;
            if (b) {
              const { count: memberCount } = await supabase
                .from('board_members')
                .select('*', { count: 'exact', head: true })
                .eq('board_id', b.id);

              const { count: linkCount } = await supabase
                .from('links')
                .select('*', { count: 'exact', head: true })
                .eq('board_id', b.id);

              const { data: recentLinks } = await supabase
                .from('links')
                .select('thumbnail_url')
                .eq('board_id', b.id)
                .not('thumbnail_url', 'is', null)
                .neq('thumbnail_url', '')
                .order('created_at', { ascending: false })
                .limit(4);

              const { data: membersData } = await supabase
                .from('board_members')
                .select('user_id')
                .eq('board_id', b.id)
                .limit(5);

              let memberUsernames: string[] = [];
              if (membersData && membersData.length > 0) {
                const uids = membersData.map((m) => m.user_id).filter(Boolean);
                const { data: profs } = await supabase
                  .from('public_profiles')
                  .select('username')
                  .in('id', uids);
                memberUsernames =
                  profs
                    ?.map((p) => p.username)
                    .filter((u): u is string => Boolean(u)) || [];
              }

              boardList.push({
                ...b,
                role: row.role,
                member_count: memberCount || 1,
                link_count: linkCount || 0,
                thumbnails: recentLinks?.map((l) => l.thumbnail_url).filter(Boolean) || [],
                members: memberUsernames,
              });
            }
          }
          if (active) setBoards(boardList);
        }
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
      {/* Contextual Header: Strictly Aligned with Board Grid */}
      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary mb-1">
            Your Boards
          </h1>
          <p className="text-sm font-medium text-text-secondary">
            The places your group keeps things.
          </p>
        </div>

        {/* Visually Subordinate Secondary CTA */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-surface hover:bg-surface-elevated border border-border-subtle text-text-secondary hover:text-text-primary text-xs font-bold transition-colors shadow-2xs"
          title="Create a new board"
        >
          <Plus className="w-3.5 h-3.5 text-primary" />
          <span>New Board</span>
        </button>
      </div>

      {/* Board Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
        <EmptyBoards onCreateClick={() => setShowCreateModal(true)} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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

      {user && (
        <CreateBoardModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setRefreshKey((k) => k + 1);
          }}
          userId={user.id}
        />
      )}
    </WorkspaceLayout>
  );
}
