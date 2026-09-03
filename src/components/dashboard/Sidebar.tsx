'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutGrid,
  Plus,
  Compass,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Zap,
  User as UserIcon,
  Users,
  X,
} from 'lucide-react';
import ConnectionStatus from './ConnectionStatus';

export interface SidebarBoard {
  id: string;
  name: string;
  slug: string;
}

export interface SidebarMember {
  id: string;
  username: string;
}

interface SidebarProps {
  boards: SidebarBoard[];
  activeSlug?: string;
  activeBoardName?: string;
  boardMembers?: SidebarMember[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  onCreateBoardClick: () => void;
  onJoinBoardClick: () => void;
  onSettingsClick: () => void;
  onSignOut: () => void;
  username: string;
  provider?: string;
  isAgentConnected?: boolean;
}

const AVATAR_COLORS = [
  'bg-purple-500/20 text-purple-400 border-purple-500/40',
  'bg-blue-500/20 text-blue-400 border-blue-500/40',
  'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  'bg-amber-500/20 text-amber-400 border-amber-500/40',
  'bg-rose-500/20 text-rose-400 border-rose-500/40',
];

export default function Sidebar({
  boards,
  activeSlug,
  activeBoardName,
  boardMembers = [],
  collapsed,
  onToggleCollapse,
  onCreateBoardClick,
  onJoinBoardClick,
  onSettingsClick,
  onSignOut,
  username,
  provider = 'WhatsApp',
  isAgentConnected = true,
}: SidebarProps) {
  const pathname = usePathname();
  const isMyBoardsActive = pathname === '/boards';
  const [showAllMembersModal, setShowAllMembersModal] = useState(false);

  // Active board name fallback if not passed directly
  const currentBoard = boards.find((b) => b.slug === activeSlug);
  const displayBoardName = activeBoardName || currentBoard?.name;

  return (
    <>
      {/* Structural layout spacer to preserve document flow & main workspace bounds */}
      <motion.div
        animate={{ width: collapsed ? 72 : 232 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="shrink-0"
        aria-hidden="true"
      />

      {/* Fixed, Non-scrollable Viewport-Pinned Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 232 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 left-0 bottom-0 h-screen z-30 overflow-hidden flex flex-col pointer-events-auto shadow-xs"
      >
        <div className="flex flex-col h-full bg-surface/95 dark:bg-surface-elevated/90 backdrop-blur-md border-r border-border-subtle/80 select-none overflow-hidden">
          {/* Brand / Logo Header with Collapse/Expand Arrow */}
          <div className="h-14 px-3.5 flex items-center justify-between border-b border-border-subtle/70 shrink-0">
            {!collapsed ? (
              <div className="flex items-center gap-2 pl-1 overflow-hidden">
                <Zap className="w-4 h-4 text-primary shrink-0" fill="currentColor" />
                <span className="font-extrabold tracking-tight text-text-primary text-sm tracking-wider">
                  MEMEBOARD
                </span>
              </div>
            ) : (
              <div className="w-full flex items-center justify-center">
                <Zap className="w-4 h-4 text-primary" fill="currentColor" />
              </div>
            )}

            {/* Single Collapse/Expand Toggle Arrow */}
            <button
              onClick={onToggleCollapse}
              className="p-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Middle Area: Clean Navigation & Contextual Members */}
          <div className="flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-2.5 flex flex-col justify-between">
            <div className="space-y-3.5 flex flex-col min-h-0">
              {/* 1. Section: YOUR BOARDS */}
              <div className="flex flex-col min-h-0 pt-1">
                {!collapsed && (
                  <div className="px-2 mb-1.5 text-[10px] font-extrabold tracking-widest uppercase text-text-secondary/60 flex items-center justify-between shrink-0">
                    <span>Your Boards</span>
                    <span className="text-[10px] font-bold text-text-secondary/70 bg-surface-elevated px-1.5 py-0.5 rounded border border-border-subtle/40">
                      {boards.length}
                    </span>
                  </div>
                )}
                <div className="space-y-0.5 max-h-[28vh] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {boards.map((b) => {
                    const isActive = activeSlug === b.slug;
                    return (
                      <Link
                        key={b.id}
                        href={`/b/${b.slug}`}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all truncate group ${
                          isActive
                            ? 'bg-primary/10 dark:bg-primary/20 text-primary border border-primary/25 shadow-2xs font-bold'
                            : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated/70'
                        } ${collapsed ? 'justify-center px-0' : ''}`}
                        title={b.name}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 transition-transform group-hover:scale-125 ${
                            isActive ? 'bg-primary' : 'bg-primary/40'
                          }`}
                        />
                        {!collapsed && <span className="truncate">{b.name}</span>}
                      </Link>
                    );
                  })}

