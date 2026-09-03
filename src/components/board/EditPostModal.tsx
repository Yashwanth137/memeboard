'use client';

import React, { useState } from 'react';
import { LinkWithDetails, Category } from '@/types/database';

interface EditPostModalProps {
  link: LinkWithDetails | null;
  categories: Category[];
  onClose: () => void;
  onSave: (updated: LinkWithDetails) => void;
  onToast: (msg: string) => void;
}

export default function EditPostModal({
  link,
  categories,
  onClose,
  onSave,
  onToast,
}: EditPostModalProps) {
  const [title, setTitle] = useState(link?.title || '');
  const [categoryId, setCategoryId] = useState(link?.category_id || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!link) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const res = await fetch(`/api/links/${link.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          category_id: categoryId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update post');
      }

      const updatedCategory = categories.find((c) => c.id === categoryId) || null;
      const updatedLink: LinkWithDetails = {
        ...link,
        title: title.trim(),
        category_id: categoryId || null,
        category: updatedCategory,
        updated_at: new Date().toISOString(),
      };

      onSave(updatedLink);
      onToast('✅ Post updated successfully!');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error updating post');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="v2-modal-backdrop animate-fade-in" onClick={onClose}>
      <div className="card v2-dialog-panel" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0 }}>Edit Post</h3>
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
              Post Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
              id="edit-post-title-input"
              autoFocus
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
              id="edit-post-category-select"
            >
              <option value="">No Category (Random)</option>
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
              disabled={saving}
              className="btn btn-primary"
              id="save-edit-post-btn"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
