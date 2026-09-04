'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Lock,
  Pencil,
  Link2,
  ExternalLink,
  Send,
  Clock,
  Sun,
  Moon,
  Laptop,
  Shield,
  LogOut,
  Check,
  Copy,
  RefreshCw,
  Unlink,
  Loader2,
  X,
  Key,
} from 'lucide-react';
import WorkspaceLayout, { useWorkspace } from '@/components/dashboard/WorkspaceLayout';
import { createClient } from '@/lib/supabase/client';
import { TELEGRAM_BOT_USERNAME } from '@/lib/telegram';

function SettingsContent() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [supabase] = useState(() => createClient());
  const workspace = useWorkspace();

  const [copied, setCopied] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [showManualCode, setShowManualCode] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // SSR hydration-safe mounted flag
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = mounted ? theme : undefined;

  // Edit Profile Modal State
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [linkCode, setLinkCode] = useState<string | null>(
    workspace?.telegramLinkCode || null
  );

  useEffect(() => {
    if (workspace?.telegramLinkCode) {
      setLinkCode(workspace.telegramLinkCode);
    }
  }, [workspace?.telegramLinkCode]);

  const botUsername = TELEGRAM_BOT_USERNAME || 'memeboard_bot';
  const isTelegramConnected = Boolean(workspace?.isTelegramConnected);
  const telegramUsername = workspace?.telegramUsername;
  const isWhatsAppConnected = Boolean(
    (workspace?.profile as any)?.whatsapp_phone_number
  );
  const user = workspace?.user;
  const username =
    workspace?.profile?.username ||
    user?.email?.split('@')[0] ||
    'user';
  const email = user?.email || '';

  // Format member creation date safely
  const memberSince = (() => {
    const rawDate = workspace?.profile?.created_at || user?.created_at;
    if (!rawDate || !mounted) return 'Sep 4, 2026';
    try {
      return new Date(rawDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Sep 4, 2026';
    }
  })();

  const telegramDeepLink = linkCode
    ? `https://t.me/${botUsername}?start=${linkCode}`
    : `https://t.me/${botUsername}`;

  const handleConnectTelegram = async () => {
    let codeToUse = linkCode;

    // If no active code, generate one on the fly
    if (!codeToUse) {
      setIsGeneratingCode(true);
      setStatusMessage(null);
      try {
        const { data, error } = await supabase.rpc('generate_telegram_link_code');
        if (error) throw error;
        if (data) {
          codeToUse = data;
          setLinkCode(data);
          workspace?.refreshWorkspace();
        }
      } catch (err: any) {
        setStatusMessage({
          type: 'error',
          text: err.message || 'Failed to generate connect code.',
        });
        setIsGeneratingCode(false);
        return;
      } finally {
        setIsGeneratingCode(false);
      }
    }

    const targetUrl = codeToUse
      ? `https://t.me/${botUsername}?start=${codeToUse}`
      : `https://t.me/${botUsername}`;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopyCommand = async () => {
    if (!linkCode) return;
    try {
      await navigator.clipboard.writeText(`/start ${linkCode}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard fallback
    }
  };

  const handleGenerateNewCode = async () => {
    setIsGeneratingCode(true);
    setStatusMessage(null);
    try {
      const { data, error } = await supabase.rpc('generate_telegram_link_code');
      if (error) throw error;
      if (data) {
        setLinkCode(data);
        setStatusMessage({
          type: 'success',
          text: 'New connect code generated successfully.',
        });
        workspace?.refreshWorkspace();
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to generate code.',
      });
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleUnlinkTelegram = async () => {
    setIsUnlinking(true);
    setStatusMessage(null);
    try {
      const { error } = await supabase.rpc('unlink_telegram_account');
      if (error) throw error;
      setStatusMessage({
        type: 'success',
        text: 'Telegram bot disconnected successfully.',
      });
      workspace?.refreshWorkspace();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to unlink Telegram account.',
      });
    } finally {
      setIsUnlinking(false);
    }
  };

  const handleOpenEditProfile = () => {
    setNewUsername(username);
    setEditError(null);
    setShowEditProfile(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newUsername.trim().toLowerCase();
    if (!trimmed) {
      setEditError('Username cannot be empty.');
      return;
    }
    if (trimmed.length < 3) {
      setEditError('Username must be at least 3 characters.');
      return;
    }
    if (!/^[a-z0-9_]+$/.test(trimmed)) {
      setEditError('Only letters, numbers, and underscores are allowed.');
      return;
    }

    setIsSavingProfile(true);
    setEditError(null);

    try {
      if (trimmed !== username.toLowerCase()) {
        const { data: isAvailable, error: checkError } = await supabase.rpc(
          'is_username_available',
          { p_username: trimmed }
        );
        if (checkError) throw checkError;
        if (!isAvailable) {
          setEditError(`@${trimmed} is already taken.`);
          setIsSavingProfile(false);
          return;
        }
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ username: trimmed })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setStatusMessage({
        type: 'success',
        text: `Username updated to @${trimmed}`,
      });
      setShowEditProfile(false);
      workspace?.refreshWorkspace();
    } catch (err: any) {
      setEditError(err.message || 'Failed to update username.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <div className="w-full space-y-6">
      {/* Top Breadcrumb & Page Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push('/boards')}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-elevated hover:bg-black/5 dark:hover:bg-white/10 text-text-secondary hover:text-text-primary text-xs font-semibold border border-border-subtle transition-colors shadow-2xs"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>

          <div className="flex items-center gap-1.5 text-xs text-text-secondary/70 font-medium">
            <Lock className="w-3.5 h-3.5 opacity-60" />
            <span>Private by design.</span>
          </div>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
            Settings
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Manage your account, connected apps, and workspace preferences.
          </p>
        </div>
      </div>

      {/* Global Status Toast */}
      <AnimatePresence>
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
            }`}
          >
            <span>{statusMessage.text}</span>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-xs opacity-70 hover:opacity-100 underline ml-3"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2 x 2 Balanced, Comfortable Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* BOX 1: Account (Top-Left) */}
        <div className="rounded-2xl bg-surface border border-border-subtle p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-border-subtle/70">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center text-base font-extrabold uppercase shrink-0">
                  {username?.charAt(0) || 'U'}
                </div>
                <div>
                  <h2 className="text-base font-bold text-text-primary leading-tight">
                    Account
                  </h2>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Your profile and account information.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenEditProfile}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-surface hover:bg-surface-elevated text-text-primary text-xs font-semibold border border-border-subtle transition-colors shadow-2xs"
              >
                <Pencil className="w-3.5 h-3.5 opacity-70" />
                <span>Edit Profile</span>
              </button>
            </div>

            {/* 3-Column Metadata Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div>
                <span className="text-xs font-medium text-text-secondary block">
                  Username
                </span>
                <span className="text-sm font-semibold text-text-primary truncate block mt-1">
                  @{username || 'user'}
                </span>
              </div>

              <div>
                <span className="text-xs font-medium text-text-secondary block">
                  Email
                </span>
                <span className="text-sm font-semibold text-text-primary truncate block mt-1">
                  {email || 'user@example.com'}
                </span>
              </div>

              <div>
                <span className="text-xs font-medium text-text-secondary block">
                  Member since
                </span>
                <span className="text-sm font-semibold text-text-primary block mt-1">
                  {memberSince}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-6 border-t border-border-subtle/50 flex items-center justify-between text-xs text-text-secondary">
            <span>Account Security</span>
            {user?.email_confirmed_at ? (
              <span
                suppressHydrationWarning
                className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                Active & Verified
              </span>
            ) : (
              <span
                suppressHydrationWarning
                className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5"
              >
                <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]" />
                Unverified Email
              </span>
            )}
          </div>
        </div>

        {/* BOX 2: Connected Apps (Top-Right) */}
        <div className="rounded-2xl bg-surface border border-border-subtle p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 text-text-primary mb-1">
              <Link2 className="w-4 h-4 text-primary" />
              <h2 className="text-base font-bold leading-tight">Connected Apps</h2>
            </div>
            <p className="text-xs text-text-secondary">
              Link your accounts to enhance your Memeboard experience.
            </p>
          </div>

          <div className="space-y-3.5 flex-1 flex flex-col justify-center">
            {/* Telegram Bot Row */}
            <div className="p-3.5 rounded-xl bg-surface-elevated/60 border border-border-subtle/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#229ED9]/15 text-[#229ED9] flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .26z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-text-primary">
                      Telegram Bot
                    </span>
                    <a
                      href={`https://t.me/${botUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#229ED9] hover:underline flex items-center gap-0.5 font-medium"
                    >
                      <span>@{botUsername}</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-80" />
                    </a>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Auto-save memes, videos, and links directly to your boards.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                {isTelegramConnected ? (
                  <>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{telegramUsername ? `@${telegramUsername}` : 'Connected'}</span>
                    </span>

                    <a
                      href={`https://t.me/${botUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#229ED9] hover:bg-[#229ED9]/90 text-white text-xs font-bold transition-all shadow-xs"
                    >
                      <Send className="w-3 h-3" />
                      <span>Open</span>
                    </a>

                    <button
                      type="button"
                      onClick={handleUnlinkTelegram}
                      disabled={isUnlinking}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all border border-rose-500/20 disabled:opacity-50"
                      title="Unlink Telegram bot"
                    >
                      {isUnlinking ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Unlink className="w-3 h-3" />
                      )}
                      <span>Unlink</span>
                    </button>
                  </>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface text-text-secondary text-xs font-medium border border-border-subtle/80">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      <span>Not Linked</span>
                    </span>

                    <button
                      type="button"
                      onClick={handleConnectTelegram}
                      disabled={isGeneratingCode}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#229ED9] hover:bg-[#229ED9]/90 active:scale-[0.99] text-white text-xs font-bold shadow-xs transition-all disabled:opacity-75"
                    >
                      {isGeneratingCode ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>Connect Telegram</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* WhatsApp Cloud Bot Row */}
            <div className="p-3.5 rounded-xl bg-surface-elevated/60 border border-border-subtle/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#25D366]/15 text-[#25D366] flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.53 7.32C9.33 7.32 9.01 7.4 8.74 7.69C8.47 7.97 7.72 8.67 7.72 10.11C7.72 11.55 8.77 12.93 8.91 13.13C9.06 13.33 10.92 16.2 13.84 17.33C16.27 18.26 16.76 18.08 17.29 18.03C17.83 17.98 19.01 17.33 19.26 16.64C19.5 15.95 19.5 15.36 19.43 15.24C19.36 15.12 19.16 15.05 18.86 14.9C18.57 14.75 17.14 14.05 16.87 13.95C16.61 13.85 16.41 13.8 16.21 14.1C16.02 14.4 15.48 15.04 15.31 15.24C15.15 15.43 14.98 15.46 14.68 15.31C14.39 15.16 13.44 14.85 12.32 13.85C11.44 13.07 10.86 12.1 10.69 11.8C10.52 11.5 10.67 11.35 10.82 11.2C10.95 11.07 11.11 10.86 11.26 10.69C11.41 10.51 11.46 10.39 11.56 10.19C11.66 10 11.61 9.82 11.53 9.68C11.46 9.53 10.86 8.07 10.62 7.48C10.38 6.91 10.14 6.99 9.96 6.98C9.79 6.98 9.65 6.97 9.53 6.97L9.53 7.32Z" />
                  </svg>
                </div>
                <div>
                  <span className="text-sm font-bold text-text-primary block">
                    WhatsApp Cloud Bot
                  </span>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Forward content via WhatsApp chat.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface text-text-secondary text-xs font-medium border border-border-subtle/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span>Not Linked</span>
                </span>

                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-surface-elevated text-text-secondary/60 border border-border-subtle/60 text-xs font-semibold cursor-not-allowed"
                >
                  <Clock className="w-3.5 h-3.5 opacity-60" />
                  <span>Coming Soon</span>
                </button>
              </div>
            </div>
          </div>

          {/* Expandable Manual Command & Code Fallback */}
          {!isTelegramConnected && (
            <div className="pt-1">
              {linkCode ? (
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <button
                      type="button"
                      onClick={() => setShowManualCode(!showManualCode)}
                      className="text-text-secondary hover:text-text-primary underline flex items-center gap-1 font-medium"
                    >
                      {showManualCode ? 'Hide manual command' : 'Or send command manually'}
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateNewCode}
                      disabled={isGeneratingCode}
                      className="text-text-secondary hover:text-primary flex items-center gap-1 font-medium transition-colors disabled:opacity-50 text-[11px]"
                      title="Generate a new connect code"
                    >
                      <RefreshCw
                        className={`w-3 h-3 ${isGeneratingCode ? 'animate-spin' : ''}`}
                      />
                      <span>New code</span>
                    </button>
                  </div>

                  {showManualCode && (
                    <div className="mt-2 p-3 rounded-xl bg-surface border border-border-subtle flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-text-primary truncate select-all pl-1">
                        /start {linkCode}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={handleCopyCommand}
                          className="px-2.5 py-1.5 rounded-lg bg-surface-elevated hover:bg-black/5 dark:hover:bg-white/10 text-text-secondary hover:text-text-primary text-xs font-semibold transition-all flex items-center gap-1 border border-border-subtle"
                        >
                          {copied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="text-emerald-500">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-surface-elevated/50 border border-border-subtle flex items-center justify-between gap-3">
                  <div className="text-xs">
                    <span className="font-semibold text-text-primary block">
                      No Connect Code
                    </span>
                    <span className="text-text-secondary text-[11px]">
                      Generate a code to link your bot via manual /start command.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateNewCode}
                    disabled={isGeneratingCode}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#229ED9]/10 hover:bg-[#229ED9]/20 text-[#229ED9] text-xs font-bold transition-all border border-[#229ED9]/20 disabled:opacity-50 shrink-0"
                  >
                    {isGeneratingCode ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Key className="w-3 h-3" />
                    )}
                    <span>Generate Code</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* BOX 3: Appearance (Bottom-Left) */}
        <div className="rounded-2xl bg-surface border border-border-subtle p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 text-text-primary mb-1">
              <Sun className="w-4 h-4 text-primary" />
              <h2 className="text-base font-bold leading-tight">Appearance</h2>
            </div>
            <p className="text-xs text-text-secondary">
              Customize how Memeboard looks for you.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-1">
            {/* Light */}
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                currentTheme === 'light'
                  ? 'border-primary ring-2 ring-primary/20 bg-primary/[0.04] text-text-primary font-semibold'
                  : 'border-border-subtle hover:border-border-subtle/80 bg-surface-elevated/40 text-text-secondary hover:text-text-primary'
              }`}
            >
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4" />
                <span className="text-xs sm:text-sm font-medium">Light</span>
              </div>
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  currentTheme === 'light'
                    ? 'border-primary bg-primary'
                    : 'border-border-subtle'
                }`}
              >
                {currentTheme === 'light' && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </div>
            </button>

            {/* Dark */}
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                currentTheme === 'dark'
                  ? 'border-primary ring-2 ring-primary/20 bg-primary/[0.04] text-text-primary font-semibold'
                  : 'border-border-subtle hover:border-border-subtle/80 bg-surface-elevated/40 text-text-secondary hover:text-text-primary'
              }`}
            >
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4" />
                <span className="text-xs sm:text-sm font-medium">Dark</span>
              </div>
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  currentTheme === 'dark'
                    ? 'border-primary bg-primary'
                    : 'border-border-subtle'
                }`}
              >
                {currentTheme === 'dark' && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </div>
            </button>

            {/* System */}
            <button
              type="button"
              onClick={() => setTheme('system')}
              className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                currentTheme === 'system'
                  ? 'border-primary ring-2 ring-primary/20 bg-primary/[0.04] text-text-primary font-semibold'
                  : 'border-border-subtle hover:border-border-subtle/80 bg-surface-elevated/40 text-text-secondary hover:text-text-primary'
              }`}
            >
              <div className="flex items-center gap-2">
                <Laptop className="w-4 h-4" />
                <span className="text-xs sm:text-sm font-medium">System</span>
              </div>
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  currentTheme === 'system'
                    ? 'border-primary bg-primary'
                    : 'border-border-subtle'
                }`}
              >
                {currentTheme === 'system' && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </div>
            </button>
          </div>

          <p className="text-xs text-text-secondary/70">
            Automatically adapts to your operating system preferences when System is selected.
          </p>
        </div>

        {/* BOX 4: Account Actions (Bottom-Right) */}
        <div className="rounded-2xl bg-surface border border-border-subtle p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-surface-elevated flex items-center justify-center text-text-secondary shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-text-primary leading-tight">
                  Account Actions
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  Manage active sessions and sign out of your account.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/25 bg-red-500/[0.04] hover:bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold transition-colors shadow-2xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-elevated/40 border border-border-subtle/60 text-xs text-text-secondary space-y-1">
            <span className="font-semibold text-text-primary block">Session Security</span>
            <p className="leading-relaxed text-[11px]">
              Signing out will end your current session on this browser. Your boards, content, and Telegram links remain safe in the cloud.
            </p>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal Dialog */}
      <AnimatePresence>
        {showEditProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-xs"
              onClick={() => !isSavingProfile && setShowEditProfile(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm bg-surface rounded-2xl p-5 shadow-xl border border-border-subtle z-10"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-text-primary">
                  Edit Username
                </h3>
                <button
                  type="button"
                  onClick={() => setShowEditProfile(false)}
                  disabled={isSavingProfile}
                  className="p-1 rounded-lg text-text-secondary hover:text-text-primary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-text-secondary block mb-1">
                    Username
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-text-secondary text-sm font-semibold">
                      @
                    </span>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      disabled={isSavingProfile}
                      placeholder="username"
                      className="w-full pl-7 pr-3 py-2 rounded-xl bg-surface-elevated border border-border-subtle text-sm text-text-primary focus:outline-hidden focus:ring-2 focus:ring-primary/40 font-semibold"
                    />
                  </div>
                  {editError && (
                    <p className="text-xs text-rose-500 mt-1.5 font-medium">
                      {editError}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEditProfile(false)}
                    disabled={isSavingProfile}
                    className="px-3 py-1.5 rounded-xl border border-border-subtle text-text-secondary hover:text-text-primary text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="px-4 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSavingProfile ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Changes</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <WorkspaceLayout>
      <SettingsContent />
    </WorkspaceLayout>
  );
}
