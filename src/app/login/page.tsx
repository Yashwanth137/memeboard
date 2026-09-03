'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

import { Zap } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/boards';

  const [supabase] = useState(() => createClient());
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.push(redirectUrl);
      }
    });
  }, [supabase, router, redirectUrl]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (authMode === 'signup') {
        const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-');
        if (cleanUsername.length < 3) {
          setMessage({
            type: 'error',
            text: 'Username must be at least 3 alphanumeric characters.',
          });
          setLoading(false);
          return;
        }

        // Check if username is already taken
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', cleanUsername)
          .maybeSingle();

        if (existingUser) {
          setMessage({
            type: 'error',
            text: `Username @${cleanUsername} is already taken. Please choose another.`,
          });
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: cleanUsername,
            },
          },
        });

        if (error) throw error;

        // Upsert initial profile
        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email: data.user.email,
            username: cleanUsername,
          });
        }

        if (data.session) {
          router.push(redirectUrl);
          router.refresh();
        } else {
          setMessage({
            type: 'success',
            text: 'Account created! You can now sign in with your credentials.',
          });
          setAuthMode('signin');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        router.push(redirectUrl);
        router.refresh();
      }
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Authentication failed. Please check your credentials.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg-cream bg-noise">
      <div className="w-full max-w-[440px] bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-white relative z-10">
        
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-door-purple" fill="currentColor" />
            <span className="font-extrabold tracking-tight text-text-dark text-lg">MEMEBOARD</span>
          </Link>
          <h2 className="text-2xl font-bold tracking-tight text-text-dark mb-2">
            {authMode === 'signin' ? 'Welcome Back' : 'Create an Account'}
          </h2>
          <p className="text-text-muted text-sm font-medium">
            {authMode === 'signin'
              ? 'Sign in to access your shared boards'
              : 'Join Memeboard to share and browse with your crew'}
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
          <button
            type="button"
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
              authMode === 'signin' 
                ? 'bg-white text-text-dark shadow-sm' 
                : 'text-text-muted hover:text-text-dark'
            }`}
            onClick={() => {
              setAuthMode('signin');
              setMessage(null);
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
              authMode === 'signup' 
                ? 'bg-white text-text-dark shadow-sm' 
                : 'text-text-muted hover:text-text-dark'
            }`}
            onClick={() => {
              setAuthMode('signup');
              setMessage(null);
            }}
          >
            Create Account
          </button>
        </div>

        {message && (
          <div className={`p-4 rounded-xl mb-6 text-sm font-medium border ${
            message.type === 'error' 
              ? 'bg-red-50 text-red-600 border-red-100' 
              : 'bg-green-50 text-green-600 border-green-100'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {authMode === 'signup' && (
            <div>
              <label className="block text-sm font-semibold text-text-dark mb-1.5">Username</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">@</span>
                <input
                  type="text"
                  required
                  placeholder="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  className="w-full h-12 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-text-dark focus:bg-white focus:outline-none focus:border-door-purple/40 focus:ring-4 focus:ring-door-purple/5 transition-all"
                  maxLength={24}
                />
              </div>
              <span className="text-xs text-slate-400 mt-1.5 block font-medium">
                Lowercase, numbers, hyphens. Used for public identity.
              </span>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-text-dark mb-1.5">Email</label>
            <input
              type="email"
              required
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-text-dark placeholder-slate-400 focus:bg-white focus:outline-none focus:border-door-purple/40 focus:ring-4 focus:ring-door-purple/5 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-text-dark mb-1.5">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-text-dark placeholder-slate-400 focus:bg-white focus:outline-none focus:border-door-purple/40 focus:ring-4 focus:ring-door-purple/5 transition-all"
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-door-purple hover:bg-door-purple-light text-white font-bold rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2 shadow-sm"
          >
            {loading ? 'Please wait...' : authMode === 'signin' ? 'Sign In →' : 'Create Account →'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-sm font-medium text-slate-400 hover:text-text-dark transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-bg-cream bg-noise"><div className="text-text-muted font-medium">Loading...</div></div>}>
      <LoginForm />
    </Suspense>
  );
}
