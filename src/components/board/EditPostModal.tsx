'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
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
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Dialog Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md bg-surface rounded-3xl border border-border-subtle p-6 shadow-2xl z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-xl font-extrabold text-text-primary tracking-tight">
                Edit Post Details
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Update the title or assign to a category.
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-text-primary mb-1.5 uppercase tracking-wider">
                Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-surface-elevated border border-border-subtle text-text-primary text-sm font-medium focus:outline-none focus:border-primary transition-all shadow-xs"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-text-primary mb-1.5 uppercase tracking-wider">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-surface-elevated border border-border-subtle text-text-primary text-sm font-medium focus:outline-none focus:border-primary transition-all shadow-xs cursor-pointer"
              >
                <option value="">No Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !title.trim()}
                className="px-6 py-2.5 rounded-xl bg-primary hover:opacity-90 active:scale-95 text-white font-extrabold text-xs transition-all shadow-xs disabled:opacity-50 inline-flex items-center gap-2"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
