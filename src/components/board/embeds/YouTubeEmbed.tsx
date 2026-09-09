'use client';

import React from 'react';
import { extractYouTubeVideoId } from '@/lib/platform';
import { LinkWithDetails } from '@/types/database';
import RichPreview from './RichPreview';

interface YouTubeEmbedProps {
  url?: string | null;
  externalId?: string | null;
  title?: string | null;
  thumbnail?: string | null;
  link?: LinkWithDetails;
}

/**
 * YouTubeEmbed
 *
 * NOTE: Iframes must only live inside PreviewModal, never in a scrollable feed,
 * to prevent heavy iframe mounting, scroll performance degradation, and unwanted
 * background audio/video playback.
 */
export default function YouTubeEmbed({ url, externalId, title, thumbnail, link }: YouTubeEmbedProps) {
  const videoId = externalId || extractYouTubeVideoId(url || link?.url || '');

  if (!videoId) {
    return link ? (
      <RichPreview link={link} />
    ) : (
      <RichPreview thumbnailUrl={thumbnail} title={title} url={url} />
    );
  }

  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;

  return (
    <div className="v2-video-responsive">
      <iframe
        src={embedUrl}
        title={title || link?.title || 'YouTube video'}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="v2-video-iframe"
      />
    </div>
  );
}
