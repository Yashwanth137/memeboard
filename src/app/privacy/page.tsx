import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy — Memeboard',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-page bg-noise text-text-primary">
      <div className="mx-auto w-full max-w-3xl px-6 pt-32 pb-20 md:px-8">
        
        {/* Navigation */}
        <div className="mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-opacity hover:opacity-80"
          >
            ← Back to Memeboard
          </Link>
        </div>

        {/* Content */}
        <article>
          <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl text-text-primary">
            Privacy Policy
          </h1>

          <p className="mt-3 text-sm font-medium text-text-secondary">
            Last updated: September 2026
          </p>

          <div className="mt-10 space-y-8 text-base leading-relaxed text-text-secondary">
            <section>
              <h2 className="text-xl font-bold tracking-tight text-text-primary">
                1. What Memeboard Is
              </h2>
              <p className="mt-2.5">
                Memeboard is a private content collection layer designed for friend groups. Your boards and the links, memes, and media saved to them are restricted to verified board members.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold tracking-tight text-text-primary">
                2. Identity and Email Privacy
              </h2>
              <p className="mt-2.5">
                Your email address is strictly private and used only for authentication. In all public and social areas of Memeboard (such as feeds, attribution, and member lists), your identity is represented solely by your chosen unique @username.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold tracking-tight text-text-primary">
                3. Data Retention
              </h2>
              <p className="mt-2.5">
                Memeboard stores metadata and cached preview images derived from publicly shared URLs. You may delete any link you have submitted at any time.
              </p>
            </section>
          </div>
        </article>
      </div>
    </div>
  );
}