                  {boards.length === 0 && !collapsed && (
                    <div className="px-2.5 py-2 text-[11px] font-medium text-text-secondary/50 italic">
                      No boards yet
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Contextual Section: ACTIVE BOARD MEMBERS (Shown when on a board) */}
              {activeSlug && boardMembers.length > 0 && (
                <>
                  <div className="h-px bg-border-subtle/50 mx-1 shrink-0" />
                  <div className="flex flex-col min-h-0">
                    {!collapsed ? (
                      <div className="px-2 mb-1.5 flex items-center justify-between shrink-0">
                        <div className="flex flex-col min-w-0">
                          {displayBoardName && (
                            <span className="text-[10px] font-extrabold text-text-primary truncate max-w-[130px] leading-tight">
                              {displayBoardName}
                            </span>
                          )}
                          <span className="text-[9px] font-bold tracking-wider uppercase text-text-secondary/60">
                            Members
                          </span>
                        </div>
                        <span className="text-[9px] font-bold text-text-secondary/70 bg-surface-elevated px-1.5 py-0.5 rounded border border-border-subtle/40">
                          {boardMembers.length}
                        </span>
                      </div>
                    ) : (
                      <div className="w-full flex justify-center mb-1">
                        <Users className="w-3.5 h-3.5 text-text-secondary/60" />
                      </div>
                    )}

                    {/* Member Avatars / List */}
                    <div className="space-y-1">
                      {boardMembers.slice(0, 5).map((m, idx) => {
                        const colorClass = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                        return (
                          <div
                            key={m.id}
                            className={`flex items-center gap-2 px-2 py-1 rounded-lg text-xs font-medium text-text-secondary ${
                              collapsed ? 'justify-center px-0' : ''
                            }`}
                            title={`@${m.username}`}
                          >
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-extrabold uppercase border shrink-0 ${colorClass}`}
                            >
                              {m.username.charAt(0) || 'U'}
                            </div>
                            {!collapsed && (
                              <span className="truncate text-xs font-medium text-text-primary/90">
                                @{m.username}
                              </span>
                            )}
                          </div>
                        );
                      })}

                      {/* +N More Trigger */}
                      {boardMembers.length > 5 && (
                        <button
                          onClick={() => setShowAllMembersModal(true)}
                          className={`flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold text-primary hover:underline cursor-pointer ${
                            collapsed ? 'justify-center px-0' : 'pl-7'
                          }`}
                          title={`${boardMembers.length - 5} more members`}
                        >
                          +{boardMembers.length - 5} more
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}

              <div className="h-px bg-border-subtle/50 mx-1 shrink-0" />

              {/* 3. Section: WORKSPACE (Secondary actions) */}
              <div className="shrink-0">
                {!collapsed && (
                  <div className="px-2 mb-1.5 text-[9px] font-extrabold tracking-widest uppercase text-text-secondary/50">
                    Workspace
                  </div>
                )}
                <nav className="space-y-0.5">
                  {/* My Boards */}
                  <Link
                    href="/boards"
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isMyBoardsActive
                        ? 'bg-primary text-white font-bold shadow-2xs'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated/60'
                    } ${collapsed ? 'justify-center px-0' : ''}`}
                    title="My Boards"
                  >
                    <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
                    {!collapsed && <span>My Boards</span>}
                  </Link>

                  {/* Create Board (Compact action) */}
                  <button
                    type="button"
                    onClick={onCreateBoardClick}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-elevated/60 transition-colors ${
                      collapsed ? 'justify-center px-0' : ''
                    }`}
                    title="Create Board"
                  >
                    <Plus className="w-3.5 h-3.5 shrink-0 text-primary" />
                    {!collapsed && <span>New Board</span>}
                  </button>

                  {/* Join Board (Compact action) */}
                  <button
                    type="button"
                    onClick={onJoinBoardClick}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-elevated/60 transition-colors ${
                      collapsed ? 'justify-center px-0' : ''
                    }`}
                    title="Join Board"
                  >
                    <Compass className="w-3.5 h-3.5 shrink-0 text-accent" />
                    {!collapsed && <span>Join Board</span>}
                  </button>
                </nav>
              </div>
            </div>

            {/* Flexible Space */}
            <div className="min-h-[14px]" />
          </div>

          {/* Section: FOOTER */}
          <div className="p-2.5 border-t border-border-subtle/70 space-y-2 shrink-0 bg-surface/40">
            {/* Content Agent Component */}
            <ConnectionStatus
              collapsed={collapsed}
              provider={provider}
              isConnected={isAgentConnected}
            />

            <div className="h-px bg-border-subtle/40" />

            {/* Settings & Profile Area */}
            <div className="space-y-0.5">
              {/* Settings Trigger */}
              <button
                type="button"
                onClick={onSettingsClick}
                className={`w-full flex items-center gap-2 px-2 py-1 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors ${
                  collapsed ? 'justify-center px-0' : ''
                }`}
                title="Settings"
              >
                <Settings className="w-3.5 h-3.5 shrink-0 opacity-70" />
                {!collapsed && <span>Settings</span>}
              </button>

              {/* Profile Bar with Sign Out button */}
              {!collapsed ? (
                <div className="flex items-center justify-between p-1.5 rounded-lg bg-surface-elevated/70 border border-border-subtle/50 mt-0.5">
                  <button
                    type="button"
                    onClick={onSettingsClick}
                    className="flex items-center gap-2 overflow-hidden hover:opacity-80 transition-opacity text-left min-w-0 flex-1 group"
                    title="Open profile & settings"
                  >
                    <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[9px] font-extrabold uppercase shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                      {username?.charAt(0) || 'U'}
                    </div>
                    <span className="text-[11px] font-bold text-text-primary truncate">
                      @{username || 'user'}
                    </span>
                  </button>

                  <button
                    onClick={onSignOut}
                    className="p-1 rounded text-text-secondary hover:text-red-500 hover:bg-red-500/10 transition-colors shrink-0"
                    title="Sign out"
                    aria-label="Sign out"
                  >
                    <LogOut className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="space-y-0.5">
                  <button
                    type="button"
                    onClick={onSettingsClick}
                    className="w-full flex items-center justify-center p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
                    title={`@${username} (Profile)`}
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={onSignOut}
                    className="w-full flex items-center justify-center p-1.5 rounded-lg text-text-secondary hover:text-red-500 hover:bg-red-500/10 transition-colors"
                    title="Sign out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Lightweight "All Members" Modal */}
      {showAllMembersModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setShowAllMembersModal(false)}
        >
          <div
            className="w-full max-w-sm bg-surface rounded-2xl border border-border-subtle shadow-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle/70 mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <h3 className="font-extrabold text-sm text-text-primary">
                  {displayBoardName} Members ({boardMembers.length})
                </h3>
              </div>
              <button
                onClick={() => setShowAllMembersModal(false)}
                className="p-1 rounded-lg text-text-secondary hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {boardMembers.map((m, idx) => {
                const colorClass = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 p-2 rounded-xl bg-surface-elevated/50 border border-border-subtle/50"
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black uppercase border shrink-0 ${colorClass}`}
                    >
                      {m.username.charAt(0) || 'U'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-text-primary truncate block">
                        @{m.username}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
