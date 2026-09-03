'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Link2, Sparkles, Loader2 } from 'lucide-react';
import { Category } from '@/types/database';
import { detectPlatform } from '@/lib/platform';
import { createClient } from '@/lib/supabase/client';

interface AddLinkModalProps {
  isOpen: boolean;
  boardId: string;
  boardName: string;
  categories: Category[];
  currentUserId?: string | null;
  onClose: () => void;
  onAdded: () => void;
  onToast: (msg: string) => void;
}

export default function AddLinkModal({
  isOpen,
  boardId,
  boardName,
  categories,
  currentUserId,
  onClose,
  onAdded,
  onToast,
}: AddLinkModalProps) {
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
        categoryId || categories.find((c) => c.slug === 'random')?.id || null;

      const isVideo =
        platform.id === 'youtube' ||
        platform.id === 'tiktok' ||
        targetUrl.includes('v.redd.it') ||
        Boolean(targetUrl.match(/\.(mp4|webm|mov|m3u8)(\?.*)?$/i)) ||
        Boolean(targetUrl.match(/\/(reel|reels|shorts|clip|clips)\//i));
      const initialContentType: 'image' | 'video' | 'link' = isVideo ? 'video' : 'link';

      const supabase = createClient();

      const { data: inserted, error: insertErr } = await supabase
        .from('links')
        .insert({
          board_id: boardId,
          submitted_by: currentUserId || null,
          url: targetUrl,
          platform: platform.id,
          content_type: initialContentType,
          title: title.trim() || `${platform.label} Link`,
          category_id: defaultCategory,
        })
        .select('id')
        .single();

      if (insertErr) throw insertErr;

      // Trigger background metadata enrichment
      if (inserted?.id) {
        fetch(`/api/metadata?url=${encodeURIComponent(targetUrl)}`)
          .then((res) => res.json())
          .then(async (meta) => {
            if (meta) {
              const updates: any = {
                platform: meta.platform || platform.id,
                content_type: meta.contentType || initialContentType,
                updated_at: new Date().toISOString(),
              };
              if (!title.trim() && meta.title) updates.title = meta.title;
              if (meta.description) updates.description = meta.description;
              if (meta.thumbnailUrl) updates.thumbnail_url = meta.thumbnailUrl;

              await supabase
                .from('links')
                .update(updates)
                .eq('id', inserted.id);
            }
          })
          .catch(() => {});
      }

      onToast('⚡ Link added to board!');
      setUrl('');
      setTitle('');
      setCategoryId('');
      onAdded();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add link');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
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
                  Add to {boardName}
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Paste a link to save it to this collection.
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
              {/* URL Input */}
              <div>
                <label className="block text-xs font-extrabold text-text-primary mb-1.5 uppercase tracking-wider">
                  Link URL
                </label>
                <div className="relative">
                  <Link2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary/60" />
                  <input
                    type="text"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://..."
                    autoFocus
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-surface-elevated border border-border-subtle text-text-primary placeholder:text-text-secondary/40 text-sm font-medium focus:outline-none focus:border-primary transition-all shadow-xs"
                  />
                </div>

                {/* Detected Platform Tag */}
                {detected && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-primary">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Detected {detected.label}</span>
                  </div>
                )}
              </div>

              {/* Optional Title */}
              <div>
                <label className="block text-xs font-extrabold text-text-primary mb-1.5 uppercase tracking-wider">
                  Title <span className="font-normal text-text-secondary normal-case">(optional)</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Auto-extracted if left empty"
                  className="w-full px-4 py-3 rounded-2xl bg-surface-elevated border border-border-subtle text-text-primary placeholder:text-text-secondary/40 text-sm font-medium focus:outline-none focus:border-primary transition-all shadow-xs"
                />
              </div>

              {/* Category Select */}
              {categories.length > 0 && (
                <div>
                  <label className="block text-xs font-extrabold text-text-primary mb-1.5 uppercase tracking-wider">
                    Category <span className="font-normal text-text-secondary normal-case">(optional)</span>
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-surface-elevated border border-border-subtle text-text-primary text-sm font-medium focus:outline-none focus:border-primary transition-all shadow-xs cursor-pointer"
                  >
                    <option value="">Default / Uncategorized</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
                  disabled={submitting || !url.trim()}
                  className="px-6 py-2.5 rounded-xl bg-primary hover:opacity-90 active:scale-95 text-white font-extrabold text-xs transition-all shadow-xs disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{submitting ? 'Adding...' : 'Add Link'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
