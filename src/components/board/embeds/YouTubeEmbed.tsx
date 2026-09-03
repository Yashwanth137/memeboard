'use client';

import React from 'react';
import { extractYouTubeVideoId } from '@/lib/platform';
import { LinkWithDetails } from '@/types/database';
import RichPreview from './RichPreview';

interface YouTubeEmbedProps {
  url: string;
  title?: string | null;
  link: LinkWithDetails;
}

export default function YouTubeEmbed({ url, title, link }: YouTubeEmbedProps) {
  const videoId = extractYouTubeVideoId(url);

  if (!videoId) {
    return <RichPreview link={link} />
  }

  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;

  return (
    <div className="v2-video-responsive">
      <iframe
        src={embedUrl}
        title={title || 'YouTube video'}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="v2-video-iframe"
      />
    </div>
  );
}
