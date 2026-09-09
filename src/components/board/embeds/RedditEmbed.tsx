'use client';

import React, { useState } from 'react';
import { LinkWithDetails } from '@/types/database';
import RichPreview from './RichPreview';

interface RedditEmbedProps {
  url?: string | null;
  permalink?: string;
  externalId?: string | null;
  thumbnail?: string | null;
  link?: LinkWithDetails;
}

/**
 * RedditEmbed
 *
 * NOTE: Iframes must only live inside PreviewModal, never in a scrollable feed,
 * to prevent heavy iframe mounting, scroll performance degradation, and unwanted
 * background audio/video playback.
 */
export default function RedditEmbed({ url, permalink, externalId, thumbnail, link }: RedditEmbedProps) {
  const [hasError, setHasError] = useState(false);

  const rawUrl = permalink || url || link?.url;
  if (!rawUrl || hasError) {
    return link ? <RichPreview link={link} /> : <RichPreview thumbnailUrl={thumbnail} url={url} />;
  }

  // Build the embed URL: swap domain to embed.reddit.com and append ?embed=true
  let embedUrl = rawUrl.replace(/^(https?:\/\/)?(www\.)?reddit\.com/i, 'https://embed.reddit.com');
  if (!embedUrl.startsWith('http')) {
    embedUrl = `https://${embedUrl}`;
  }
  embedUrl += `${embedUrl.includes('?') ? '&' : '?'}embed=true`;

  return (
    <div className="w-full flex items-center justify-center p-2 sm:p-4 bg-black/5 dark:bg-black/20">
      <iframe
        src={embedUrl}
        className="w-full min-h-[380px] max-h-[500px] rounded-xl border border-border-subtle bg-surface"
        title="Reddit post embed"
        allow="autoplay; fullscreen"
        /*
         * Note on sandbox: allow-scripts + allow-same-origin is safe here because
         * embed.reddit.com is on a different origin than our application, but flag
         * this for future awareness regarding origin isolation.
         */
        sandbox="allow-scripts allow-same-origin allow-popups"
        loading="lazy"
        onError={() => setHasError(true)}
      />
    </div>
  );
}
