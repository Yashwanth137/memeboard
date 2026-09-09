'use client';

import React, { useState } from 'react';
import { LinkWithDetails } from '@/types/database';

interface RichPreviewProps {
  link?: LinkWithDetails | null;
  thumbnailUrl?: string | null;
  thumbnail?: string | null;
  title?: string | null;
  url?: string | null;
  externalId?: string | null;
}

export default function RichPreview({ link, thumbnailUrl, thumbnail, title, url }: RichPreviewProps) {
  const [imgError, setImgError] = useState(false);

  const finalThumb = thumbnail || thumbnailUrl || link?.thumbnail_url;
  const finalTitle = title || link?.title || 'Preview';
  const finalUrl = url || link?.url;

  if (!finalThumb || imgError) {
    return (
      <div className="w-full flex items-center justify-center py-16 px-4 bg-surface border-b border-border-subtle">
        <div className="text-center text-text-secondary">
          <div className="text-3xl mb-3">🔗</div>
          <p className="text-xs font-medium">No preview available</p>
          {finalUrl && (
            <a
              href={finalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary text-xs font-bold mt-2 inline-block hover:underline"
            >
              Visit link
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-black/90 flex items-center justify-center max-h-[60vh] p-1">
      <img
        src={finalThumb}
        alt={finalTitle}
        className="max-w-full max-h-[50vh] object-contain rounded-lg"
        loading="lazy"
        onError={() => setImgError(true)}
      />
    </div>
  );
}
