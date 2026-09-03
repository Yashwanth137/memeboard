'use client';

import React, { useEffect, useRef, useState } from 'react';
import { loadRedditScript, reprocessRedditEmbed } from '@/lib/embed-scripts';
import { LinkWithDetails } from '@/types/database';
import RichPreview from './RichPreview';

interface RedditEmbedProps {
  url: string;
  title?: string | null;
  link: LinkWithDetails;
}

export default function RedditEmbed({ url, title, link }: RedditEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [failed, setFailed] = useState<boolean>(false);

  // Derive canonical Reddit post permalink (removing query params)
  let cleanRedditUrl = url;
  try {
    const parsed = new URL(url);
    cleanRedditUrl = `${parsed.origin}${parsed.pathname}`;
  } catch {}

  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setFailed(false);

    loadRedditScript()
      .then(() => {
        if (isCancelled) return;
        reprocessRedditEmbed();
        // Give the widget script a moment to process the blockquote
        setTimeout(() => {
          if (!isCancelled) setLoading(false);
        }, 300);
      })
      .catch((err) => {
        if (isCancelled) return;
        console.warn('Reddit embed script failed to load:', err);
        setFailed(true);
        setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [cleanRedditUrl]);

  if (failed) {
    return <RichPreview link={link} />
  }

  return (
    <div className="v2-reddit-embed-wrapper" ref={containerRef}>
      {loading && (
        <div className="v2-embed-skeleton">
          <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '50%', marginBottom: '12px' }} />
          <div className="skeleton" style={{ width: '70%', height: '16px', marginBottom: '8px' }} />
          <div className="skeleton" style={{ width: '90%', height: '14px', marginBottom: '6px' }} />
          <div className="skeleton" style={{ width: '80%', height: '14px' }} />
        </div>
      )}
      <div
        className="v2-reddit-embed-container"
        style={{ display: loading ? 'none' : 'block' }}
      >
        <blockquote
          className="reddit-embed-bq"
          data-embed-theme="dark"
          data-embed-height="500"
          style={{ minHeight: '400px', margin: '0 auto', maxWidth: '640px' }}
        >
          <a href={cleanRedditUrl}>{title || 'Reddit Post'}</a>
        </blockquote>
      </div>
    </div>
  );
}
