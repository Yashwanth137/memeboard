'use client';

import React, { useState, useEffect } from 'react';
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
 * Extracts a valid canonical embed.reddit.com URL from any Reddit URL
 * that contains /r/{subreddit}/comments/{postId}/...
 * Reddit embed.reddit.com requires this exact structure; /s/ shortlinks,
 * redd.it, or /comments/{id} without the subreddit will return 404 "Page not found".
 */
function getCanonicalRedditEmbedUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const url = raw.startsWith('http') ? raw : `https://${raw}`;
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/r\/([^\/]+)\/comments\/([a-zA-Z0-9]+)(\/[^\/]*)?/i);
    if (match) {
      const sub = match[1];
      const id = match[2];
      const slug = match[3] || '';
      return `https://embed.reddit.com/r/${sub}/comments/${id}${slug}?embed=true`;
    }
  } catch {}
  return null;
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
  const [resolving, setResolving] = useState(false);
  const [resolvedEmbedUrl, setResolvedEmbedUrl] = useState<string | null>(null);

  const rawUrl = permalink || url || link?.url;
  const initialEmbedUrl =
    getCanonicalRedditEmbedUrl(permalink) ||
    getCanonicalRedditEmbedUrl(url) ||
    getCanonicalRedditEmbedUrl(link?.resolved_url) ||
    getCanonicalRedditEmbedUrl(link?.url);

  // If initial URL is not in canonical format (e.g. /s/... shortlink or redd.it),
  // asynchronously resolve it to avoid Reddit's iframe "Page not found" error.
  useEffect(() => {
    if (initialEmbedUrl || !rawUrl || hasError) return;

    let isCancelled = false;
    setResolving(true);

    fetch(`/api/metadata?url=${encodeURIComponent(rawUrl)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((meta) => {
        if (isCancelled) return;
        if (meta?.resolvedUrl) {
          const canonical = getCanonicalRedditEmbedUrl(meta.resolvedUrl);
          if (canonical) {
            setResolvedEmbedUrl(canonical);
            setResolving(false);
            return;
          }
        }
        // Could not resolve canonical path, degrade cleanly to RichPreview
        setHasError(true);
        setResolving(false);
      })
      .catch(() => {
        if (!isCancelled) {
          setHasError(true);
          setResolving(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [rawUrl, initialEmbedUrl, hasError]);

  const activeEmbedUrl = initialEmbedUrl || resolvedEmbedUrl;

  if (hasError || (!activeEmbedUrl && !resolving && !initialEmbedUrl)) {
    return link ? <RichPreview link={link} /> : <RichPreview thumbnailUrl={thumbnail} url={url} />;
  }

  if (resolving && !activeEmbedUrl) {
    return (
      <div className="w-full min-h-[380px] max-h-[500px] flex flex-col items-center justify-center p-6 bg-black/5 dark:bg-black/20 rounded-xl border border-border-subtle gap-3">
        {thumbnail && (
          <div className="relative w-24 h-24 rounded-xl overflow-hidden opacity-60 shadow-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumbnail} alt="Loading Reddit preview" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-text-secondary font-medium">Loading Reddit player...</span>
      </div>
    );
  }

  return (
    <div className="w-full flex items-center justify-center p-2 sm:p-4 bg-black/5 dark:bg-black/20">
      <iframe
        src={activeEmbedUrl!}
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

