'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Menu, X, Plus, Compass, LayoutGrid, Settings, LogOut } from 'lucide-react';
import Sidebar, { SidebarBoard, SidebarMember } from './Sidebar';
import CreateBoardModal from './CreateBoardModal';
import JoinBoardModal from './JoinBoardModal';
import ConnectionStatus from './ConnectionStatus';
import ThemeToggle from '@/components/ThemeToggle';

export interface WorkspaceContextType {
  user: any;
  profile: any;
  isTelegramConnected: boolean;
  telegramUsername: string | null;
  telegramLinkCode: string | null;
  openSettings: () => void;
  openCreateBoard: () => void;
  openJoinBoard: () => void;
  refreshWorkspace: () => Promise<void>;
}

export const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export function useWorkspace() {
  return useContext(WorkspaceContext);
}

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
  const pathname = usePathname();
  const isSettings = pathname === '/settings';
  const [supabase] = useState(() => createClient());

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [boards, setBoards] = useState<SidebarBoard[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  const fetchWorkspaceData = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;
      setUser(user);

      let prof: any = null;
      try {
        const res = await fetch('/api/me/profile');
        if (res.ok) {
          const json = await res.json();
          prof = json.profile;
        } else {
          console.error('Failed to fetch profile via /api/me/profile:', res.status);
        }
      } catch (e) {
        console.error('Could not fetch profile via /api/me/profile:', e);
      }

      // Resilient fallback to safe public_profiles if /api/me/profile is unreachable
      if (!prof) {
        try {
          const { data: publicProf } = await supabase
            .from('public_profiles')
            .select('id, username, created_at')
            .eq('id', user.id)
            .maybeSingle();
          if (publicProf) {
            prof = publicProf;
          }
        } catch (e) {
          console.error('Could not fetch fallback public_profile:', e);
        }
      }

      if (prof) {
        setProfile(prof);
      }

      // Fetch user's boards for the sidebar
      const { data: memberRows } = await supabase
        .from('board_members')
        .select('boards ( id, name, slug )')
        .eq('user_id', user.id);

      if (memberRows) {
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
  }, [supabase]);

  useEffect(() => {
    fetchWorkspaceData();
  }, [fetchWorkspaceData]);

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
    <div
      className={`${
        isSettings ? 'h-screen overflow-hidden' : 'min-h-screen'
      } bg-page text-text-primary bg-noise relative flex flex-col overflow-x-hidden`}
    >
      {/* Subtle Ambient Lighting Accents */}
      <div className="fixed top-[-10%] left-[20%] w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] bg-primary/10 blur-[130px] rounded-full pointer-events-none mix-blend-screen opacity-40 dark:opacity-20 z-0" />
      <div className="fixed bottom-[-10%] right-[-5%] w-[35vw] h-[35vw] max-w-[450px] max-h-[450px] bg-accent/10 blur-[130px] rounded-full pointer-events-none mix-blend-screen opacity-40 dark:opacity-20 z-0" />

      {/* Mobile Top Header (< md) - Clean Brand + Menu button for 320px+ */}
      <header className="flex md:hidden sticky top-0 left-0 right-0 z-30 h-14 bg-surface/95 dark:bg-surface-elevated/95 backdrop-blur-md border-b border-border-subtle/80 px-4 items-center justify-between shrink-0">
        <Link href="/boards" className="flex items-center gap-2 group">
          <Zap className="w-4 h-4 text-primary shrink-0 group-hover:scale-110 transition-transform" fill="currentColor" />
          <span className="font-extrabold tracking-tight text-text-primary text-sm tracking-wider">
            MEMEBOARD
          </span>
        </Link>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 -mr-1 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Mobile Navigation Drawer Sheet (< md) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Drawer Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative w-[280px] max-w-[85vw] h-full bg-surface dark:bg-surface-elevated border-l border-border-subtle shadow-2xl flex flex-col p-4 sm:p-5 overflow-y-auto z-10 select-none"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-border-subtle/70">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary shrink-0" fill="currentColor" />
                  <span className="font-extrabold tracking-tight text-text-primary text-sm tracking-wider">
                    MEMEBOARD
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
                  aria-label="Close navigation menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* User Profile Card */}
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-surface-elevated/70 border border-border-subtle/50 my-3.5">
                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-extrabold uppercase shrink-0">
                  {username?.charAt(0) || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-text-primary truncate">
                    @{username || 'user'}
                  </div>
                  {email && (
                    <div className="text-[10px] text-text-secondary/70 truncate">
                      {email}
                    </div>
                  )}
                </div>
              </div>

              {/* Primary Actions inside Drawer */}
              <div className="space-y-2 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowCreateModal(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs shadow-md transition-all active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New Board</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowJoinModal(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-surface-elevated hover:bg-surface-elevated/80 border border-border-subtle text-text-primary font-bold text-xs transition-colors"
                >
                  <Compass className="w-4 h-4 text-accent" />
                  <span>Join Board</span>
                </button>
              </div>

              {/* Navigation Links */}
              <div className="space-y-1">
                <div className="px-2 mb-1 text-[9px] font-extrabold tracking-widest uppercase text-text-secondary/50">
                  Navigation
                </div>
                <Link
                  href="/boards"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    pathname === '/boards'
                      ? 'bg-primary/10 text-primary font-bold shadow-2xs'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated/60'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4 shrink-0" />
                  <span>My Boards</span>
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    isSettings
                      ? 'bg-primary/10 text-primary font-bold shadow-2xs'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated/60'
                  }`}
                >
                  <Settings className="w-4 h-4 shrink-0" />
                  <span>Settings</span>
                </Link>
              </div>

              {/* Your Boards Quick Access (if user has boards) */}
              {boards.length > 0 && (
                <div className="mt-4 flex flex-col min-h-0">
                  <div className="px-2 mb-1 text-[9px] font-extrabold tracking-widest uppercase text-text-secondary/50 flex items-center justify-between">
                    <span>Your Boards</span>
                    <span className="text-[9px] font-bold text-text-secondary/70 bg-surface-elevated px-1.5 py-0.5 rounded border border-border-subtle/40">
                      {boards.length}
                    </span>
                  </div>
                  <div className="space-y-0.5 max-h-[20vh] overflow-y-auto [scrollbar-width:none]">
                    {boards.map((b) => (
                      <Link
                        key={b.id}
                        href={`/b/${b.slug}`}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium truncate ${
                          activeSlug === b.slug
                            ? 'bg-primary/10 text-primary font-bold'
                            : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated/50'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
                        <span className="truncate">{b.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Drawer Footer */}
              <div className="mt-auto pt-4 border-t border-border-subtle/70 space-y-2.5">
                <ConnectionStatus
                  collapsed={false}
                  isTelegramConnected={isTelegramConnected}
                  isWhatsAppConnected={isWhatsAppConnected}
                  onOpenSettings={() => {
                    setMobileMenuOpen(false);
                    router.push('/settings');
                  }}
                />

                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-surface-elevated/50 border border-border-subtle/40 text-xs">
                  <span className="font-semibold text-text-secondary text-xs">Theme</span>
                  <ThemeToggle />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleSignOut();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-text-secondary hover:text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Workspace Frame with Sidebar */}
      <div className="flex-1 flex w-full relative z-10 overflow-hidden h-full">
        {/* Persistent Sidebar Component (hidden on mobile, persistent on tablet/desktop md+) */}
        <Sidebar
          boards={boards}
          activeSlug={activeSlug}
          activeBoardName={activeBoardName}
          boardMembers={boardMembers}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onCreateBoardClick={() => setShowCreateModal(true)}
          onJoinBoardClick={() => setShowJoinModal(true)}
          onSettingsClick={() => router.push('/settings')}
          onSignOut={handleSignOut}
          username={username}
          isTelegramConnected={isTelegramConnected}
          isWhatsAppConnected={isWhatsAppConnected}
        />

        {/* Main Content Viewport */}
        <main
          className={`flex-1 flex flex-col min-w-0 w-full px-4 sm:px-8 lg:px-10 ${
            isSettings
              ? 'py-6 sm:py-10 overflow-y-auto'
              : 'pt-4 sm:pt-9 pb-12 sm:pb-16'
          }`}
        >
          <div className="w-full max-w-6xl mx-auto flex flex-col min-w-0">
            <WorkspaceContext.Provider
              value={{
                user,
                profile,
                isTelegramConnected,
                telegramUsername: profile?.telegram_username || null,
                telegramLinkCode: profile?.telegram_link_code || null,
                openSettings: () => router.push('/settings'),
                openCreateBoard: () => setShowCreateModal(true),
                openJoinBoard: () => setShowJoinModal(true),
                refreshWorkspace: fetchWorkspaceData,
              }}
            >
              {children}
            </WorkspaceContext.Provider>
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
        </>
      )}
    </div>
  );
}
