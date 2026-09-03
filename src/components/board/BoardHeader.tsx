'use client';

import React, { useState } from 'react';

interface BoardHeaderProps {
  boardName: string;
  boardSlug: string;
  memberCount: number;
  isMember: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onJoinBoard: () => void;
  onOpenAddModal: () => void;
  onToast: (msg: string) => void;
}

export default function BoardHeader({
  boardName,
  boardSlug,
  memberCount,
  isMember,
  searchQuery,
  onSearchChange,
  onJoinBoard,
  onOpenAddModal,
  onToast,
}: BoardHeaderProps) {
  const [showSearch, setShowSearch] = useState(Boolean(searchQuery));

  const initial = boardName ? boardName.trim().charAt(0).toUpperCase() : 'M';

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${boardName} — Memeboard`,
          text: `Check out our shared board "${boardName}" on Memeboard!`,
          url,
        });
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      onToast('📋 Board link copied to clipboard!');
    }
  };

  return (
    <header className="v2-board-header">
      <div className="v2-header-top">
        {/* Board identity */}
        <div className="v2-board-brand">
          <div className="v2-board-avatar">{initial}</div>
          <div>
            <h1 className="v2-board-name">{boardName}</h1>
            <div className="v2-board-sub">
              <span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
              <span>•</span>
              <span className="text-secondary">memeboard.app/b/{boardSlug}</span>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="v2-header-actions">
          <button
            onClick={() => {
              setShowSearch((prev) => {
                if (prev && searchQuery) onSearchChange('');
                return !prev;
              });
            }}
            className={`btn btn-secondary btn-sm ${showSearch ? 'active' : ''}`}
            title="Search board"
            id="toggle-search-btn"
          >
            🔍 {showSearch ? 'Close' : 'Search'}
          </button>

          <button
            onClick={handleShare}
            className="btn btn-secondary btn-sm"
            id="share-btn"
            title="Share board"
          >
            🔗 Share
          </button>

          {!isMember ? (
            <button
              onClick={onJoinBoard}
              className="btn btn-primary btn-sm"
              id="join-board-btn"
            >
              + Join
            </button>
          ) : (
            <button
              onClick={onOpenAddModal}
              className="btn btn-primary btn-sm"
              id="add-link-btn"
            >
              + Add Link
            </button>
          )}
        </div>
      </div>

      {/* Expandable Search Input */}
      {showSearch && (
        <div className="v2-search-container animate-fade-in">
          <div className="v2-search-input-wrapper">
            <span className="v2-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search across titles, URLs, descriptions, categories..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="input v2-search-input"
              id="board-search-input"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="v2-search-clear"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
