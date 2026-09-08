'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MoreVertical, ExternalLink, Copy, Edit2, Trash2 } from 'lucide-react';

interface PostMenuProps {
  url: string;
  canEdit: boolean;
  canDelete: boolean;
  onCopyUrl: () => void;
  onEdit: () => void;
  onDelete: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function PostMenu({
  url,
  canEdit,
  canDelete,
  onCopyUrl,
  onEdit,
  onDelete,
  open: openProp,
  onOpenChange,
}: PostMenuProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isControlled = openProp !== undefined;
  const isOpen = isControlled ? openProp : internalOpen;

  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !isOpen;
    if (!isControlled) {
      setInternalOpen(next);
    }
    onOpenChangeRef.current?.(next);
  };

  const handleClose = useCallback(() => {
    if (!isControlled) {
      setInternalOpen(false);
    }
    onOpenChangeRef.current?.(false);
  }, [isControlled]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        handleClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, handleClose]);

  return (
    <div className="relative" ref={menuRef} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={handleToggle}
        className={`p-1 md:p-1.5 rounded-lg transition-colors cursor-pointer ${
          isOpen
            ? 'text-text-primary bg-surface-elevated'
            : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
        }`}
        title="More actions"
        aria-label="Post actions"
        aria-expanded={isOpen}
      >
        <MoreVertical className="w-3.5 h-3.5 md:w-4 md:h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 bottom-full mb-1.5 w-44 bg-surface dark:bg-surface-elevated rounded-xl border border-border-subtle shadow-xl p-1.5 z-50 text-xs flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100">
          <button
            onClick={() => {
              handleClose();
              onCopyUrl();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-text-primary font-medium text-left transition-colors cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-text-secondary" />
            <span>Copy Link</span>
          </button>

          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => handleClose()}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-text-primary font-medium text-left transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 text-text-secondary" />
            <span>Open Original</span>
          </a>

          {canEdit && (
            <button
              onClick={() => {
                handleClose();
                onEdit();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-text-primary font-medium text-left transition-colors cursor-pointer"
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
                  handleClose();
                  onDelete();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 text-red-500 font-medium text-left transition-colors cursor-pointer"
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
