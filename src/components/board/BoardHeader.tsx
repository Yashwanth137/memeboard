'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Plus, Share2, UserPlus, MoreHorizontal, Copy, Info } from 'lucide-react';

interface BoardHeaderProps {
  boardName: string;
  boardSlug: string;
  memberCount: number;
  postCount: number;
  isMember: boolean;
  creatorName?: string | null;
  onJoinBoard: () => void;
  onOpenAddModal: () => void;
  onOpenShareModal: () => void;
  onToast?: (msg: string) => void;
}

export default function BoardHeader({
  boardName,
  boardSlug,
  memberCount,
  postCount,
  isMember,
  creatorName,
  onJoinBoard,
  onOpenAddModal,
  onOpenShareModal,
  onToast,
}: BoardHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const monogram = boardName ? boardName.trim().charAt(0).toUpperCase() : 'M';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleCopyLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://memeboard.app';
    navigator.clipboard.writeText(`${origin}/b/${boardSlug}`);
    if (onToast) onToast('📋 Board link copied to clipboard!');
    setMenuOpen(false);
  };

  return (
    <div className="w-full flex items-center justify-between gap-3 mb-2 sm:mb-2.5">
      {/* Left: Tightly Integrated Board Identity */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-primary text-white font-black text-sm flex items-center justify-center shadow-2xs shrink-0 select-none">
          {monogram}
        </div>

        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-text-primary truncate leading-tight">
            {boardName}
          </h1>

          <div className="flex items-center gap-2 text-xs text-text-secondary mt-0.5">
            <span className="font-semibold text-text-secondary/90">
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </span>
            <span className="opacity-40">·</span>
            <span className="font-semibold text-text-secondary/90">
              {postCount} {postCount === 1 ? 'post' : 'posts'}
            </span>
            <span className="opacity-40">·</span>
            <button
              onClick={onOpenShareModal}
              className="inline-flex items-center gap-1 text-xs font-semibold text-text-secondary hover:text-primary transition-colors cursor-pointer"
              title="Share board invite link"
            >
              <Share2 className="w-3 h-3" />
              <span>Share</span>
            </button>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {!isMember ? (
          <button
            onClick={onJoinBoard}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:opacity-90 active:scale-95 text-white font-bold text-xs transition-all shadow-2xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Join</span>
          </button>
        ) : (
          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary hover:opacity-90 active:scale-95 text-white font-extrabold text-xs transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Link</span>
          </button>
        )}

        {/* Board Level ••• Actions Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
            title="Board actions"
            aria-label="Board actions"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-surface dark:bg-surface-elevated rounded-xl border border-border-subtle shadow-xl p-1 z-40 text-xs flex flex-col gap-0.5">
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-text-primary font-medium text-left transition-colors"
              >
                <Copy className="w-3.5 h-3.5 text-text-secondary" />
                <span>Copy Board Link</span>
              </button>

              <button
                onClick={() => {
                  setMenuOpen(false);
                  onOpenShareModal();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-text-primary font-medium text-left transition-colors"
              >
                <Share2 className="w-3.5 h-3.5 text-text-secondary" />
                <span>Invite Members</span>
              </button>

              {creatorName && (
                <div className="px-2.5 py-1.5 text-[11px] text-text-secondary border-t border-border-subtle/50 flex items-center gap-1.5 mt-0.5">
                  <Info className="w-3 h-3 opacity-60" />
                  <span>Created by @{creatorName}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
