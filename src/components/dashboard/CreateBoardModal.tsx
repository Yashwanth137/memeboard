'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { slugify } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, Sparkles } from 'lucide-react';

interface CreateBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export default function CreateBoardModal({
  isOpen,
  onClose,
  userId,
}: CreateBoardModalProps) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    setSlug(slugify(val));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim() || !userId) return;

    setLoading(true);
    setError('');

    try {
      const { data: newBoard, error: bError } = await supabase
        .from('boards')
        .insert({
          name: name.trim(),
          slug: slug.trim(),
          owner_id: userId,
        })
        .select()
        .single();

      if (bError) {
        if (bError.code === '23505') {
          throw new Error('A board with this URL slug already exists. Please choose a different name.');
        }
        throw bError;
      }

      await supabase.from('board_members').upsert(
        { board_id: newBoard.id, user_id: userId, role: 'owner' },
        { onConflict: 'board_id,user_id', ignoreDuplicates: true }
      );

      onClose();
      router.push(`/b/${newBoard.slug}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create board');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
            className="relative w-full max-w-md bg-surface rounded-[28px] p-7 sm:p-8 shadow-2xl border border-border-subtle overflow-hidden"
          >
            {/* Ambient Purple Glow for Dark Mode */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/15 dark:bg-primary/25 blur-3xl rounded-full pointer-events-none" />

            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 rounded-full bg-surface-elevated hover:bg-black/5 dark:hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="text-2xl font-extrabold text-text-primary tracking-tight">Create a Board</h3>
            </div>
            <p className="text-sm text-text-secondary mb-6 font-medium">
              Start a new shared space for your group&apos;s links and memes.
            </p>

            {error && (
              <div className="mb-6 p-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs font-semibold text-red-600 dark:text-red-400 leading-relaxed">{error}</p>
              </div>
            )}

            <form onSubmit={handleCreate} className="flex flex-col gap-4 relative z-10">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                  Board Name
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-surface-elevated border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-semibold placeholder-text-secondary/50 text-sm shadow-xs"
                  placeholder="e.g. Sinners, The Boys, Film Club"
                  value={name}
                  onChange={handleNameChange}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                  URL Slug
                </label>
                <div className="flex items-center overflow-hidden bg-surface-elevated border border-border-subtle rounded-xl focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary transition-all shadow-xs text-sm">
                  <span className="pl-3.5 pr-1 py-3 text-xs font-bold text-text-secondary/70 select-none">
                    memeboard.app/b/
                  </span>
                  <input
                    type="text"
                    className="flex-1 min-w-0 pr-3.5 py-3 bg-transparent text-text-primary focus:outline-none font-semibold placeholder-text-secondary/50 text-sm"
                    placeholder="slug"
                    value={slug}
                    onChange={(e) => setSlug(slugify(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-2 border-t border-border-subtle/50">
                <button
                  type="button"
                  className="px-5 py-2.5 rounded-xl hover:bg-surface-elevated text-text-secondary hover:text-text-primary text-xs font-bold transition-colors"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !name.trim() || !slug.trim()}
                  className="px-6 py-2.5 rounded-xl bg-primary hover:opacity-90 active:scale-95 text-white text-xs font-extrabold transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Create Board'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
