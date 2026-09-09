'use client';

import React, { useState } from 'react';
import { LinkWithDetails } from '@/types/database';
import RichPreview from './RichPreview';

interface InstagramEmbedProps {
  shortcode?: string | null;
  externalId?: string | null;
  type?: 'p' | 'reel' | 'tv';
  url?: string | null;
  thumbnail?: string | null;
  link?: LinkWithDetails;
}

/**
 * InstagramEmbed
 *
 * NOTE: Iframes must only live inside PreviewModal, never in a scrollable feed,
 * to prevent heavy iframe mounting, scroll performance degradation, and unwanted
 * background audio/video playback.
 */
export default function InstagramEmbed({
  shortcode,
  externalId,
  type,
  url,
  thumbnail,
  link,
}: InstagramEmbedProps) {
  const [hasError, setHasError] = useState(false);

  const code = shortcode || externalId;
  if (!code || hasError) {
    return link ? <RichPreview link={link} /> : <RichPreview thumbnailUrl={thumbnail} url={url} />;
  }

  const effectiveType = type || ((url || link?.url || '').includes('/reel') ? 'reel' : 'p');
  const path = effectiveType === 'reel' ? 'reel' : 'p';
  const embedUrl = `https://www.instagram.com/${path}/${code}/embed/`;

  return (
    <div className="w-full flex items-center justify-center p-2 sm:p-4 bg-black/5 dark:bg-black/20">
      <iframe
        src={embedUrl}
        className="w-full max-w-[440px] h-[540px] rounded-xl border border-border-subtle bg-surface"
        title="Instagram post embed"
        frameBorder="0"
        scrolling="no"
        allowTransparency
        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        loading="lazy"
        onError={() => setHasError(true)}
      />
    </div>
  );
}
