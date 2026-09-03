'use client';

import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, Sun, Moon, Laptop, LogOut } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  email: string;
  onSignOut: () => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  username,
  email,
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
