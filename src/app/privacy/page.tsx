import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy — Memeboard',
};

export default function PrivacyPage() {
  return (
    <div className="container" style={{ maxWidth: '720px', padding: '5rem 1.5rem' }}>
      <Link href="/" style={{ color: 'var(--color-primary)', fontSize: '0.9rem' }}>
        ← Back to Memeboard
      </Link>
      <h1 style={{ fontSize: '2.25rem', fontWeight: 800, margin: '1.5rem 0 1rem' }}>
        Privacy Policy
      </h1>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
        Last updated: September 2026
      </p>

      <div style={{ color: 'var(--color-text-secondary)', lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <section>
          <h2 style={{ color: 'var(--color-text)', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
            1. What Memeboard Is
          </h2>
          <p>
            Memeboard is a private content collection layer designed for friend groups. Your boards and the links, memes, and media saved to them are restricted to verified board members.
          </p>
        </section>

        <section>
          <h2 style={{ color: 'var(--color-text)', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
            2. Identity and Email Privacy
          </h2>
          <p>
            Your email address is strictly private and used only for authentication. In all public and social areas of Memeboard (such as feeds, attribution, and member lists), your identity is represented solely by your chosen unique @username.
          </p>
        </section>

        <section>
          <h2 style={{ color: 'var(--color-text)', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
            3. Data Retention
          </h2>
          <p>
            Memeboard stores metadata and cached preview images derived from publicly shared URLs. You may delete any link you have submitted at any time.
          </p>
        </section>
      </div>
    </div>
  );
}
