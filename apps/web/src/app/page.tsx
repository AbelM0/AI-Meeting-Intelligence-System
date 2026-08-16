import { WaveformIcon } from '@phosphor-icons/react/ssr';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-[#f7f8fc] px-6 py-16 text-[#111827]">
      <section className="w-full max-w-3xl border-y border-[#dbe0ea] py-16 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg border border-[#c7d2fe] bg-[#eef2ff] text-[#4f46e5]">
          <WaveformIcon className="h-6 w-6" weight="duotone" />
        </span>
        <p className="mt-6 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-[#4f46e5]">
          Auralis meeting intelligence
        </p>
        <h1 className="mt-4 text-[clamp(2.8rem,7vw,5.5rem)] font-medium leading-[0.98] tracking-[-0.055em]">
          Turn every conversation into clear next steps.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-[#4b5563]">
          Private recordings, accurate transcripts, decisions, and action items in one secure
          workspace.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link
            href="/sign-up"
            className="rounded-lg bg-[#4f46e5] px-5 py-3 text-sm font-semibold text-white"
          >
            Get started
          </Link>
          <Link
            href="/sign-in"
            className="rounded-lg border border-[#d1d5db] bg-white px-5 py-3 text-sm font-semibold text-[#111827]"
          >
            Sign in
          </Link>
        </div>
      </section>
    </main>
  );
}
