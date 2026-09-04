'use client';

import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

interface EmptyBoardsProps {
  onCreateClick: () => void;
}

export default function EmptyBoards({ onCreateClick }: EmptyBoardsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex-1 flex flex-col items-center justify-center text-center max-w-lg mx-auto py-12 sm:py-20"
    >
      {/* Architectural SVG Portal Illustration */}
      <div className="w-52 h-52 mb-6 relative">
        <svg
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-xl"
        >
          {/* Background Arch Wall */}
          <path
            d="M40 160V100C40 66.8629 66.8629 40 100 40C133.137 40 160 66.8629 160 100V160H40Z"
            fill="currentColor"
            className="text-surface-elevated"
          />
          {/* Inner Portal Arch */}
          <path
            d="M60 160V100C60 77.9086 77.9086 60 100 60C122.091 60 140 77.9086 140 100V160H60Z"
            fill="currentColor"
            className="text-surface"
          />
          <path
            d="M60 160V100C60 77.9086 77.9086 60 100 60C122.091 60 140 77.9086 140 100V160H60Z"
            stroke="currentColor"
            strokeWidth="2"
            className="text-border-subtle"
          />
          {/* Floating Memory Cards */}
          <rect
            x="75"
            y="92"
            width="32"
            height="42"
            rx="6"
            fill="currentColor"
            className="text-primary/20 dark:text-primary/30"
            transform="rotate(-10 75 92)"
          />
          <rect
            x="110"
            y="108"
            width="28"
            height="28"
            rx="6"
            fill="currentColor"
            className="text-accent/30 dark:text-accent/40"
            transform="rotate(15 110 108)"
          />
          {/* Center Lightning Bolt Badge */}
          <circle cx="100" cy="85" r="16" fill="currentColor" className="text-primary" />
          <path
            d="M101.5 77L96 85.5H100L98.5 93L104 84.5H100L101.5 77Z"
            fill="currentColor"
            className="text-accent"
          />
          {/* Architectural Floor line */}
          <path
            d="M25 160H175"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            className="text-border-subtle"
          />
        </svg>
      </div>

      <h3 className="text-2xl font-extrabold text-text-primary tracking-tight mb-2.5">
        Nothing here yet.
      </h3>
      <p className="text-sm font-medium text-text-secondary leading-relaxed mb-8 max-w-sm">
        Create your first Board and start collecting memes and links with your group.
      </p>

      {/* Primary Action Button */}
      <button
        onClick={onCreateClick}
        className="px-6 py-3 rounded-2xl bg-primary hover:opacity-90 active:scale-95 text-white text-sm font-extrabold transition-all shadow-md flex items-center gap-2"
      >
        <Plus className="w-4 h-4" />
        <span>Create your first Board</span>
      </button>
    </motion.div>
  );
}
