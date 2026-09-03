import Link from 'next/link';

export const metadata = {
    title: 'Features — Memeboard',
};

export default function FeaturesPage() {
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
                        Features
                    </h1>

                    <p className="mt-3 text-sm font-medium text-text-muted">
                        Features of Memeboard
                    </p>

                    <div className="mt-10 space-y-8 text-base leading-relaxed text-text-muted">
                        <section>
                            <h2 className="text-xl font-bold tracking-tight text-text-dark">
                                1. Instant Organization
                            </h2>
                            <p className="mt-2.5">
                                Stop losing memes, reels, YouTube videos, and Reddit posts in chat history. Share them with our Agent and they instantly organize on your group's shared Board.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold tracking-tight text-text-dark">
                                2. Secure, Invite-Only Spaces
                            </h2>
                            <p className="mt-2.5">
                                All boards are private and invite-only. Only members added by board creators can view or contribute content, keeping your group's discussions secure.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold tracking-tight text-text-dark">
                                3. Persistent, Discoverable History
                            </h2>
                            <p className="mt-2.5">
                                Unlike chat messages that disappear, Board content is saved permanently. Every link, meme, and video lives on your group's Board for as long as the board exists, creating a lasting digital archive of your shared moments and interests.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold tracking-tight text-text-dark">
                                4. Clean, Uncluttered Interface
                            </h2>
                            <p className="mt-2.5">
                                A clean, minimalist interface designed to make your content the star. No distractions, no clutter—just your memes, organized your way.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold tracking-tight text-text-dark">
                                5. Email Privacy
                            </h2>
                            <p className="mt-2.5">
                                Your email address is strictly private and used only for authentication. In all public and social areas of Memeboard, your identity is represented solely by your chosen unique @username.
                            </p>
                        </section>
                    </div>
                </article>
            </div>
        </div>
    );
}
