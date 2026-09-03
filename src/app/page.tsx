'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Link2, ArrowRight, Zap } from 'lucide-react';
import InteractiveDoor from '@/components/home/InteractiveDoor';

export default function HomePage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<any>(null);

  const [inviteLink, setInviteLink] = useState('');
  const [isEntering, setIsEntering] = useState(false);
  const [resolveError, setResolveError] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, [supabase]);

  const handleEnterBoard = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inviteLink.trim()) return;

    setResolveError('');

    let slug = inviteLink.trim();
    if (slug.includes('/b/')) {
      slug = slug.split('/b/')[1].split('/')[0];
    } else if (slug.includes('/invite/')) {
      slug = slug.split('/invite/')[1].split('/')[0];
    }

    slug = slug.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();

    if (!slug) {
      setResolveError('Invalid Board link or code.');
      return;
    }

    setIsEntering(true);

    // Wait for the door to open before redirecting
    setTimeout(() => {
      router.push(`/b/${slug}`);
    }, 1200);
  };

  return (
    <div className="min-h-screen flex flex-col bg-page text-text-primary bg-noise relative overflow-hidden">

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 pt-28 md:pt-32 pb-8 md:pb-16 grid grid-cols-1 md:grid-cols-2 place-items-center gap-8 md:gap-12 relative z-10">

        {/* Left Column: Typography & Input */}
        <motion.div
          className="w-full flex flex-col items-center text-center md:items-start md:text-left order-1"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: isEntering ? 0 : 1, x: isEntering ? -50 : 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >

          {/* Badge 
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 backdrop-blur-md shadow-sm border border-border-subtle mb-8">
            <Zap className="w-4 h-4 text-door-purple" />
            <span className="text-xs font-bold tracking-widest text-door-purple-dark uppercase">Persistent Content Layer</span>
          </div> */}

          {/* Headline */}
          <h1 className="text-5xl md:text-6xl lg:text-[4.5rem] font-extrabold tracking-tight mb-6 leading-[1.1] text-text-primary">
            Where friend group <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-door-purple via-pink-500 to-gold-glow bg-clip-text text-transparent">links live forever.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-text-secondary max-w-2xl md:max-w-md mb-12 leading-relaxed font-medium">
            Stop losing memes, reels, YouTube videos, and Reddit posts in chat history.
            Share them with our Agent and they instantly organize on your group's shared Board.
          </p>

          {/* Input Bar */}
          <div className="w-full max-w-md">
            <form onSubmit={handleEnterBoard} className="relative flex items-center shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] rounded-2xl group transition-all duration-300 focus-within:shadow-[0_8px_40px_rgba(76,29,149,0.15)] bg-surface">
              <Link2 className="absolute left-5 w-5 h-5 text-text-secondary/60 group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                className="w-full h-16 pl-14 pr-36 bg-transparent border-2 border-transparent rounded-2xl text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-primary/20 transition-all font-medium text-lg"
                placeholder="Enter a board link or invite"
                value={inviteLink}
                onChange={(e) => setInviteLink(e.target.value)}
                disabled={isEntering}
              />
              <button
                type="submit"
                disabled={isEntering || !inviteLink.trim()}
                className="absolute right-2 top-2 bottom-2 px-6 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                Enter <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {resolveError && (
              <motion.p initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-sm mt-3 font-medium px-2">
                {resolveError}
              </motion.p>
            )}

            <div className="mt-8 flex items-center justify-center md:justify-start gap-4">
              <div className="h-px bg-border-subtle flex-1 max-w-[60px]" />
              <span className="text-text-secondary/60 font-medium text-sm">or</span>
              <div className="h-px bg-border-subtle flex-1 max-w-[60px]" />
            </div>

            <div className="mt-6 text-center md:text-left">
              <Link
                href={user ? "/boards" : "/login?redirect=/boards"}
                className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-surface border-2 border-primary/10 text-primary font-bold hover:bg-primary/5 hover:border-primary/30 transition-all shadow-sm"
              >
                + Create a new Board
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Right Column: Architectural Scene */}
        <div className="w-full flex items-center justify-center relative order-2 mt-8 md:mt-0">

          {/* Wall shadow behind door */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent w-full h-[120%] -rotate-12 blur-3xl pointer-events-none" />

          {/* Interactive SVG Door */}
          <div className="w-full max-w-md relative z-10">
            <InteractiveDoor isOpen={isEntering} />
          </div>

          {/* Architectural Decor / Plaque */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: isEntering ? 0 : 1, scale: isEntering ? 0.9 : 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="hidden md:block absolute top-[30%] -right-8 w-40 bg-[#2C2C2C] text-[#E5D5C1] p-5 rounded shadow-[0_15px_30px_rgba(0,0,0,0.3)] border-b-4 border-r-4 border-[#1A1A1A]"
          >
            <p className="font-serif text-sm leading-snug">
              Your group's<br />internet<br /><span className="text-gold-glow">memory.</span>
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: isEntering ? 0 : 1, scale: isEntering ? 0.9 : 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="hidden md:block absolute bottom-[10%] -left-12 w-32 bg-[#2C2C2C] text-[#E5D5C1] p-4 rounded transform -rotate-6 shadow-[0_10px_20px_rgba(0,0,0,0.2)] border-t-2 border-l-2 border-[#4A4A4A]"
          >
            <p className="font-sans text-xs font-bold leading-tight uppercase tracking-wider mb-2">
              Collect.<br />Share.<br />Remember.
            </p>
            <div className="flex gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <Zap className="w-4 h-4 text-accent" />
            </div>
          </motion.div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 text-center text-text-secondary text-sm font-medium border-t border-border-subtle bg-surface/30 backdrop-blur-sm mt-auto">
        <div className="flex flex-wrap items-center justify-center gap-6 mb-4">
          <div className="flex items-center gap-2 text-text-primary font-extrabold tracking-tight">
            <Zap className="w-4 h-4 text-primary" />
            MEMEBOARD
          </div>
          <span className="w-1 h-1 rounded-full bg-border-subtle" />
          <Link href="/privacy" className="hover:text-text-primary transition-colors">Privacy</Link>
          <span className="w-1 h-1 rounded-full bg-border-subtle" />
          <Link href="/terms" className="hover:text-text-primary transition-colors">Terms</Link>
          <span className="w-1 h-1 rounded-full bg-border-subtle" />
          <a href="https://github.com/Yashwanth137/memeboard" target="_blank" rel="noopener noreferrer" className="hover:text-text-primary transition-colors">GitHub</a>
        </div>
        <p className="text-text-secondary/60">© 2026 Memeboard. All rights reserved.</p>
      </footer>
    </div>
  );
}
