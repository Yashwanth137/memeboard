import React from 'react';

export default function SkeletonCard() {
  return (
    <div className="card skeleton-card">
      <div className="skeleton skeleton-thumb" />
      <div style={{ padding: '0.875rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.625rem' }}>
          <div className="skeleton skeleton-badge" />
          <div className="skeleton skeleton-badge" />
        </div>
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-text" />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
          <div className="skeleton skeleton-meta" />
          <div className="skeleton skeleton-meta" />
        </div>
      </div>
    </div>
  );
}
