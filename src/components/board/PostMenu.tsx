'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, ExternalLink, Copy, Edit2, Trash2 } from 'lucide-react';

interface PostMenuProps {
  url: string;
  canEdit: boolean;
  canDelete: boolean;
  onCopyUrl: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function PostMenu({
  url,
  canEdit,
  canDelete,
  onCopyUrl,
  onEdit,
  onDelete,
}: PostMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={menuRef} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
        title="More actions"
        aria-label="Post actions"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 bottom-full mb-1 sm:bottom-auto sm:top-full sm:mt-1 w-44 bg-surface dark:bg-surface-elevated rounded-xl border border-border-subtle shadow-xl p-1.5 z-40 text-xs flex flex-col gap-0.5">
          <button
            onClick={() => {
              setOpen(false);
              onCopyUrl();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-text-primary font-medium text-left transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-text-secondary" />
            <span>Copy Link</span>
          </button>

          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-text-primary font-medium text-left transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-text-secondary" />
            <span>Open Original</span>
          </a>

          {canEdit && (
            <button
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-text-primary font-medium text-left transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5 text-text-secondary" />
              <span>Edit Details</span>
            </button>
          )}

          {canDelete && (
            <>
              <div className="h-px bg-border-subtle my-0.5" />
              <button
                onClick={() => {
                  setOpen(false);
                  onDelete();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 text-red-500 font-medium text-left transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Post</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
