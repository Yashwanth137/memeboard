'use client';

import React from 'react';
import { Plus } from 'lucide-react';

interface EmptyBoardProps {
  onAddClick: () => void;
  isFiltered?: boolean;
  onClearFilters?: () => void;
}

export default function EmptyBoard({
  onAddClick,
  isFiltered = false,
  onClearFilters,
}: EmptyBoardProps) {
  if (isFiltered) {
    return (
      <div className="w-full py-16 px-4 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-2xl bg-surface border border-border-subtle flex items-center justify-center mb-4 text-text-secondary">
          🔍
        </div>
        <h3 className="text-lg font-bold text-text-primary mb-1">
          No matching posts
        </h3>
        <p className="text-xs text-text-secondary max-w-sm mb-5">
          Try selecting another filter or clearing your search term.
        </p>
        {onClearFilters && (
          <button
            onClick={onClearFilters}
            className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-elevated border border-border-subtle text-text-primary text-xs font-bold transition-colors shadow-2xs"
          >
            Clear Filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full py-16 sm:py-24 px-4 flex flex-col items-center justify-center text-center">
      {/* Architectural Card SVG Illustration */}
      <div className="relative w-44 h-36 mb-6 select-none">
        <svg
          viewBox="0 0 176 144"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Back Card */}
          <rect
            x="36"
            y="16"
            width="104"
            height="84"
            rx="16"
            className="fill-surface-elevated stroke-border-subtle"
            strokeWidth="1.5"
            transform="rotate(4 88 58)"
          />

          {/* Front Card */}
          <rect
            x="32"
            y="28"
            width="112"
            height="90"
            rx="18"
            className="fill-surface stroke-border-subtle shadow-md"
            strokeWidth="1.5"
          />

          {/* Card Inner Dashed Zone */}
          <rect
            x="44"
            y="40"
            width="88"
            height="66"
            rx="12"
            className="stroke-primary/30 fill-primary/5"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />

          {/* Center Symbol */}
          <circle cx="88" cy="73" r="14" className="fill-primary/10" />
          <path
            d="M88 67V79M82 73H94"
            stroke="var(--semantic-primary, #7C3AED)"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Ambient Lighting Zap */}
          <circle cx="132" cy="24" r="10" className="fill-accent/20" />
          <path
            d="M132 18L128 24H134L130 30"
            stroke="var(--semantic-accent, #FBBF24)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Heading & Text */}
      <h3 className="text-xl font-extrabold text-text-primary tracking-tight mb-1.5">
        Nothing saved yet
      </h3>
      <p className="text-xs text-text-secondary max-w-sm mb-6 leading-relaxed">
        Send your first link to the Content Agent on WhatsApp or add one manually.
      </p>

      {/* Action */}
      <button
        onClick={onAddClick}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:opacity-90 active:scale-95 text-white font-extrabold text-xs transition-all shadow-xs"
      >
        <Plus className="w-4 h-4" />
        <span>Add Link</span>
      </button>
    </div>
  );
}
