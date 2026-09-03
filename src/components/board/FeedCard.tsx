'use client';

import React, { useState, useRef, useEffect } from 'react';
import { LinkWithDetails } from '@/types/database';
import { detectPlatform, extractYouTubeVideoId } from '@/lib/platform';
import { formatTimeAgo } from '@/lib/utils';

interface FeedCardProps {
  link: LinkWithDetails;
  currentUserId?: string | null;
  isBoardOwner?: boolean;
  onOpenPreview: (link: LinkWithDetails) => void;
  onEditPost: (link: LinkWithDetails) => void;
  onDeletePost: (linkId: string) => void;
  onToast: (msg: string) => void;
}

export default function FeedCard({
  link,
  currentUserId,
  isBoardOwner,
  onOpenPreview,
  onEditPost,
  onDeletePost,
  onToast,
}: FeedCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Close menu on click outside
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

  const handleCopyUrl = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(link.url);
    onToast('📋 Link copied to clipboard!');
    setMenuOpen(false);
  };

  const submitterName =
    link.profile?.username ? `@${link.profile.username}` : 'Member';

  return (
    <article
      className="card card-hover v2-feed-card"
      onClick={() => onOpenPreview(link)}
      id={`post-${link.id}`}
    >
      {/* Thumbnail or Platform Header Banner */}
      {thumbnail && !imgError ? (
        <div className="v2-card-media-wrapper">
          <img
            src={thumbnail}
            alt={link.title || platformInfo.label}
            className="v2-card-thumbnail"
            loading="lazy"
            onError={() => setImgError(true)}
          />
          {link.content_type === 'video' && (
            <div className="v2-card-play-icon" title="Watch Video">
              ▶
            </div>
          )}
        </div>
      ) : (
        <div className="v2-card-no-media">
          <span className="v2-card-no-media-title">
            {link.title || `${platformInfo.label} Post`}
          </span>
          <span className="v2-card-domain text-muted font-mono">
            {platformInfo.domain}
          </span>
        </div>
      )}

      {/* Card Content */}
      <div className="v2-card-content">
        {/* Title */}
        <h3 className="v2-card-title" title={link.title || link.url}>
          {link.title || `${platformInfo.label} Link`}
        </h3>

        {/* Short Description */}
        {link.description && (
          <p className="v2-card-desc">
            {link.description}
          </p>
        )}

        {/* Category Tag if available */}
        {link.category && (
          <div style={{ marginTop: '0.4rem' }}>
            <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
              {link.category.name}
            </span>
          </div>
        )}

        {/* Footer Meta & Actions */}
        <div className="v2-card-footer">
          <div className="v2-card-author">
            <span className="v2-author-dot">●</span>
            <span className="v2-author-name">{submitterName}</span>
            <span className="text-muted">·</span>
            <time className="v2-card-time text-muted" dateTime={link.created_at}>
              {formatTimeAgo(link.created_at)}
            </time>
          </div>

          {/* Actions Overflow Button */}
          <div className="v2-menu-wrapper" ref={menuRef} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              className="v2-menu-trigger"
              title="Post actions"
              id={`menu-trigger-${link.id}`}
            >
              ⋮
            </button>

            {menuOpen && (
              <div className="v2-menu-dropdown animate-fade-in">
                <button
                  onClick={handleCopyUrl}
                  className="v2-menu-item"
                >
                  📋 Copy URL
                </button>

                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="v2-menu-item"
                  onClick={() => setMenuOpen(false)}
                >
                  ↗ Open Original
                </a>

                {isOwner && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onEditPost(link);
                    }}
                    className="v2-menu-item"
                  >
                    ✏️ Edit Title & Category
                  </button>
                )}

                {canDelete && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onDeletePost(link.id);
                    }}
                    className="v2-menu-item text-danger"
                  >
                    🗑 Delete Post
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
