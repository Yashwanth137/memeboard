'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { Zap, ArrowRight, LogOut } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            if (data?.username) setUsername(data.username);
          });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase
          .from('profiles')
          .select('username')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data?.username) setUsername(data.username);
          });
      } else {
        setUsername(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Remove global navbar on boards, board routes, and settings so sidebar is primary navigation
  if (pathname?.startsWith('/b/') || pathname === '/boards' || pathname === '/settings') {
    return null;
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 w-full h-20 bg-page bg-noise transition-colors duration-300 flex items-center justify-center px-4 sm:px-6">
      <nav className="mx-auto flex items-center justify-between w-full max-w-4xl px-3 sm:px-4 py-2 bg-surface dark:bg-surface-elevated shadow-[0_4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_25px_rgba(0,0,0,0.35)] border border-border-subtle rounded-full transition-all duration-300">
        
        {/* Brand Logo */}
        <Link href={user ? '/boards' : '/'} className="flex items-center gap-1.5 sm:gap-2 pl-1 sm:pl-2 group">
          <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-primary group-hover:scale-110 transition-transform" fill="currentColor" />
          <span className="font-extrabold tracking-tight text-text-primary text-sm sm:text-base md:text-lg">MEMEBOARD</span>
        </Link>

        {/* Public Marketing Links (Strictly hidden for Authenticated Users) */}
        {!user && (
          <div className="hidden md:flex items-center gap-8 font-semibold text-[13px] text-text-secondary">
            <Link href="/howitworks" className="hover:text-text-primary transition-colors">How it works</Link>
            <Link href="/features" className="hover:text-text-primary transition-colors">Features</Link>
            <Link href="/groups" className="hover:text-text-primary transition-colors">For groups</Link>
          </div>
        )}

        {/* Auth / Action Area */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="text-[11px] sm:text-[13px] font-bold text-text-primary px-2 py-1 rounded-full bg-surface-elevated border border-border-subtle/60 hidden sm:inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                @{username || 'user'}
              </span>
              
              <ThemeToggle />

              <button
                onClick={handleSignOut}
                className="p-1.5 sm:px-3.5 sm:py-1.5 rounded-full bg-surface-elevated hover:bg-red-500/10 dark:hover:bg-red-500/20 text-text-secondary hover:text-red-500 text-xs sm:text-[13px] font-bold transition-colors flex items-center gap-1.5 border border-border-subtle shadow-xs"
                title="Sign out"
              >
                <span className="hidden sm:inline">Sign out</span>
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <ThemeToggle />
              <Link
                href="/login"
                className="px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full bg-text-primary hover:opacity-90 text-surface text-xs sm:text-sm font-bold transition-all flex items-center gap-1 sm:gap-1.5 shadow-md hover:shadow-lg"
              >
                <span>Sign in</span>
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
