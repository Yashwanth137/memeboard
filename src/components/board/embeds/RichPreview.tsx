'use client';

import React, { useState } from 'react';
import { LinkWithDetails } from '@/types/database';

interface RichPreviewProps {
  link: LinkWithDetails;
}

export default function RichPreview({ link }: RichPreviewProps) {
  const [imgError, setImgError] = useState(false);

  if (!link.thumbnail_url || imgError) {
    return (
      <div className="v2-rich-preview-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem 0', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔗</div>
          <p>No preview available</p>
          <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', marginTop: '0.5rem', display: 'inline-block' }}>Visit link</a>
        </div>
      </div>
    );
  }

  return (
    <div className="v2-rich-preview-card" style={{ padding: 0, background: '#000' }}>
      <div className="v2-rich-preview-image-wrapper" style={{ display: 'flex', justifyContent: 'center', maxHeight: '60vh' }}>
        <img
          src={link.thumbnail_url}
          alt={link.title || 'Preview'}
          style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain' }}
          loading="lazy"
          onError={() => setImgError(true)}
        />
      </div>
    </div>
  );
}
