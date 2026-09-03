'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Sidebar, { SidebarBoard, SidebarMember } from './Sidebar';
import CreateBoardModal from './CreateBoardModal';
import JoinBoardModal from './JoinBoardModal';
import SettingsModal from './SettingsModal';

interface WorkspaceLayoutProps {
  activeSlug?: string;
  activeBoardName?: string;
  boardMembers?: SidebarMember[];
  children: React.ReactNode;
}

export default function WorkspaceLayout({
  activeSlug,
  activeBoardName,
  boardMembers,
  children,
}: WorkspaceLayoutProps) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [boards, setBoards] = useState<SidebarBoard[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchWorkspaceData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user || !isMounted) return;
        setUser(user);

        let prof: any = null;
        try {
          const res = await fetch('/api/me/profile');
          if (res.ok) {
            const json = await res.json();
            prof = json.profile;
          }
        } catch (e) {
          console.warn('Could not fetch profile via /api/me/profile, falling back to direct client:', e);
        }

        if (!prof) {
          const { data: directProf } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
          prof = directProf;
        }

        if (isMounted && prof) {
          setProfile(prof);
        }

        // Fetch user's boards for the sidebar
        const { data: memberRows } = await supabase
          .from('board_members')
          .select('boards ( id, name, slug )')
          .eq('user_id', user.id);

        if (memberRows && isMounted) {
          const boardList: SidebarBoard[] = [];
          memberRows.forEach((row: any) => {
            if (row.boards) {
              boardList.push({
                id: row.boards.id,
                name: row.boards.name,
                slug: row.boards.slug,
              });
            }
          });
          setBoards(boardList);
        }
      } catch (err) {
        console.error('Error loading workspace data:', err);
      }
    }

    fetchWorkspaceData();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const username = profile?.username || user?.email?.split('@')[0] || 'user';
  const email = user?.email || '';
  const isTelegramConnected = Boolean(profile?.telegram_user_id);
  const isWhatsAppConnected = Boolean((profile as any)?.whatsapp_phone_number);

  return (
    <div className="min-h-screen bg-page text-text-primary bg-noise relative flex flex-col">
      {/* Subtle Ambient Lighting Accents */}
      <div className="fixed top-[-10%] left-[20%] w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] bg-primary/10 blur-[130px] rounded-full pointer-events-none mix-blend-screen opacity-40 dark:opacity-20 z-0" />
      <div className="fixed bottom-[-10%] right-[-5%] w-[35vw] h-[35vw] max-w-[450px] max-h-[450px] bg-accent/10 blur-[130px] rounded-full pointer-events-none mix-blend-screen opacity-40 dark:opacity-20 z-0" />

      {/* Main Workspace Frame with Sidebar */}
      <div className="flex-1 flex w-full relative z-10">
        {/* Sidebar Component */}
        <Sidebar
          boards={boards}
          activeSlug={activeSlug}
          activeBoardName={activeBoardName}
          boardMembers={boardMembers}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onCreateBoardClick={() => setShowCreateModal(true)}
          onJoinBoardClick={() => setShowJoinModal(true)}
          onSettingsClick={() => setShowSettingsModal(true)}
          onSignOut={handleSignOut}
          username={username}
          isTelegramConnected={isTelegramConnected}
          isWhatsAppConnected={isWhatsAppConnected}
        />

        {/* Main Content Viewport */}
        <main
          className={`flex-1 flex flex-col min-w-0 px-4 sm:px-8 lg:px-10 ${
            activeSlug ? 'pt-7 sm:pt-9' : 'pt-28 sm:pt-36'
          } pb-16`}
        >
          <div className="w-full max-w-7xl mx-auto flex flex-col">
            {children}
          </div>
        </main>
      </div>

      {/* Workspace Modals */}
      {user && (
        <>
          <CreateBoardModal
            isOpen={showCreateModal}
            onClose={() => {
              setShowCreateModal(false);
              router.refresh();
            }}
            userId={user.id}
          />
          <JoinBoardModal
            isOpen={showJoinModal}
            onClose={() => {
              setShowJoinModal(false);
              router.refresh();
            }}
            userId={user.id}
          />
          <SettingsModal
            isOpen={showSettingsModal}
            onClose={() => setShowSettingsModal(false)}
            username={username}
            email={email}
            isTelegramConnected={isTelegramConnected}
            telegramUsername={profile?.telegram_username || null}
            telegramLinkCode={profile?.telegram_link_code || null}
            isWhatsAppConnected={isWhatsAppConnected}
            onSignOut={handleSignOut}
          />
        </>
      )}
    </div>
  );
}
