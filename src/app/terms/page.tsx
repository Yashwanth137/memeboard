import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service — Memeboard',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-bg-cream bg-noise text-text-dark">
      <div className="mx-auto w-full max-w-3xl px-6 pt-32 pb-20 md:px-8">
        
        {/* Navigation */}
        <div className="mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-door-purple transition-colors hover:text-door-purple-dark"
          >
            ← Back to Memeboard
          </Link>
        </div>

        {/* Content */}
        <article>
          <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl text-text-dark">
            Terms of Service
          </h1>

          <p className="mt-3 text-sm font-medium text-text-muted">
            Last updated: September 2026
          </p>

          <div className="mt-10 space-y-8 text-base leading-relaxed text-text-muted">
            <section>
              <h2 className="text-xl font-bold tracking-tight text-text-dark">
                1. Usage Agreement
              </h2>
              <p className="mt-2.5">
                By using Memeboard, you agree to use the service responsibly with your friends and respect copyright and terms of third-party platforms whose content you curate.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold tracking-tight text-text-dark">
                2. Content Ownership
              </h2>
              <p className="mt-2.5">
                Links shared to Memeboard remain the intellectual property of their original creators and host platforms. Memeboard merely displays references and rich previews.
              </p>
            </section>
          </div>
        </article>
      </div>
    </div>
  );
}
