import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service — Memeboard',
};

export default function TermsPage() {
  return (
    <div className="container" style={{ maxWidth: '720px', padding: '5rem 1.5rem' }}>
      <Link href="/" style={{ color: 'var(--color-primary)', fontSize: '0.9rem' }}>
        ← Back to Memeboard
      </Link>
      <h1 style={{ fontSize: '2.25rem', fontWeight: 800, margin: '1.5rem 0 1rem' }}>
        Terms of Service
      </h1>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
        Last updated: September 2026
      </p>

      <div style={{ color: 'var(--color-text-secondary)', lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <section>
          <h2 style={{ color: 'var(--color-text)', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
            1. Usage Agreement
          </h2>
          <p>
            By using Memeboard, you agree to use the service responsibly with your friends and respect copyright and terms of third-party platforms whose content you curate.
          </p>
        </section>

        <section>
          <h2 style={{ color: 'var(--color-text)', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
            2. Content Ownership
          </h2>
          <p>
            Links shared to Memeboard remain the intellectual property of their original creators and host platforms. Memeboard merely displays references and rich previews.
          </p>
        </section>
      </div>
    </div>
  );
}
