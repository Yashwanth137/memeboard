'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Zap, Users, Link2, ArrowUpRight } from 'lucide-react';

export interface BoardCardProps {
  id: string;
  name: string;
  slug: string;
  member_count?: number;
  link_count?: number;
  thumbnails?: string[];
  members?: string[];
}

export default function BoardCard({
  name,
  slug,
  member_count = 1,
  link_count = 0,
  thumbnails = [],
  members = [],
}: BoardCardProps) {
  const hasThumbnails = thumbnails && thumbnails.length > 0;
  const isSingle = thumbnails && thumbnails.length === 1;

  return (
    <motion.div
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="group h-full flex flex-col"
    >
      <Link
        href={`/b/${slug}`}
        className="flex flex-col h-full bg-surface rounded-[26px] border border-border-subtle overflow-hidden shadow-xs hover:shadow-xl hover:border-primary/40 dark:hover:border-primary/50 transition-all duration-300"
      >
        {/* 16:10 Media Region */}
        <div className="aspect-[16/10] w-full bg-surface-elevated border-b border-border-subtle/80 overflow-hidden relative p-2.5 sm:p-3">
          {hasThumbnails ? (
            isSingle ? (
              <div
                className="w-full h-full rounded-2xl bg-cover bg-center shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] transform transition-transform duration-500 group-hover:scale-[1.02]"
                style={{ backgroundImage: `url(${thumbnails[0]})` }}
              />
            ) : (
              <div className={`grid w-full h-full gap-2 ${thumbnails.length === 2 ? 'grid-cols-2' : 'grid-cols-2 grid-rows-2'}`}>
                {thumbnails.slice(0, 4).map((thumb, idx) => (
                  <div
                    key={idx}
                    className="w-full h-full rounded-xl bg-cover bg-center shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] transform transition-transform duration-500 group-hover:scale-[1.02]"
                    style={{ backgroundImage: `url(${thumb})` }}
                  />
                ))}
              </div>
            )
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center rounded-2xl bg-black/5 dark:bg-white/5 border border-dashed border-border-subtle text-text-secondary/60 gap-2 p-4 text-center">
              <div className="w-9 h-9 rounded-full bg-surface flex items-center justify-center shadow-xs">
                <Zap className="w-4 h-4 text-accent" fill="currentColor" />
              </div>
              <span className="text-xs font-bold tracking-tight text-text-secondary">Nothing saved yet</span>
            </div>
          )}

          {/* Subtle depth gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/5 dark:from-black/20 to-transparent pointer-events-none rounded-t-[26px]" />
        </div>

        {/* Board Information Area */}
        <div className="p-5 sm:p-6 flex flex-col flex-1">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-text-primary leading-tight group-hover:text-primary transition-colors line-clamp-1">
              {name}
            </h3>
            <ArrowUpRight className="w-4 h-4 text-text-secondary/50 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 mt-1" />
          </div>

          {/* Stats Bar */}
          <div className="text-xs font-semibold text-text-secondary flex items-center gap-2 mb-5">
            <span className="inline-flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 opacity-70" />
              {member_count} {member_count === 1 ? 'member' : 'members'}
            </span>
            <span className="opacity-40">•</span>
            <span className="inline-flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 opacity-70" />
              {link_count} {link_count === 1 ? 'post' : 'posts'}
            </span>
          </div>

          {/* Member Avatars Stack */}
          <div className="mt-auto flex items-center justify-between pt-3 border-t border-border-subtle/50">
            <div className="flex -space-x-2">
              {members && members.length > 0 ? (
                members.slice(0, 3).map((m, i) => (
                  <div
                    key={i}
                    className="w-7 h-7 rounded-full bg-primary text-white border-2 border-surface flex items-center justify-center text-[10px] font-extrabold uppercase shadow-xs select-none"
                    title={m}
                  >
                    {m.charAt(0)}
                  </div>
                ))
              ) : (
                <div className="w-7 h-7 rounded-full bg-primary text-white border-2 border-surface flex items-center justify-center text-[10px] font-extrabold uppercase shadow-xs">
                  {name.charAt(0)}
                </div>
              )}

              {member_count > (members?.length || 1) && (
                <div className="w-7 h-7 rounded-full bg-surface-elevated text-text-secondary border-2 border-surface flex items-center justify-center text-[10px] font-bold shadow-xs">
                  +{member_count - Math.min(3, members?.length || 1)}
                </div>
              )}
            </div>

            <span className="text-xs font-extrabold text-primary group-hover:underline">
              Enter Board →
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
