'use client';

import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';
import { Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';

const emptySubscribe = () => () => {};

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!mounted) {
    return <div className="w-9 h-9 rounded-full bg-surface-elevated/50 border border-border-subtle" />;
  }

  const currentTheme = theme === 'system' ? resolvedTheme : theme;
  const isDark = currentTheme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="relative flex items-center justify-center w-9 h-9 rounded-full bg-surface-elevated hover:bg-black/5 dark:hover:bg-white/10 border border-border-subtle text-text-secondary hover:text-text-primary transition-colors shadow-sm overflow-hidden"
      aria-label="Toggle theme"
    >
      <motion.div
        initial={false}
        animate={{
          y: isDark ? 24 : 0,
          opacity: isDark ? 0 : 1,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="absolute"
      >
        <Sun className="w-4 h-4" />
      </motion.div>

      <motion.div
        initial={false}
        animate={{
          y: isDark ? 0 : -24,
          opacity: isDark ? 1 : 0,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="absolute"
      >
        <Moon className="w-4 h-4" />
      </motion.div>
    </button>
  );
}
