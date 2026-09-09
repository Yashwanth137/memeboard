'use client';

import React, { useState, useEffect } from 'react';
import { LinkWithDetails } from '@/types/database';
import RichPreview from './RichPreview';

interface NativeVideoPlayerProps {
  url?: string | null;
  thumbnail?: string | null;
  externalId?: string | null;
  link?: LinkWithDetails;
}

/**
 * Checks whether a given URL points directly to a video stream/asset
 * rather than a social web page URL (e.g. x.com/user/status/...).
 */
function isDirectStream(val?: string | null): boolean {
  if (!val) return false;
  if (Boolean(val.match(/\.(mp4|webm|mov|m3u8)(\?.*)?$/i))) return true;
  if (
    val.includes('video.twimg.com') ||
    val.includes('twimg.com/amplify_video') ||
    val.includes('twimg.com/ext_tw_video') ||
    val.includes('fxtwitter.com') ||
    val.includes('vxreddit.com/redditvideo.mp4')
  ) {
    return true;
  }
  return false;
}

/**
 * NativeVideoPlayer
 *
 * Renders direct video streams (MP4/WebM) such as those extracted from X/Twitter
 * with native video controls, poster, autoPlay, loop, and graceful degradation to RichPreview.
 */
export default function NativeVideoPlayer({
  url,
  thumbnail,
  link,
}: NativeVideoPlayerProps) {
  const [videoError, setVideoError] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolvedVideoUrl, setResolvedVideoUrl] = useState<string | null>(null);

  // Check if we already have a direct stream URL from props or link record
  const initialDirectUrl = isDirectStream(url)
    ? url!
    : isDirectStream(link?.resolved_url)
    ? link!.resolved_url!
    : null;

  // If we only have a page URL (e.g. x.com/status/...), asynchronously resolve the MP4 stream
  useEffect(() => {
    if (initialDirectUrl || videoError) return;

    const rawTarget = url || link?.url;
    if (!rawTarget) {
      setVideoError(true);
      return;
    }

    let isCancelled = false;
    setResolving(true);

    const enrichQuery = link?.id
      ? `/api/metadata?url=${encodeURIComponent(rawTarget)}&linkId=${link.id}`
      : `/api/metadata?url=${encodeURIComponent(rawTarget)}`;

    fetch(enrichQuery)
      .then((res) => (res.ok ? res.json() : null))
      .then((meta) => {
        if (isCancelled) return;
        if (meta?.resolvedUrl && isDirectStream(meta.resolvedUrl)) {
          setResolvedVideoUrl(meta.resolvedUrl);
          setResolving(false);
          return;
        }
        // Could not resolve a playable video stream, degrade to RichPreview
        setVideoError(true);
        setResolving(false);
      })
      .catch(() => {
        if (!isCancelled) {
          setVideoError(true);
          setResolving(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [initialDirectUrl, url, link, videoError]);

  const activeVideoUrl = initialDirectUrl || resolvedVideoUrl;

  // Fallback to RichPreview if video fails or cannot be found
  if (videoError || (!activeVideoUrl && !resolving)) {
    return link ? (
      <RichPreview link={link} />
    ) : (
      <RichPreview thumbnailUrl={thumbnail} />
    );
  }

  // Loading state while resolving direct video stream
  if (resolving && !activeVideoUrl) {
    return (
      <div className="relative w-full min-h-[300px] max-h-[58vh] flex flex-col items-center justify-center p-6 bg-black/40 rounded-2xl border border-border-subtle gap-3 overflow-hidden">
        {thumbnail && (
          <div className="absolute inset-0 z-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumbnail} alt="Loading video poster" className="w-full h-full object-cover blur-sm opacity-30" />
          </div>
        )}
        <div className="relative z-10 w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="relative z-10 text-xs text-text-secondary font-medium">Loading video stream...</span>
      </div>
    );
  }

  const [useFallback, setUseFallback] = useState(false);

  // For protected CDNs like Twitter/X (video.twimg.com), route through the streaming proxy
  // to avoid hotlink 403 forbidden blocks from browser Referer headers.
  const isTwitterCdn =
    activeVideoUrl?.includes('video.twimg.com') ||
    activeVideoUrl?.includes('twimg.com/amplify_video') ||
    activeVideoUrl?.includes('twimg.com/ext_tw_video');

  const proxySrc = isTwitterCdn
    ? `/api/video/proxy?url=${encodeURIComponent(activeVideoUrl!)}`
    : activeVideoUrl!;

  const finalSrc = useFallback ? activeVideoUrl! : proxySrc;

  const handleVideoError = () => {
    if (!useFallback && isTwitterCdn) {
      // Try direct URL fallback before declaring full error
      setUseFallback(true);
    } else {
      setVideoError(true);
    }
  };

  return (
    <div className="w-full flex items-center justify-center p-2 sm:p-4 bg-black/40">
      <div className="relative w-full max-w-2xl flex items-center justify-center rounded-2xl overflow-hidden shadow-2xl border border-border-subtle bg-black">
        <video
          key={finalSrc}
          src={finalSrc}
          controls
          playsInline
          autoPlay
          muted
          loop
          poster={thumbnail || undefined}
          className="w-full max-h-[58vh] object-contain bg-black"
          onError={handleVideoError}
        />
      </div>
    </div>
  );
}

