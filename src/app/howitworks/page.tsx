import Link from 'next/link';

export const metadata = {
    title: 'How it works — Memeboard',
};

export default function Page() {
    return (
        <main className="min-h-screen bg-page bg-noise text-text-primary">
            <div className="mx-auto w-full max-w-3xl px-6 pt-32 pb-20 md:px-8">

                {/* Navigation */}
                <div className="mb-12">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-opacity hover:opacity-80"
                    >
                        ← Back to Memeboard
                    </Link>
                </div>

                {/* Header */}
                <header>
                    <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl text-text-primary">
                        How It Works
                    </h1>

                    <p className="mt-4 max-w-2xl text-lg leading-8 text-text-secondary">
                        Memeboard gives your friend group a shared place to
                        collect the things you send each other.
                    </p>
                </header>

                {/* Steps */}
                <div className="mt-14 space-y-12">

                    <section>
                        <span className="text-sm font-bold text-primary">
                            01
                        </span>
                        <h2 className="mt-2 text-2xl font-bold tracking-tight text-text-primary">
                            Create a Board
                        </h2>
                        <p className="mt-3 text-base leading-7 text-text-secondary">
                            Create a Board for your group, give it a name, and
                            invite your friends. Each Board becomes your
                            group's shared collection.
                        </p>
                    </section>

                    <section>
                        <span className="text-sm font-bold text-primary">
                            02
                        </span>
                        <h2 className="mt-2 text-2xl font-bold tracking-tight text-text-primary">
                            Share something
                        </h2>
                        <p className="mt-3 text-base leading-7 text-text-secondary">
                            Found a meme, reel, YouTube video, Reddit post, or
                            interesting link? Send the URL to the Memeboard
                            Agent through Telegram.
                        </p>
                    </section>

                    <section>
                        <span className="text-sm font-bold text-primary">
                            03
                        </span>
                        <h2 className="mt-2 text-2xl font-bold tracking-tight text-text-primary">
                            It lands on your Board
                        </h2>
                        <p className="mt-3 text-base leading-7 text-text-secondary">
                            The Agent identifies your active Board and adds
                            the link to it. The original URL is preserved,
                            along with who shared it and when.
                        </p>
                    </section>

                    <section>
                        <span className="text-sm font-bold text-primary">
                            04
                        </span>
                        <h2 className="mt-2 text-2xl font-bold tracking-tight text-text-primary">
                            Come back whenever you want
                        </h2>
                        <p className="mt-3 text-base leading-7 text-text-secondary">
                            Instead of digging through old conversations,
                            open your Board and browse everything your group
                            has collected together.
                        </p>
                    </section>

                </div>

                {/* CTA */}
                <div className="mt-16 rounded-3xl border border-border-subtle bg-surface p-8 text-center shadow-sm">
                    <h2 className="text-2xl font-bold tracking-tight text-text-primary">
                        Start a Board for your group.
                    </h2>

                    <p className="mt-2 text-sm text-text-secondary">
                        Give your shared links somewhere to live.
                    </p>

                    <Link
                        href="/login"
                        className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-white shadow-sm transition-all hover:opacity-90 hover:shadow-md"
                    >
                        Create a Board →
                    </Link>
                </div>

            </div>
        </main>
    );
}