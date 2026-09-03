import Link from 'next/link';

export const metadata = {
    title: 'For Groups — Memeboard',
    description: 'A shared home for everything your group sends each other.',
};

export default function ForGroupsPage() {
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
                    <p className="text-sm font-bold uppercase tracking-widest text-primary">
                        For Groups
                    </p>

                    <h1 className="mt-3 text-4xl font-extrabold tracking-tight md:text-5xl text-text-primary">
                        Your group has a place
                        <br />
                        for everything.
                    </h1>

                    <p className="mt-5 max-w-2xl text-lg leading-8 text-text-secondary">
                        Memeboard gives friend groups a shared space to keep
                        the memes, videos, links, and random internet finds
                        they don't want to lose.
                    </p>
                </header>

                {/* Content */}
                <div className="mt-14 space-y-12">

                    <section>
                        <span className="text-sm font-bold text-primary">
                            FOR THE FRIEND GROUP
                        </span>
                        <h2 className="mt-2 text-2xl font-bold tracking-tight text-text-primary">
                            Stop searching through old chats.
                        </h2>
                        <p className="mt-3 text-base leading-7 text-text-secondary">
                            The best things your friends send shouldn't
                            disappear into an endless chat history. Put them
                            on a shared Board where everyone can find them
                            again.
                        </p>
                    </section>

                    <section>
                        <span className="text-sm font-bold text-primary">
                            ONE SHARED SPACE
                        </span>
                        <h2 className="mt-2 text-2xl font-bold tracking-tight text-text-primary">
                            Everyone contributes.
                        </h2>
                        <p className="mt-3 text-base leading-7 text-text-secondary">
                            Create a Board, invite your friends, and let
                            everyone add the things worth keeping. The Board
                            becomes your group's shared collection.
                        </p>
                    </section>

                    <section>
                        <span className="text-sm font-bold text-primary">
                            SHARE FROM WHERE YOU ALREADY ARE
                        </span>
                        <h2 className="mt-2 text-2xl font-bold tracking-tight text-text-primary">
                            Send a link. We'll keep it.
                        </h2>
                        <p className="mt-3 text-base leading-7 text-text-secondary">
                            Found something worth saving? Send the URL to the
                            Memeboard Agent through Telegram. It gets added to
                            your active Board with the original link, sender,
                            and timestamp.
                        </p>
                    </section>

                    <section>
                        <span className="text-sm font-bold text-primary">
                            MADE TO LAST
                        </span>
                        <h2 className="mt-2 text-2xl font-bold tracking-tight text-text-primary">
                            Your group's internet memory.
                        </h2>
                        <p className="mt-3 text-base leading-7 text-text-secondary">
                            Over time, your Board becomes more than a list of
                            links. It becomes a record of the things your
                            group discovered, laughed at, and wanted to
                            remember.
                        </p>
                    </section>

                </div>

                {/* CTA */}
                <div className="mt-16 rounded-3xl border border-border-subtle bg-surface p-8 text-center shadow-sm md:p-10">
                    <h2 className="text-2xl font-bold tracking-tight text-text-primary">
                        Make a Board for your group.
                    </h2>

                    <p className="mt-2 text-text-secondary">
                        Start collecting the things you send each other.
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