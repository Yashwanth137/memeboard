'use client';

import React, { useEffect, useRef, useState } from 'react';
import { extractXStatusId } from '@/lib/platform';
import { createTwitterEmbed } from '@/lib/embed-scripts';
import { LinkWithDetails } from '@/types/database';
import RichPreview from './RichPreview';

interface XEmbedProps {
  url: string;
  link: LinkWithDetails;
}

export default function XEmbed({ url, link }: XEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [failed, setFailed] = useState<boolean>(false);

  const statusId = extractXStatusId(url) || (link as any).external_id;

  useEffect(() => {
    // If no valid tweet status ID, fall back to rich preview card immediately
    if (!statusId) {
      setFailed(true);
      setLoading(false);
      return;
    }

    let isCancelled = false;
    setLoading(true);
    setFailed(false);

    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }

    // Fallback if widget doesn't load within 3 seconds (e.g. adblocker)
    const fallbackTimeout = setTimeout(() => {
      if (!isCancelled && loading) {
        setFailed(true);
        setLoading(false);
      }
    }, 3000);

    createTwitterEmbed(statusId, containerRef.current!, {
      theme: 'dark',
      dnt: true,
      align: 'center',
    })
      .then((el) => {
        if (isCancelled) return;
        clearTimeout(fallbackTimeout);
        if (!el) {
          setFailed(true);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (isCancelled) return;
        clearTimeout(fallbackTimeout);
        console.warn('Failed to render X embed via widgets.js:', err);
        setFailed(true);
        setLoading(false);
      });

    return () => {
      isCancelled = true;
      clearTimeout(fallbackTimeout);
    };
  }, [statusId, url]);

  if (!statusId || failed) {
    return (
      <RichPreview
        link={link}
        
      />
    );
  }

  return (
    <div className="v2-x-embed-wrapper">
      {loading && (
        <div className="v2-embed-skeleton">
          <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '50%', marginBottom: '12px' }} />
          <div className="skeleton" style={{ width: '60%', height: '16px', marginBottom: '8px' }} />
          <div className="skeleton" style={{ width: '90%', height: '14px', marginBottom: '6px' }} />
          <div className="skeleton" style={{ width: '75%', height: '14px' }} />
        </div>
      )}
      <div
        ref={containerRef}
        className="v2-x-embed-container"
        style={{ display: loading ? 'none' : 'flex' }}
      />
    </div>
  );
}
