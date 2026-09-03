'use client';

import React, { useState } from 'react';
import { Category } from '@/types/database';
import { detectPlatform } from '@/lib/platform';

interface QuickAddModalProps {
  boardId: string;
  categories: Category[];
  currentUserId?: string | null;
  onClose: () => void;
  onAdded: () => void;
  onToast: (msg: string) => void;
}

export default function QuickAddModal({
  boardId,
  categories,
  currentUserId,
  onClose,
  onAdded,
  onToast,
}: QuickAddModalProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const detected = url.trim() ? detectPlatform(url.trim()) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    let targetUrl = url.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    setSubmitting(true);
    setError('');

    try {
      const platform = detectPlatform(targetUrl);
      const defaultCategory =
        categoryId ||
        categories.find((c) => c.slug === 'random')?.id ||
        null;

      // Direct client or server insert
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      const { data: inserted, error: insertErr } = await supabase
        .from('links')
        .insert({
          board_id: boardId,
          submitted_by: currentUserId || null,
          url: targetUrl,
          platform: platform.id,
          title: title.trim() || `${platform.label} Link`,
          category_id: defaultCategory,
        })
        .select('id')
        .single();

      if (insertErr) throw insertErr;

      // Trigger metadata enrichment asynchronously via API route
      if (inserted?.id) {
        fetch(`/api/metadata?url=${encodeURIComponent(targetUrl)}`)
          .then((res) => res.json())
          .then(async (meta) => {
            if (meta && meta.title && !title.trim()) {
              await supabase
                .from('links')
                .update({
                  title: meta.title,
                  description: meta.description,
                  thumbnail_url: meta.thumbnailUrl,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', inserted.id);
            }
          })
          .catch(() => {});
      }

      onToast('⚡ Link added to board!');
      onAdded();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add link');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="v2-modal-backdrop animate-fade-in" onClick={onClose}>
      <div className="card v2-dialog-panel" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0 }}>Add Link to Board</h3>
          <button onClick={onClose} className="v2-modal-close-btn" title="Close">
            ✕
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1rem',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: 'var(--color-danger)',
              fontSize: '0.85rem',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.85rem',
                color: 'var(--color-text-secondary)',
                marginBottom: '0.35rem',
                fontWeight: 500,
              }}
            >
              URL (Instagram, YouTube, Reddit, X...)
            </label>
            <input
              type="url"
              required
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="input"
              id="quick-add-url-input"
              autoFocus
            />

            {detected && (
              <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span className="text-muted" style={{ fontSize: '0.8rem' }}>Detected:</span>
                <span
                  className="badge"
                  style={{
                    backgroundColor: detected.badgeBg,
                    color: detected.accentColor,
                    fontSize: '0.7rem',
                  }}
                >
                  {detected.label}
                </span>
              </div>
            )}
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.85rem',
                color: 'var(--color-text-secondary)',
                marginBottom: '0.35rem',
                fontWeight: 500,
              }}
            >
              Title (Optional — will auto-fetch)
            </label>
            <input
              type="text"
              placeholder="e.g. Crazy clutch play"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
              id="quick-add-title-input"
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.85rem',
                color: 'var(--color-text-secondary)',
                marginBottom: '0.35rem',
                fontWeight: 500,
              }}
            >
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="v2-select"
              style={{ width: '100%', padding: '0.65rem' }}
              id="quick-add-category-select"
            >
              <option value="">Default (Random)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
              id="quick-add-submit-btn"
            >
              {submitting ? 'Adding...' : 'Add to Board'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
