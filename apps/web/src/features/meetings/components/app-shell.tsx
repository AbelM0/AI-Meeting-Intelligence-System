import { LockKeyIcon, WaveformIcon } from '@phosphor-icons/react/ssr';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="min-h-[100dvh] bg-[#f7f8fc] text-[#111827]">
      <nav className="border-b border-[#e5e7eb] bg-white" aria-label="Primary navigation">
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-10">
          <Link href="/meetings" className="group flex min-w-0 items-center gap-3 rounded-lg">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#c7d2fe] bg-[#eef2ff] text-[#4f46e5] transition-transform duration-200 group-hover:-translate-y-0.5">
              <WaveformIcon className="h-5 w-5" weight="duotone" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-base font-semibold tracking-[-0.02em] text-[#111827]">
                Auralis
              </span>
              <span className="hidden font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6b7280] sm:block">
                Meeting intelligence
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2 text-[#4b5563]">
            <LockKeyIcon className="h-4 w-4 text-[#4f46e5]" weight="duotone" aria-hidden="true" />
            <span className="hidden font-mono text-[11px] font-medium sm:inline">
              Private audio workspace
            </span>
            <UserButton />
          </div>
        </div>
      </nav>
      {children}
    </main>
  );
}
