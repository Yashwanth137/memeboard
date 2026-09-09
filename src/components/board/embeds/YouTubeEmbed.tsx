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
  const targetUrl = url || link?.url || '';
  const videoId = externalId || extractYouTubeVideoId(targetUrl);

  if (!videoId) {
    return link ? (
      <RichPreview link={link} />
    ) : (
      <RichPreview thumbnailUrl={thumbnail} title={title} url={url} />
    );
  }

  // Detect whether this is a vertical YouTube Short
  const isShort =
    targetUrl.includes('/shorts/') ||
    Boolean(link?.title?.toLowerCase().includes('#shorts') || title?.toLowerCase().includes('#shorts'));

  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1&modestbranding=1`;

  // Render vertical 9:16 player for YouTube Shorts
  if (isShort) {
    return (
      <div className="w-full flex items-center justify-center p-3 sm:p-4 bg-black/40">
        <div className="relative w-full max-w-[320px] aspect-[9/16] max-h-[58vh] rounded-2xl overflow-hidden shadow-2xl border border-border-subtle bg-black">
          <iframe
            src={embedUrl}
            title={title || link?.title || 'YouTube Shorts video'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    );
  }

  // Standard 16:9 widescreen player for standard YouTube videos
  return (
    <div className="w-full flex items-center justify-center p-2 sm:p-4 bg-black/40">
      <div className="relative w-full max-w-2xl aspect-video max-h-[58vh] rounded-2xl overflow-hidden shadow-2xl border border-border-subtle bg-black">
        <iframe
          src={embedUrl}
          title={title || link?.title || 'YouTube video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    </div>
  );
}

