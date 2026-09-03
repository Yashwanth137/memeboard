'use client';

import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, Sun, Moon, Laptop, LogOut } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  email: string;
  isTelegramConnected?: boolean;
  telegramUsername?: string | null;
  telegramLinkCode?: string | null;
  isWhatsAppConnected?: boolean;
  onSignOut: () => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  username,
  email,
  isTelegramConnected = false,
  telegramUsername = null,
  telegramLinkCode = null,
  isWhatsAppConnected = false,
  onSignOut,
}: SettingsModalProps) {
  const { theme, setTheme } = useTheme();

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
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 rounded-full bg-surface-elevated hover:bg-black/5 dark:hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Settings className="w-4 h-4" />
              </div>
              <h3 className="text-2xl font-extrabold text-text-primary tracking-tight">Settings</h3>
            </div>

            <div className="space-y-6">
              {/* Profile Section */}
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-text-secondary/70 mb-3">
                  Profile
                </h4>
                <div className="p-4 rounded-2xl bg-surface-elevated border border-border-subtle space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text-secondary">Username</span>
                    <span className="text-xs font-bold text-text-primary">@{username || 'user'}</span>
                  </div>
                  <div className="h-px bg-border-subtle/50" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text-secondary">Email</span>
                    <span className="text-xs font-bold text-text-primary truncate max-w-[200px]">{email}</span>
                  </div>
                </div>
              </div>

              {/* Connected Agents / Messaging Bots Section */}
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-text-secondary/70 mb-3">
                  Connected Agents
                </h4>
                <div className="p-4 rounded-2xl bg-surface-elevated border border-border-subtle space-y-3.5">
                  {/* Telegram */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-[#229ED9]/15 text-[#229ED9] flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .26z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-text-primary">Telegram</div>
                        <div className="text-[11px] text-text-secondary/80">
                          {isTelegramConnected
                            ? telegramUsername
                              ? `@${telegramUsername}`
                              : 'Linked to @memeboard_bot'
                            : telegramLinkCode
                            ? `Send /start ${telegramLinkCode}`
                            : 'Not connected'}
                        </div>
                      </div>
                    </div>
                    {isTelegramConnected ? (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-500">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
                        <span>Connected</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary/70">
                        <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-600" />
                        <span>Disconnected</span>
                      </div>
                    )}
                  </div>

                  <div className="h-px bg-border-subtle/50" />

                  {/* WhatsApp */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-[#25D366]/15 text-[#25D366] flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.53 7.32C9.33 7.32 9.01 7.4 8.74 7.69C8.47 7.97 7.72 8.67 7.72 10.11C7.72 11.55 8.77 12.93 8.91 13.13C9.06 13.33 10.92 16.2 13.84 17.33C16.27 18.26 16.76 18.08 17.29 18.03C17.83 17.98 19.01 17.33 19.26 16.64C19.5 15.95 19.5 15.36 19.43 15.24C19.36 15.12 19.16 15.05 18.86 14.9C18.57 14.75 17.14 14.05 16.87 13.95C16.61 13.85 16.41 13.8 16.21 14.1C16.02 14.4 15.48 15.04 15.31 15.24C15.15 15.43 14.98 15.46 14.68 15.31C14.39 15.16 13.44 14.85 12.32 13.85C11.44 13.07 10.86 12.1 10.69 11.8C10.52 11.5 10.67 11.35 10.82 11.2C10.95 11.07 11.11 10.86 11.26 10.69C11.41 10.51 11.46 10.39 11.56 10.19C11.66 10 11.61 9.82 11.53 9.68C11.46 9.53 10.86 8.07 10.62 7.48C10.38 6.91 10.14 6.99 9.96 6.98C9.79 6.98 9.65 6.97 9.53 6.97L9.53 7.32Z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-text-primary">WhatsApp</div>
                        <div className="text-[11px] text-text-secondary/70">
                          {isWhatsAppConnected ? 'Connected via Cloud API' : 'Cloud Bot'}
                        </div>
                      </div>
                    </div>
                    {isWhatsAppConnected ? (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-500">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
                        <span>Connected</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary/70">
                        <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-600" />
                        <span>Disconnected</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Appearance Section */}
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-text-secondary/70 mb-3">
                  Appearance
                </h4>
                <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-surface-elevated border border-border-subtle">
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                      theme === 'light'
                        ? 'bg-surface text-primary shadow-xs border border-border-subtle/80'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>Light</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                      theme === 'dark'
                        ? 'bg-surface text-primary shadow-xs border border-border-subtle/80'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>Dark</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('system')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                      theme === 'system'
                        ? 'bg-surface text-primary shadow-xs border border-border-subtle/80'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <Laptop className="w-3.5 h-3.5" />
                    <span>System</span>
                  </button>
                </div>
              </div>

              {/* Account Section */}
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-text-secondary/70 mb-3">
                  Account
                </h4>
                <button
                  type="button"
                  onClick={onSignOut}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-surface-elevated hover:bg-red-500/10 border border-border-subtle hover:border-red-500/30 text-text-secondary hover:text-red-500 text-xs font-bold transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
