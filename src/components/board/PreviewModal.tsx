'use client';

import React, { useEffect } from 'react';
import { LinkWithDetails } from '@/types/database';
import { detectPlatform, resolveEmbedInfo } from '@/lib/platform';
import { formatTimeAgo } from '@/lib/utils';
import YouTubeEmbed from './embeds/YouTubeEmbed';
import RichPreview from './embeds/RichPreview';

interface PreviewModalProps {
  link: LinkWithDetails | null;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export default function PreviewModal({
  link,
  onClose,
  onToast,
}: PreviewModalProps) {
  useEffect(() => {
    if (!link) return;

    // Lock body scroll while modal is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [link, onClose]);

  if (!link) return null;

  const targetUrl = (link as any).resolved_url || link.url;
  const platform = detectPlatform(targetUrl);
  const embedInfo = resolveEmbedInfo(targetUrl);

  const submitterName =
    link.profile?.username ? `@${link.profile.username}` : 'Member';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(link.url);
    onToast('📋 Link copied to clipboard!');
  };

  return (
    <div
      className="v2-modal-backdrop animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="v2-preview-modal-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="v2-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span
              className="badge"
              style={{
                backgroundColor: platform.badgeBg,
                color: platform.accentColor,
                border: `1px solid ${platform.accentColor}`,
              }}
            >
              {platform.label}
            </span>
            {link.category && (
              <span className="badge badge-primary">
                {link.category.name}
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="v2-modal-close-btn"
            title="Close (Esc)"
            id="modal-close-btn"
          >
            ✕
          </button>
        </div>

        {/* Media / Embed Area with unique post key for clean mount/unmount */}
        <div className="v2-modal-media-container" key={link.id}>
          {embedInfo.embedType === 'youtube' ? (
            <YouTubeEmbed url={targetUrl} title={link.title} link={link} />
          ) : (
            <RichPreview link={link} />
          )}
        </div>

        {/* Details Area */}
        <div className="v2-modal-details">
          <h2 className="v2-modal-title">
            {link.title || `${platform.label} Post`}
          </h2>

          {link.description && (
            <p className="v2-modal-description">
              {link.description}
            </p>
          )}

          {/* Submitter Info */}
          <div className="v2-modal-meta">
            <span>
              Shared by <strong>{submitterName}</strong>
            </span>
            <span>·</span>
            <time dateTime={link.created_at}>{formatTimeAgo(link.created_at)}</time>
          </div>

          {/* Action Buttons */}
          <div className="v2-modal-actions">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-lg flex-1"
              id="open-source-btn"
            >
              Open on {platform.label} ↗
            </a>

            <button
              onClick={handleCopyLink}
              className="btn btn-secondary btn-lg"
              title="Copy URL"
            >
              📋 Copy Link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
