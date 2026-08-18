import { WaveformIcon } from '@phosphor-icons/react/ssr';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { ThemeToggle } from '@/components/theme-toggle';

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="min-h-[100dvh] bg-background text-foreground">
      <nav className="border-b border-border bg-popover" aria-label="Primary navigation">
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-10">
          <Link href="/meetings" className="group flex min-w-0 items-center gap-3 rounded-lg">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-accent text-primary transition-transform duration-200 group-hover:-translate-y-0.5">
              <WaveformIcon className="h-5 w-5" weight="duotone" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-base font-semibold tracking-[-0.02em] text-foreground">
                Auralis
              </span>
              <span className="hidden font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground sm:block">
                Meeting intelligence
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <UserButton />
          </div>
        </div>
      </nav>
      {children}
    </main>
  );
}
