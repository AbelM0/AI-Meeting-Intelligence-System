import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { QueryProvider } from '@/providers/query-provider';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
});

export const metadata: Metadata = {
  title: 'Auralis | Meeting intelligence',
  description: 'Create meetings, attach private audio, and track processing state.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) throw new Error('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required.');
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body>
        <div
          hidden
          dangerouslySetInnerHTML={{
            __html:
              '<!-- THESIS: Audio is the instrument, not an attachment; refuse the generic pastel card dashboard. OWN-WORLD: cool white studio canvas, layered light surfaces, indigo controls, cyan accents, 8px geometry. STORY: scan the library, understand state, create or open a meeting. FIRST VIEWPORT: single-line navigation, title and primary action, compact ruled counts, meeting library with a restrained light processing overview. FORM: user-pinned Auralis neural-audio console, refined by user direction; concept seed a5dd6e44. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md -->',
          }}
        />
        <ClerkProvider
          publishableKey={publishableKey}
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          afterSignOutUrl="/"
        >
          <QueryProvider>{children}</QueryProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
