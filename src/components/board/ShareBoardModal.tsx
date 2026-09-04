'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Users, Share2 } from 'lucide-react';

interface ShareBoardModalProps {
  isOpen: boolean;
  boardName: string;
  boardSlug: string;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export default function ShareBoardModal({
  isOpen,
  boardName,
  boardSlug,
  onClose,
  onToast,
}: ShareBoardModalProps) {
  const [copied, setCopied] = useState(false);
  const [loadingToken, setLoadingToken] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState('');

  // Generate secure invite token on open
  const fetchInvite = React.useCallback(async () => {
    setLoadingToken(true);
    setInviteError(null);
    try {
      const res = await fetch(`/api/boards/${boardSlug}/invites`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.inviteUrl) {
          setShareUrl(data.inviteUrl);
        } else {
          setInviteError('Failed to generate invite link');
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setInviteError(errData.error || 'Failed to generate invite link');
      }
    } catch {
      setInviteError('Network error. Failed to generate invite link.');
    } finally {
      setLoadingToken(false);
    }
  }, [boardSlug]);

  React.useEffect(() => {
    if (!isOpen) return;
    fetchInvite();
  }, [isOpen, fetchInvite]);

  const handleCopy = async () => {
    if (!shareUrl || loadingToken) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      onToast('📋 Board invite link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      onToast('Failed to copy link');
    }
  };

  const handleNativeShare = async () => {
    if (!shareUrl || loadingToken) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${boardName} — Memeboard`,
          text: `Join "${boardName}" on Memeboard to share and view memes together!`,
          url: shareUrl,
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          handleCopy();
        }
      }
    } else {
      handleCopy();
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
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-text-primary tracking-tight">
                    Invite to {boardName}
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Bring your group into this board.
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Invite Link Box */}
            <div className="mb-5 space-y-2">
              <label className="block text-xs font-extrabold text-text-primary uppercase tracking-wider">
                Board Invite Link
              </label>

              {inviteError ? (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-red-600 dark:text-red-400">{inviteError}</p>
                  <button
                    type="button"
                    onClick={fetchInvite}
                    className="px-3 py-1 rounded-lg bg-red-500 text-white text-xs font-bold hover:opacity-90 transition-opacity"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-surface-elevated border border-border-subtle shadow-inner">
                  <input
                    type="text"
                    readOnly
                    value={loadingToken ? 'Generating secure invite link...' : shareUrl}
                    className={`flex-1 px-3 py-2 bg-transparent text-text-primary text-xs font-mono font-medium focus:outline-none select-all truncate ${
                      loadingToken ? 'opacity-60 italic' : ''
                    }`}
                  />
                  <button
                    onClick={handleCopy}
                    disabled={loadingToken || !shareUrl}
                    className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 shrink-0 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                      copied
                        ? 'bg-emerald-500 text-white'
                        : 'bg-primary text-white hover:opacity-90 shadow-xs'
                    }`}
                  >
                    {loadingToken ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              <p className="text-[11px] text-text-secondary leading-relaxed pt-1">
                Anyone with this link can view the collection and post links to this board.
              </p>
            </div>

            {/* Native Share Option (if supported) */}
            <div className="pt-3 border-t border-border-subtle/60 flex items-center justify-between">
              <button
                onClick={handleNativeShare}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>More sharing options</span>
              </button>

              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-text-secondary hover:text-text-primary transition-colors"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
