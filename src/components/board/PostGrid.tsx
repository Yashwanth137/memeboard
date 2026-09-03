'use client';

import React, { useMemo } from 'react';
import { LinkWithDetails } from '@/types/database';
import PostCard from './PostCard';

interface PostGridProps {
  links: LinkWithDetails[];
  currentUserId?: string | null;
  isBoardOwner?: boolean;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  onOpenPreview: (link: LinkWithDetails) => void;
  onEditPost: (link: LinkWithDetails) => void;
  onDeletePost: (linkId: string) => void;
  onToast: (msg: string) => void;
}

interface DateGroup {
  label: string;
  items: LinkWithDetails[];
}

function getDateGroupLabel(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Earlier';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  if (d >= startOfToday) {
    return 'Today';
  }
  if (d >= startOfYesterday) {
    return 'Yesterday';
  }

  // Same year: e.g. "September 1"
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
  }

  // Different year: e.g. "September 1, 2025"
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function PostGrid({
  links,
  currentUserId,
  isBoardOwner,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  onOpenPreview,
  onEditPost,
  onDeletePost,
  onToast,
}: PostGridProps) {
  // Group posts visually by date (Google Photos style)
  const dateGroups = useMemo(() => {
    const groups: DateGroup[] = [];
    const map = new Map<string, DateGroup>();

    for (const link of links) {
      const label = getDateGroupLabel(link.created_at);
      let group = map.get(label);
      if (!group) {
        group = { label, items: [] };
        map.set(label, group);
        groups.push(group);
      }
      group.items.push(link);
    }

    return groups;
  }, [links]);

  return (
    <div className="flex flex-col gap-6">
      {/* Date Grouped Visual Archive */}
      {dateGroups.map((group) => (
        <section key={group.label} className="flex flex-col gap-2.5">
          {/* Section Date Anchor Header */}
          <div className="flex items-center gap-3 pt-1">
            <h2 className="text-xs font-black uppercase tracking-wider text-text-primary/90">
              {group.label}
            </h2>
            <div className="h-px bg-border-subtle/60 flex-1" />
            <span className="text-[10px] font-bold text-text-secondary/60">
              {group.items.length} {group.items.length === 1 ? 'post' : 'posts'}
            </span>
          </div>

          {/* High Density Grid (4-5 cards across desktop) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-3.5">
            {group.items.map((link) => (
              <PostCard
                key={link.id}
                link={link}
                currentUserId={currentUserId}
                isBoardOwner={isBoardOwner}
                onOpenPreview={onOpenPreview}
                onEditPost={onEditPost}
                onDeletePost={onDeletePost}
                onToast={onToast}
              />
            ))}
          </div>
        </section>
      ))}

      {/* Seamless Load More (replaces conventional pagination numbers) */}
      {hasMore && onLoadMore && (
        <div className="mt-6 mb-8 text-center">
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="px-6 py-2.5 rounded-xl bg-surface hover:bg-surface-elevated border border-border-subtle hover:border-primary/40 text-text-primary text-xs font-bold transition-all shadow-2xs hover:shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer inline-flex items-center gap-2"
            id="load-more-btn"
          >
            {loadingMore ? (
              <span>Loading memories...</span>
            ) : (
              <>
                <span>Load more</span>
                <span className="text-text-secondary">↓</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
