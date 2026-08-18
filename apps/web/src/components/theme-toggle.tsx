'use client';

import { MoonIcon, SunIcon } from '@phosphor-icons/react';

type ResolvedTheme = 'light' | 'dark';

function getResolvedTheme(): ResolvedTheme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function ThemeToggle({ className = '' }: Readonly<{ className?: string }>) {
  function toggleTheme() {
    const nextTheme: ResolvedTheme = getResolvedTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    document.documentElement.style.colorScheme = nextTheme;
    window.localStorage.setItem('auralis-theme', nextTheme);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-popover text-muted-foreground transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-accent hover:text-foreground active:translate-y-0 ${className}`}
      aria-label="Toggle color theme"
      title="Toggle color theme"
    >
      <MoonIcon className="h-[18px] w-[18px] dark:hidden" weight="bold" aria-hidden="true" />
      <SunIcon className="hidden h-[18px] w-[18px] dark:block" weight="bold" aria-hidden="true" />
    </button>
  );
}
