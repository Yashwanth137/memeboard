import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import { ThemeProvider } from '@/components/ThemeProvider';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Memeboard — Persistent Content Layer for Friends',
  description:
    'A social web platform for friend groups to collect and revisit memes, videos, and links shared across group chats.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={jakarta.className}>
      <body suppressHydrationWarning className="bg-page text-text-primary min-h-screen flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <Navbar />
          <main className="flex-1">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
