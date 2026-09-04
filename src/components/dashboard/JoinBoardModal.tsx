'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, ArrowRight, Compass } from 'lucide-react';

interface JoinBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export default function JoinBoardModal({
  isOpen,
  onClose,
  userId,
}: JoinBoardModalProps) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const parseSlug = (input: string): string => {
    let clean = input.trim();
    if (clean.includes('/b/')) {
      clean = clean.split('/b/')[1].split('/')[0].split('?')[0];
    }
    return clean.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || !userId) return;

    const slug = parseSlug(inputVal);
    if (!slug) {
      setError('Please enter a valid Board link or code.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let token = '';
      if (inputVal.includes('token=')) {
        try {
          const u = new URL(inputVal.startsWith('http') ? inputVal : `https://${inputVal}`);
          token = u.searchParams.get('token') || '';
        } catch {
          const match = inputVal.match(/[?&]token=([^&#\s]+)/);
          if (match) token = match[1];
        }
      }

      // Check if user is already a member of this board
      const { data: bData } = await supabase
        .from('boards')
        .select('id, slug')
        .eq('slug', slug)
        .maybeSingle();

      if (bData) {
        const { data: member } = await supabase
          .from('board_members')
          .select('user_id')
          .eq('board_id', bData.id)
          .eq('user_id', userId)
          .maybeSingle();

        if (member) {
          onClose();
          router.push(`/b/${slug}`);
          return;
        }
      }

      if (token) {
        const res = await fetch(`/api/boards/${slug}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Invalid or expired invite link');
        }
        onClose();
        router.push(`/b/${slug}`);
      } else {
        onClose();
        router.push(`/b/${slug}/join`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to join board');
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
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md bg-surface border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 overflow-hidden"
          >
            {/* Ambient Gold/Purple Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-accent/15 dark:bg-accent/20 blur-3xl rounded-full pointer-events-none" />

            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 rounded-full bg-surface-elevated hover:bg-black/5 dark:hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Compass className="w-4 h-4" />
              </div>
              <h3 className="text-2xl font-extrabold text-text-primary tracking-tight">Join a Board</h3>
            </div>
            <p className="text-sm text-text-secondary mb-6 font-medium">
              Enter an invite link or board code to join or open a collection.
            </p>

            {error && (
              <div className="mb-6 p-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs font-semibold text-red-600 dark:text-red-400 leading-relaxed">{error}</p>
              </div>
            )}

            <form onSubmit={handleJoin} className="flex flex-col gap-4 relative z-10">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                  Board Invite Link or Code
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-surface-elevated border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-semibold placeholder-text-secondary/50 text-sm shadow-xs"
                  placeholder="e.g. memeboard.app/b/the-boys?token=... or the-boys"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  required
                  autoFocus
                />
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
                  disabled={loading || !inputVal.trim()}
                  className="px-6 py-2.5 rounded-xl bg-primary hover:opacity-90 active:scale-95 text-white text-xs font-extrabold transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 min-w-[120px]"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Join Board</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
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
