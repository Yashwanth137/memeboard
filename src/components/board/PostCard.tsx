'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LinkWithDetails } from '@/types/database';
import { detectPlatform, extractYouTubeVideoId } from '@/lib/platform';
import { formatTimeAgo } from '@/lib/utils';
import { Play, Zap, ExternalLink, Copy, Maximize2 } from 'lucide-react';
import PostMenu from './PostMenu';

interface PostCardProps {
  link: LinkWithDetails;
  currentUserId?: string | null;
  isBoardOwner?: boolean;
  onOpenPreview: (link: LinkWithDetails) => void;
  onEditPost: (link: LinkWithDetails) => void;
  onDeletePost: (linkId: string) => void;
  onToast: (msg: string) => void;
}

export default function PostCard({
  link,
  currentUserId,
  isBoardOwner,
  onOpenPreview,
  onEditPost,
  onDeletePost,
  onToast,
}: PostCardProps) {
  const [imgError, setImgError] = useState(false);

  const platformInfo = detectPlatform(link.url);
  const isOwner = Boolean(currentUserId && link.submitted_by === currentUserId);
  const canDelete = isOwner || Boolean(isBoardOwner);

  // Derive thumbnail for YouTube if not stored
  let thumbnail = link.thumbnail_url;
  if (!thumbnail && platformInfo.id === 'youtube') {
    const videoId = extractYouTubeVideoId(link.url);
    if (videoId) {
      thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }
  }

  const handleCopyUrl = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(link.url);
    onToast('📋 Link copied to clipboard!');
  };

  const submitterName = link.profile?.username ? `@${link.profile.username}` : 'Member';
  const hasMedia = Boolean(thumbnail && !imgError);

  return (
    <motion.article
      whileHover={{ y: -2 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      onClick={() => onOpenPreview(link)}
      className="group bg-surface rounded-xl border border-border-subtle hover:border-primary/40 dark:hover:border-primary/50 shadow-2xs hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer flex flex-col relative"
      id={`post-${link.id}`}
    >
      {/* Compact Media Region (aspect-[16/10] with contained image & blurred backdrop) */}
      {hasMedia ? (
        <div className="relative w-full aspect-[16/10] bg-surface-elevated/90 overflow-hidden flex items-center justify-center border-b border-border-subtle/60">
          {/* Subtle blurred ambient backdrop to fill letterbox areas */}
          <div
            className="absolute inset-0 bg-cover bg-center blur-lg opacity-25 dark:opacity-40 scale-125 pointer-events-none"
            style={{ backgroundImage: `url(${thumbnail})` }}
          />

          {/* Contained Media: Never crops screenshots or meme captions */}
          <img
            src={thumbnail!}
            alt={link.title || platformInfo.label}
            className="relative max-h-full max-w-full object-contain transition-transform duration-200 group-hover:scale-[1.02] z-10"
            loading="lazy"
            onError={() => setImgError(true)}
          />

          {/* Platform Identity Badge (Top-Left translucent pill) */}
          <div className="absolute top-1 left-1 md:top-1.5 md:left-1.5 z-20 px-1 md:px-1.5 py-0.5 rounded bg-black/65 backdrop-blur-md border border-white/10 text-white text-[8px] md:text-[9px] font-bold flex items-center gap-1 shadow-sm select-none">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: platformInfo.accentColor }}
            />
            <span>{platformInfo.label}</span>
          </div>

          {/* Video Play Indicator */}
          {link.content_type === 'video' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-black/70 text-white flex items-center justify-center backdrop-blur-xs shadow-md transform transition-transform group-hover:scale-110">
                <Play className="w-2.5 h-2.5 md:w-3 md:h-3 fill-current translate-x-0.5" />
              </div>
            </div>
          )}

          {/* Media Hover Action Bar (Revealed on hover) */}
          <div className="absolute top-1.5 right-1.5 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenPreview(link);
              }}
              className="p-1 rounded bg-black/65 hover:bg-black/85 backdrop-blur-md border border-white/15 text-white shadow-sm"
              title="Preview full post"
            >
              <Maximize2 className="w-2.5 h-2.5" />
            </button>
            <button
              onClick={handleCopyUrl}
              className="p-1 rounded bg-black/65 hover:bg-black/85 backdrop-blur-md border border-white/15 text-white shadow-sm"
              title="Copy link"
            >
              <Copy className="w-2.5 h-2.5" />
            </button>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1 rounded bg-black/65 hover:bg-black/85 backdrop-blur-md border border-white/15 text-white shadow-sm"
              title="Open original link"
            >
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      ) : (
        <div className="aspect-[16/10] bg-surface-elevated/40 border-b border-border-subtle/60 flex flex-col items-center justify-center text-center gap-1 p-2 md:p-3 relative">
          <div className="absolute top-1 left-1 md:top-1.5 md:left-1.5 z-20 px-1 md:px-1.5 py-0.5 rounded bg-black/65 backdrop-blur-md border border-white/10 text-white text-[8px] md:text-[9px] font-bold flex items-center gap-1 shadow-sm">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: platformInfo.accentColor }}
            />
            <span>{platformInfo.label}</span>
          </div>
          <div className="w-5 h-5 md:w-6 md:h-6 rounded-lg bg-surface flex items-center justify-center shadow-2xs">
            <Zap className="w-2.5 h-2.5 md:w-3 md:h-3 text-accent" fill="currentColor" />
          </div>
          <span className="text-[9px] md:text-[10px] font-mono text-text-secondary/70">
            {platformInfo.domain}
          </span>
        </div>
      )}

      {/* Content & Metadata Area (Compact, tight visual archive) */}
      <div className="p-2 md:p-2.5 flex flex-col gap-1 flex-1 justify-between min-w-0">
        <div>
          {/* Title */}
          <h3
            className="text-[11px] md:text-xs font-bold text-text-primary leading-snug md:leading-tight line-clamp-2 md:line-clamp-1 min-w-0 group-hover:text-primary transition-colors"
            title={link.title || link.url}
          >
            {link.title || `${platformInfo.label} Link`}
          </h3>

          {/* Secondary Category Tag (only if present) */}
          {link.category && (
            <div className="mt-0.5">
              <span className="inline-block text-[8px] md:text-[9px] font-bold px-1.5 py-0.2 rounded bg-surface-elevated text-text-secondary/70 border border-border-subtle/40">
                {link.category.name}
              </span>
            </div>
          )}
        </div>

        {/* Footer: Attribution & Overflow Menu */}
        <div className="pt-1 md:pt-1.5 border-t border-border-subtle/40 flex items-center justify-between gap-1 md:gap-2 mt-0.5 min-w-0">
          <div className="flex items-center gap-1 text-[9px] md:text-[10px] text-text-secondary truncate min-w-0 flex-1">
            <span className="font-semibold text-text-primary/90 truncate min-w-0">{submitterName}</span>
            <span className="opacity-40 shrink-0">·</span>
            <time className="opacity-75 shrink-0" dateTime={link.created_at}>
              {formatTimeAgo(link.created_at)}
            </time>
          </div>

          <div className="shrink-0">
            <PostMenu
              url={link.url}
              canEdit={isOwner}
              canDelete={canDelete}
              onCopyUrl={handleCopyUrl}
              onEdit={() => onEditPost(link)}
              onDelete={() => onDeletePost(link.id)}
            />
          </div>
        </div>
      </div>
    </motion.article>
  );
}
