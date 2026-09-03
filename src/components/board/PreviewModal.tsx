'use client';

import React, { useEffect } from 'react';
import { LinkWithDetails } from '@/types/database';
import { detectPlatform, resolveEmbedInfo } from '@/lib/platform';
import { formatTimeAgo } from '@/lib/utils';
import { X, ExternalLink, Copy, ChevronLeft, ChevronRight } from 'lucide-react';
import YouTubeEmbed from './embeds/YouTubeEmbed';
import RichPreview from './embeds/RichPreview';

interface PreviewModalProps {
  link: LinkWithDetails | null;
  onClose: () => void;
  onToast: (msg: string) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

export default function PreviewModal({
  link,
  onClose,
  onToast,
  onNext,
  onPrevious,
  hasNext = false,
  hasPrevious = false,
}: PreviewModalProps) {
  useEffect(() => {
    if (!link) return;

    // Lock body scroll while modal is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' && hasNext && onNext) {
        onNext();
      } else if (e.key === 'ArrowLeft' && hasPrevious && onPrevious) {
        onPrevious();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [link, onClose, onNext, onPrevious, hasNext, hasPrevious]);

  if (!link) return null;

  const targetUrl = (link as any).resolved_url || link.url;
  const platform = detectPlatform(targetUrl);
  const embedInfo = resolveEmbedInfo(targetUrl);

  const submitterName = link.profile?.username ? `@${link.profile.username}` : 'Member';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(link.url);
    onToast('📋 Link copied to clipboard!');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* Navigation Arrow Previous (Floating Left) */}
      {hasPrevious && onPrevious && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPrevious();
          }}
          className="hidden sm:flex absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-50 w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 text-white items-center justify-center backdrop-blur-md border border-white/15 transition-all shadow-xl hover:scale-105 active:scale-95"
          title="Previous post (Left arrow)"
          aria-label="Previous post"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Navigation Arrow Next (Floating Right) */}
      {hasNext && onNext && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          className="hidden sm:flex absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-50 w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 text-white items-center justify-center backdrop-blur-md border border-white/15 transition-all shadow-xl hover:scale-105 active:scale-95"
          title="Next post (Right arrow)"
          aria-label="Next post"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      <div
        className="relative w-full max-w-2xl bg-surface rounded-3xl border border-border-subtle shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between p-4 border-b border-border-subtle/80">
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md"
              style={{
                backgroundColor: platform.badgeBg,
                color: platform.accentColor,
                border: `1px solid ${platform.accentColor}`,
              }}
            >
              {platform.label}
            </span>
            {link.category && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-surface-elevated text-text-secondary border border-border-subtle">
                {link.category.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile Prev/Next in Top Bar */}
            <div className="flex sm:hidden items-center gap-1 mr-1">
              <button
                onClick={onPrevious}
                disabled={!hasPrevious}
                className="p-1 rounded-lg text-text-secondary hover:text-text-primary disabled:opacity-30"
                aria-label="Previous post"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={onNext}
                disabled={!hasNext}
                className="p-1 rounded-lg text-text-secondary hover:text-text-primary disabled:opacity-30"
                aria-label="Next post"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
              title="Close (Esc)"
              id="modal-close-btn"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Media / Embed Area with unique post key for clean mount/unmount */}
        <div className="w-full bg-surface-elevated/40 overflow-y-auto max-h-[50vh] flex items-center justify-center" key={link.id}>
          {embedInfo.embedType === 'youtube' ? (
            <YouTubeEmbed url={targetUrl} title={link.title} link={link} />
          ) : (
            <RichPreview link={link} />
          )}
        </div>

        {/* Details Area */}
        <div className="p-5 flex flex-col gap-3 overflow-y-auto">
          <h2 className="text-lg font-bold text-text-primary leading-snug">
            {link.title || `${platform.label} Post`}
          </h2>

          {link.description && (
            <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">
              {link.description}
            </p>
          )}

          {/* Submitter Info */}
          <div className="text-xs text-text-secondary flex items-center gap-1.5">
            <span>
              Shared by <strong className="text-text-primary font-bold">{submitterName}</strong>
            </span>
            <span className="opacity-40">·</span>
            <time dateTime={link.created_at}>{formatTimeAgo(link.created_at)}</time>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-2">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 px-4 rounded-xl bg-primary hover:opacity-90 active:scale-95 text-white font-extrabold text-xs text-center transition-all shadow-xs flex items-center justify-center gap-2"
              id="open-source-btn"
            >
              <span>Open on {platform.label}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={handleCopyLink}
              className="py-2.5 px-4 rounded-xl bg-surface hover:bg-surface-elevated border border-border-subtle text-text-primary font-bold text-xs transition-colors shadow-2xs flex items-center gap-1.5"
              title="Copy URL"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Link</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
