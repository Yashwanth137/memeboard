'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function HomePage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, [supabase]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username.trim() || email.split('@')[0],
            },
          },
        });

        if (error) throw error;

        if (data.session) {
          router.push('/dashboard');
        } else {
          setMessage({
            type: 'success',
            text: 'Account created! Please check your email to confirm or sign in directly.',
          });
          setAuthMode('signin');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        router.push('/dashboard');
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
    <div className="container">
      {/* Hero Section */}
      <section className="hero">
        <span className="badge badge-primary" style={{ marginBottom: '1rem' }}>
          ⚡ Persistent Content Layer
        </span>
        <h1 className="hero-title">
          Where friend group links live forever.
        </h1>
        <p className="hero-subtitle">
          Stop losing memes, reels, YouTube videos, and Reddit posts in chat history.
          Share them to the Telegram Bot and they instantly organize on your group’s shared Board.
        </p>

        {user ? (
          <div style={{ marginTop: '2rem' }}>
            <Link href="/dashboard" className="btn btn-primary btn-lg" id="go-to-dashboard-btn">
              Go to Your Boards →
            </Link>
          </div>
        ) : null}
      </section>

      {/* Auth Section */}
      {!user && (
        <section id="auth" style={{ marginBottom: '5rem' }}>
          <div className="auth-card">
            <div className="auth-tabs">
              <button
                type="button"
                className={`auth-tab ${authMode === 'signin' ? 'active' : ''}`}
                onClick={() => {
                  setAuthMode('signin');
                  setMessage(null);
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`auth-tab ${authMode === 'signup' ? 'active' : ''}`}
                onClick={() => {
                  setAuthMode('signup');
                  setMessage(null);
                }}
              >
                Create Account
              </button>
            </div>

            {message && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1.25rem',
                  fontSize: '0.875rem',
                  backgroundColor:
                    message.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  color: message.type === 'error' ? 'var(--color-danger)' : 'var(--color-success)',
                  border: `1px solid ${
                    message.type === 'error'
                      ? 'rgba(239, 68, 68, 0.3)'
                      : 'rgba(16, 185, 129, 0.3)'
                  }`,
                }}
              >
                {message.text}
              </div>
            )}

            <form onSubmit={handleAuth} className="flex flex-col gap-4">
              {authMode === 'signup' && (
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      color: 'var(--color-text-secondary)',
                      marginBottom: '0.35rem',
                      fontWeight: 500,
                    }}
                  >
                    Display Name / Username
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Yashwanth"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="input"
                    id="username-input"
                  />
                </div>
              )}

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    color: 'var(--color-text-secondary)',
                    marginBottom: '0.35rem',
                    fontWeight: 500,
                  }}
                >
                  Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  id="email-input"
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    color: 'var(--color-text-secondary)',
                    marginBottom: '0.35rem',
                    fontWeight: 500,
                  }}
                >
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  id="password-input"
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '0.5rem' }}
                id="auth-submit-btn"
              >
                {loading ? 'Please wait...' : authMode === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            </form>
          </div>
        </section>
      )}

      {/* Feature Flow */}
      <section style={{ marginBottom: '6rem' }}>
        <h3 style={{ textAlign: 'center', marginBottom: '2.5rem', color: 'var(--color-text-secondary)' }}>
          How Memeboard Works
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
          <div className="card">
            <div style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>1️⃣</div>
            <h4 style={{ marginBottom: '0.5rem' }}>Create a Board</h4>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
              Set up a shared space for your squad, gaming crew, or movie club in one click.
            </p>
          </div>
          <div className="card">
            <div style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>2️⃣</div>
            <h4 style={{ marginBottom: '0.5rem' }}>Drop URLs in Telegram</h4>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
              Send Instagram reels, TikToks, YouTube links or Reddit posts to the Telegram bot.
            </p>
          </div>
          <div className="card">
            <div style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>3️⃣</div>
            <h4 style={{ marginBottom: '0.5rem' }}>Instant Group Feed</h4>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
              Links appear on the Board in seconds via Supabase Realtime for everyone to browse.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
