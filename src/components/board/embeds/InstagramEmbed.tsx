'use client';

import React, { useEffect, useRef, useState } from 'react';
import { extractInstagramId } from '@/lib/platform';
import { processInstagramEmbeds } from '@/lib/embed-scripts';
import { LinkWithDetails } from '@/types/database';
import RichPreview from './RichPreview';

interface InstagramEmbedProps {
  url: string;
  link: LinkWithDetails;
}

export default function InstagramEmbed({ url, link }: InstagramEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [failed, setFailed] = useState<boolean>(false);

  const igInfo = extractInstagramId(url);

  useEffect(() => {
    if (!igInfo) {
      setFailed(true);
      setLoading(false);
      return;
    }

    let isCancelled = false;
    setLoading(true);
    setFailed(false);

    processInstagramEmbeds()
      .then(() => {
        if (isCancelled) return;
        setTimeout(() => {
          if (!isCancelled) setLoading(false);
        }, 350);
      })
      .catch((err) => {
        if (isCancelled) return;
        console.warn('Instagram embed.js failed to load:', err);
        setFailed(true);
        setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [igInfo, url]);

  if (!igInfo || failed) {
    return <RichPreview link={link} />
  }

  const cleanUrl = `https://www.instagram.com/${igInfo.type}/${igInfo.shortcode}/`;

  return (
    <div className="v2-instagram-embed-wrapper" ref={containerRef}>
      {loading && (
        <div className="v2-embed-skeleton">
          <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '50%', marginBottom: '12px' }} />
          <div className="skeleton" style={{ width: '60%', height: '16px', marginBottom: '8px' }} />
          <div className="skeleton" style={{ width: '100%', height: '300px', borderRadius: '8px' }} />
        </div>
      )}
      <div
        className="v2-instagram-embed-container"
        style={{ display: loading ? 'none' : 'flex', justifyContent: 'center' }}
      >
        <blockquote
          className="instagram-media"
          data-instgrm-captioned
          data-instgrm-permalink={cleanUrl}
          data-instgrm-version="14"
          style={{
            background: '#000',
            border: 'none',
            borderRadius: '12px',
            boxShadow: 'none',
            margin: '0 auto',
            maxWidth: '540px',
            minWidth: '326px',
            padding: 0,
            width: '100%',
          }}
        >
          <a href={cleanUrl} target="_blank" rel="noopener noreferrer">
            View post on Instagram
          </a>
        </blockquote>
      </div>
    </div>
  );
}
