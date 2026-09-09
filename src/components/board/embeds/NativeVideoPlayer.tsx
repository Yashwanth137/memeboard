'use client';

import React, { useState } from 'react';
import { LinkWithDetails } from '@/types/database';
import RichPreview from './RichPreview';

interface NativeVideoPlayerProps {
  url?: string | null;
  thumbnail?: string | null;
  externalId?: string | null;
  link?: LinkWithDetails;
}

/**
 * NativeVideoPlayer
 *
 * Renders direct video streams (MP4/WebM) such as those extracted from X/Twitter
 * with native video controls, poster, and graceful degradation to RichPreview.
 */
export default function NativeVideoPlayer({
  url,
  thumbnail,
  link,
}: NativeVideoPlayerProps) {
  const [videoError, setVideoError] = useState(false);

  // If no direct video stream is available or video fails to load, fall back to RichPreview
  if (!url || videoError) {
    return link ? (
      <RichPreview link={link} />
    ) : (
      <RichPreview thumbnailUrl={thumbnail} />
    );
  }

  return (
    <div className="w-full flex items-center justify-center p-2 sm:p-4 bg-black/5 dark:bg-black/20">
      <video
        src={url}
        controls
        playsInline
        poster={thumbnail || undefined}
        className="w-full max-h-[50vh] rounded-xl object-contain bg-black shadow-md"
        onError={() => setVideoError(true)}
      />
    </div>
  );
}
