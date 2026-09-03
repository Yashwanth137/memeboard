'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <nav className="navbar">
      <div className="container nav-container">
        <Link href={user ? '/dashboard' : '/'} className="nav-logo">
          <span className="logo-badge">⚡</span>
          <span className="logo-text">MEMEBOARD</span>
        </Link>

        <div className="nav-actions">
          {user ? (
            <>
              <Link href="/dashboard" className="nav-link">
                My Boards
              </Link>
              <div className="nav-user-info">
                <span className="user-email">{user.email?.split('@')[0]}</span>
                <button
                  onClick={handleSignOut}
                  className="btn btn-secondary btn-sm"
                  id="signout-button"
                >
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <Link href="/#auth" className="btn btn-primary btn-sm">
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
