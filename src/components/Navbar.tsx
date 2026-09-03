'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { Zap, ArrowRight } from 'lucide-react';

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const router = useRouter();
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <header className="absolute top-0 left-0 right-0 z-50 bg-transparent flex justify-center px-4 pointer-events-none">
      <nav className="pointer-events-auto mx-auto mt-6 flex items-center justify-between w-full max-w-4xl px-4 py-2 bg-white/90 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-white rounded-full">
        <Link href={user ? '/boards' : '/'} className="flex items-center gap-2 pl-2">
          <Zap className="w-5 h-5 text-door-purple" fill="currentColor" />
          <span className="font-extrabold tracking-tight text-text-dark text-lg">MEMEBOARD</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 font-medium text-sm text-text-muted">
          <Link href="/howitworks" className="hover:text-text-dark transition-colors">How it works</Link>
          <Link href="/features" className="hover:text-text-dark transition-colors">Features</Link>
          <Link href="/groups" className="hover:text-text-dark transition-colors">For groups</Link>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link href="/boards" className="text-sm font-semibold text-text-dark hover:text-door-purple transition-colors hidden sm:block">
                My Boards
              </Link>
              <div className="flex items-center gap-3">
                <span className="text-sm text-text-muted hidden sm:block">@{username || 'user'}</span>
                <button
                  onClick={handleSignOut}
                  className="px-5 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-text-dark text-sm font-bold transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <Link
              href="/login"
              className="px-5 py-2.5 rounded-full bg-slate-900 hover:bg-black !text-white text-sm font-bold transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
            >
              <span className="text-white">Sign in</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
