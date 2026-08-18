import {
  ArrowRightIcon,
  HouseIcon,
  ListBulletsIcon,
  WaveformIcon,
} from '@phosphor-icons/react/ssr';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import styles from './not-found.module.css';

const signalNodes = [
  { left: '8%', top: '15%', size: 12, opacity: 0.44, delay: '-1.2s', x: '10px', y: '-8px' },
  { left: '20%', top: '28%', size: 8, opacity: 0.36, delay: '-3.8s', x: '-7px', y: '12px' },
  { left: '13%', top: '69%', size: 16, opacity: 0.56, delay: '-2.1s', x: '12px', y: '4px' },
  { left: '29%', top: '80%', size: 9, opacity: 0.42, delay: '-4.5s', x: '-5px', y: '-10px' },
  { left: '35%', top: '12%', size: 15, opacity: 0.58, delay: '-2.8s', x: '8px', y: '11px' },
  { left: '40%', top: '31%', size: 7, opacity: 0.38, delay: '-5.1s', x: '-8px', y: '-7px' },
  { left: '47%', top: '18%', size: 9, opacity: 0.5, delay: '-1.7s', x: '5px', y: '-12px' },
  { left: '53%', top: '78%', size: 13, opacity: 0.54, delay: '-3.3s', x: '11px', y: '5px' },
  { left: '61%', top: '11%', size: 8, opacity: 0.36, delay: '-4.1s', x: '-5px', y: '13px' },
  { left: '66%', top: '34%', size: 14, opacity: 0.48, delay: '-2.4s', x: '7px', y: '-9px' },
  { left: '74%', top: '71%', size: 8, opacity: 0.42, delay: '-5.4s', x: '-10px', y: '3px' },
  { left: '84%', top: '19%', size: 16, opacity: 0.58, delay: '-1.9s', x: '5px', y: '10px' },
  { left: '91%', top: '47%', size: 10, opacity: 0.38, delay: '-3.5s', x: '-9px', y: '-6px' },
  { left: '88%', top: '82%', size: 13, opacity: 0.5, delay: '-4.8s', x: '6px', y: '-11px' },
  { left: '5%', top: '88%', size: 7, opacity: 0.34, delay: '-2.6s', x: '9px', y: '2px' },
  { left: '57%', top: '42%', size: 6, opacity: 0.34, delay: '-5.6s', x: '-4px', y: '7px' },
] as const;

export default function NotFound() {
  return (
    <main className={`${styles.page} min-h-[100dvh] overflow-hidden bg-background text-foreground`}>
      <header className="px-4 pt-4 sm:px-7 sm:pt-6">
        <nav
          className="mx-auto flex h-16 max-w-[1400px] items-center justify-between rounded-xl border border-border bg-popover px-4 shadow-[0_14px_45px_-30px_rgba(30,41,59,0.5)] sm:px-5"
          aria-label="Error page navigation"
        >
          <Link href="/" className="group inline-flex min-h-11 items-center gap-2.5 rounded-lg" aria-label="Auralis home">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-white transition-transform duration-200 group-hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none">
              <WaveformIcon className="h-[18px] w-[18px]" weight="bold" aria-hidden="true" />
            </span>
            <span className="text-[15px] font-semibold tracking-[-0.02em]">Auralis</span>
          </Link>
          <ThemeToggle className="h-11 w-11 motion-reduce:transform-none motion-reduce:transition-none" />
        </nav>
      </header>

      <section className="mx-auto grid min-h-[calc(100dvh-5rem)] max-w-[1400px] items-center gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:py-20">
        <div className="max-w-xl lg:pl-4">
          <h1 className="max-w-lg text-[clamp(3.25rem,7vw,6rem)] font-medium leading-[0.94] tracking-[-0.04em] text-balance">
            This signal went quiet.
          </h1>
          <p className="mt-7 max-w-md text-base leading-7 text-muted-foreground sm:text-[17px]">
            The page you followed does not exist, or it may have moved. Your meeting data is still
            right where you left it.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white shadow-[0_12px_28px_-14px_rgba(79,70,229,0.8)] transition duration-200 hover:-translate-y-0.5 active:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none"
            >
              <HouseIcon className="h-4 w-4" weight="bold" aria-hidden="true" />
              Back to home
            </Link>
            <Link
              href="/meetings"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-border bg-popover px-5 text-sm font-semibold text-foreground transition duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:bg-accent active:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none"
            >
              <ListBulletsIcon className="h-4 w-4 text-primary" weight="bold" aria-hidden="true" />
              Open meetings
              <ArrowRightIcon className="h-4 w-4" weight="bold" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className={styles.signalField} aria-hidden="true">
          {signalNodes.map((node, index) => (
            <span
              key={index}
              className={styles.node}
              style={
                {
                  left: node.left,
                  top: node.top,
                  '--node-size': `${node.size}px`,
                  '--node-opacity': node.opacity,
                  '--node-delay': node.delay,
                  '--node-shift-x': node.x,
                  '--node-shift-y': node.y,
                } as React.CSSProperties
              }
            />
          ))}
          <div className={styles.readout}>
            <span>4</span>
            <span className={styles.zero} />
            <span>4</span>
          </div>
          <div className={styles.baseline}>Signal not found</div>
        </div>
      </section>
    </main>
  );
}
