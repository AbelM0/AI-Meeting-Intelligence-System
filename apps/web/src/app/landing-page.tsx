'use client';

import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClockCountdownIcon,
  CloudArrowUpIcon,
  ListChecksIcon,
  LockSimpleIcon,
  PlayIcon,
  SparkleIcon,
  TextAlignLeftIcon,
  WaveformIcon,
} from '@phosphor-icons/react';
import { motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';

const ease = [0.16, 1, 0.3, 1] as const;
const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.09 } } };

const coreFeatures = [
  {
    icon: TextAlignLeftIcon,
    title: 'Searchable transcript',
    copy: 'Find exact moments in a speaker-labelled record of the conversation.',
    tone: 'bg-accent text-primary',
  },
  {
    icon: CheckCircleIcon,
    title: 'Decisions with context',
    copy: 'See what was agreed and return to the source timestamp when needed.',
    tone: 'bg-info-surface text-info',
  },
  {
    icon: ListChecksIcon,
    title: 'Action items that move',
    copy: 'Keep owners, due dates, priorities, and progress in one clear view.',
    tone: 'bg-success-surface text-success',
  },
  {
    icon: LockSimpleIcon,
    title: 'Private by design',
    copy: 'Store audio privately and share approved results without exposing it.',
    tone: 'bg-muted text-muted-foreground',
  },
];

const steps = [
  { icon: CloudArrowUpIcon, title: 'Upload', copy: 'Add an MP3, WAV, or M4A recording.' },
  { icon: ClockCountdownIcon, title: 'Process', copy: 'Follow transcription and analysis as it happens.' },
  { icon: SparkleIcon, title: 'Act', copy: 'Review the transcript, decisions, and next steps.' },
];

function BrandMark() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-white">
        <WaveformIcon className="h-[18px] w-[18px]" weight="bold" aria-hidden="true" />
      </span>
      <span className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">Auralis</span>
    </span>
  );
}

function MotionLink({
  href,
  children,
  variant = 'primary',
}: Readonly<{
  href: string;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'light';
}>) {
  const styles = {
    primary: 'bg-primary text-white shadow-[0_12px_28px_-14px_rgba(79,70,229,0.8)]',
    secondary: 'border border-border bg-popover text-foreground',
    light: 'bg-popover text-primary',
  };

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.015 }}
      whileTap={{ y: 0, scale: 0.985 }}
      transition={{ duration: 0.22, ease }}
    >
      <Link
        href={href}
        className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold ${styles[variant]}`}
      >
        {children}
      </Link>
    </motion.div>
  );
}

function WaveStrip() {
  const reducedMotion = useReducedMotion();
  const bars = [12, 22, 34, 17, 27, 14, 38, 21, 30, 16, 25, 35, 18, 28];

  return (
    <div className="flex h-10 items-center justify-center gap-[3px]" aria-hidden="true">
      {bars.map((height, index) => (
        <motion.span
          key={`${height}-${index}`}
          className="w-[3px] rounded-full bg-current"
          style={{ height }}
          animate={reducedMotion ? undefined : { scaleY: [0.55, 1, 0.68, 0.9] }}
          transition={{
            duration: 1.35 + (index % 4) * 0.16,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: index * 0.04,
          }}
        />
      ))}
    </div>
  );
}

function ProductPreview() {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, x: 36, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.85, delay: 0.16, ease }}
      className="relative mx-auto w-full max-w-[620px]"
    >
      <div className="absolute -left-8 top-1/4 h-32 w-32 rounded-full bg-info-surface opacity-70 blur-3xl" />
      <div className="absolute -right-5 bottom-8 h-40 w-40 rounded-full bg-accent opacity-90 blur-3xl" />

      <div className="relative overflow-hidden rounded-[18px] border border-border bg-popover shadow-[0_32px_90px_-44px_rgba(30,41,59,0.55)]">
        <div className="flex h-11 items-center justify-between border-b border-border bg-muted px-4">
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="h-2 w-2 rounded-full bg-accent" />
            <span className="h-2 w-2 rounded-full bg-info-surface" />
            <span className="h-2 w-2 rounded-full bg-success-surface" />
          </div>
          <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Product planning
          </span>
          <span className="h-2 w-8 rounded-full bg-muted" />
        </div>

        <div className="grid min-h-[400px] grid-cols-[112px_1fr] sm:grid-cols-[145px_1fr]">
          <aside className="border-r border-border bg-muted p-3 sm:p-4">
            <div className="flex items-center gap-2 text-[10px] font-semibold text-primary">
              <WaveformIcon className="h-4 w-4" weight="duotone" /> Workspace
            </div>
            <div className="mt-7 space-y-2.5">
              {['Overview', 'Transcript', 'Decisions', 'Actions'].map((item, index) => (
                <div
                  key={item}
                  className={`rounded-md px-2.5 py-2 text-[9px] font-medium ${index === 0 ? 'bg-accent text-primary' : 'text-muted-foreground'}`}
                >
                  {item}
                </div>
              ))}
            </div>
          </aside>

          <div className="min-w-0 p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[8px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Completed
                </p>
                <h3 className="mt-1.5 text-sm font-semibold tracking-[-0.025em] text-foreground sm:text-base">
                  Product planning sync
                </h3>
              </div>
              <span className="rounded-full border border-success/35 bg-success-surface px-2 py-1 text-[8px] font-semibold text-success">
                Ready
              </span>
            </div>

            <div className="mt-5 rounded-lg border border-info/35 bg-muted p-3">
              <div className="flex items-center gap-3">
                <motion.span
                  whileHover={{ scale: 1.08 }}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-white"
                >
                  <PlayIcon className="h-3 w-3" weight="fill" />
                </motion.span>
                <div className="min-w-0 flex-1 text-primary">
                  <WaveStrip />
                </div>
                <span className="font-mono text-[8px] text-muted-foreground">32:18</span>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-[1.2fr_.8fr]">
              <div className="rounded-lg border border-border p-3.5">
                <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Summary
                </span>
                <div className="mt-3 space-y-2">
                  <span className="block h-2 w-full rounded-full bg-muted" />
                  <span className="block h-2 w-[86%] rounded-full bg-muted" />
                  <span className="block h-2 w-[64%] rounded-full bg-muted" />
                </div>
              </div>
              <div className="rounded-lg border border-border p-3.5">
                <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Speakers
                </span>
                <div className="mt-3 flex -space-x-1.5">
                  {['AK', 'JM', 'RS'].map((initials, index) => (
                    <span
                      key={initials}
                      className={`grid h-7 w-7 place-items-center rounded-full border-2 border-popover text-[7px] font-bold ${index === 0 ? 'bg-accent text-primary' : index === 1 ? 'bg-info-surface text-info' : 'bg-success-surface text-success'}`}
                    >
                      {initials}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-lg border border-border px-3.5 py-3">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Action items
                </span>
                <span className="font-mono text-[8px] text-primary">03 OPEN</span>
              </div>
              <div className="mt-3 space-y-2.5">
                {[74, 57].map((width) => (
                  <div key={width} className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-[3px] border border-border" />
                    <span className="h-1.5 rounded-full bg-border" style={{ width: `${width}%` }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function LandingPage() {
  const reducedMotion = useReducedMotion();

  return (
    <main className="w-full max-w-full overflow-x-hidden bg-background text-foreground">
      <header className="absolute inset-x-0 top-0 z-50 px-4 pt-4 sm:px-7 sm:pt-6">
        <motion.nav
          initial={reducedMotion ? false : { opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease }}
          className="mx-auto flex h-16 max-w-[1400px] items-center justify-between rounded-xl border border-popover/70 bg-popover/90 px-4 shadow-[0_14px_45px_-30px_rgba(30,41,59,0.5)] backdrop-blur-xl sm:px-5"
          aria-label="Main navigation"
        >
          <Link href="/" aria-label="Auralis home">
            <BrandMark />
          </Link>
          <div className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <motion.a href="#features" whileHover={{ y: -2 }} className="transition-colors hover:text-foreground">
              Features
            </motion.a>
            <motion.a href="#how-it-works" whileHover={{ y: -2 }} className="transition-colors hover:text-foreground">
              How it works
            </motion.a>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/sign-in"
                className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-muted-foreground sm:px-4"
              >
                Log in
              </Link>
            </motion.div>
            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/sign-up"
                className="inline-flex min-h-11 items-center rounded-lg bg-primary px-3 text-sm font-semibold text-white sm:px-4"
              >
                Start free
              </Link>
            </motion.div>
          </div>
        </motion.nav>
      </header>

      <section className="relative min-h-[820px] px-5 pb-24 pt-36 sm:px-8 sm:pt-44 lg:flex lg:min-h-[800px] lg:items-center lg:py-36">
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute left-[-10%] top-[8%] h-[520px] w-[520px] rounded-full bg-accent opacity-65 blur-[100px]" />
          <div className="absolute right-[-12%] top-[18%] h-[480px] w-[480px] rounded-full bg-info-surface opacity-60 blur-[110px]" />
          <div className="absolute inset-0 opacity-[0.22] [background-image:linear-gradient(#cbd5e1_1px,transparent_1px),linear-gradient(90deg,#cbd5e1_1px,transparent_1px)] [background-size:48px_48px] [mask-image:linear-gradient(to_bottom,black,transparent_78%)]" />
        </div>

        <div className="relative mx-auto grid w-full max-w-[1400px] items-center gap-14 lg:grid-cols-[1.04fr_.96fr] lg:gap-12">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.65, ease }}
              className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-primary"
            >
              Meeting intelligence that stays accountable
            </motion.p>
            <motion.h1
              variants={fadeUp}
              transition={{ duration: 0.75, ease }}
              className="mt-6 max-w-6xl text-[clamp(3.55rem,6.6vw,7.2rem)] font-medium leading-[0.91] tracking-[-0.066em]"
            >
              Hear the whole meeting. Keep what matters.
            </motion.h1>
            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.7, ease }}
              className="mt-8 max-w-xl text-[17px] leading-8 text-muted-foreground"
            >
              Turn a private recording into a searchable transcript, clear decisions, and action
              items your team can move forward.
            </motion.p>
            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.7, ease }}
              className="mt-9 flex flex-wrap gap-3"
            >
              <MotionLink href="/sign-up">
                Start free <ArrowRightIcon className="h-4 w-4" weight="bold" />
              </MotionLink>
              <MotionLink href="/sign-in" variant="secondary">
                Log in
              </MotionLink>
            </motion.div>
            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.7, ease }}
              className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-xs font-medium text-muted-foreground"
            >
              {['Private audio', 'Source-linked outcomes', 'Controlled sharing'].map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <CheckCircleIcon className="h-4 w-4 text-primary" weight="fill" />
                  {item}
                </span>
              ))}
            </motion.div>
          </motion.div>
          <ProductPreview />
        </div>
      </section>

      <section id="features" className="border-y border-border bg-popover px-5 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-[1400px]">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
            className="flex flex-col justify-between gap-6 md:flex-row md:items-end"
          >
            <motion.h2
              variants={fadeUp}
              transition={{ duration: 0.7, ease }}
              className="max-w-3xl text-[clamp(2.7rem,5vw,5rem)] font-medium leading-[0.98] tracking-[-0.055em]"
            >
              The meeting record, made useful.
            </motion.h2>
            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.7, ease }}
              className="max-w-sm text-base leading-7 text-muted-foreground"
            >
              Everything needed to understand what happened and move the work forward.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={stagger}
            className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4"
          >
            {coreFeatures.map((feature) => (
              <motion.article
                key={feature.title}
                variants={fadeUp}
                transition={{ duration: 0.65, ease }}
                className="min-h-[285px] bg-popover p-6 transition-colors hover:bg-muted sm:p-7"
              >
                <span className={`grid h-11 w-11 place-items-center rounded-lg ${feature.tone}`}>
                  <feature.icon className="h-5 w-5" weight="duotone" />
                </span>
                <h3 className="mt-14 text-2xl font-medium tracking-[-0.035em]">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{feature.copy}</p>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      <section id="how-it-works" className="px-5 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-[1400px]">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
            className="grid gap-12 lg:grid-cols-[.72fr_1.28fr] lg:gap-20"
          >
            <div>
              <motion.p
                variants={fadeUp}
                transition={{ duration: 0.65, ease }}
                className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-primary"
              >
                A focused workflow
              </motion.p>
              <motion.h2
                variants={fadeUp}
                transition={{ duration: 0.7, ease }}
                className="mt-5 max-w-lg text-[clamp(2.7rem,5vw,5rem)] font-medium leading-[0.98] tracking-[-0.055em]"
              >
                Three steps from conversation to clarity.
              </motion.h2>
            </div>

            <div className="border-t border-border">
              {steps.map((step, index) => (
                <motion.article
                  key={step.title}
                  variants={fadeUp}
                  transition={{ duration: 0.65, ease }}
                  whileHover={{ x: 6 }}
                  className="grid gap-4 border-b border-border py-7 sm:grid-cols-[52px_1fr_auto] sm:items-center sm:gap-6"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-lg bg-popover text-primary shadow-[0_10px_24px_-18px_rgba(30,41,59,0.5)]">
                    <step.icon className="h-5 w-5" weight="duotone" />
                  </span>
                  <div>
                    <h3 className="text-xl font-semibold tracking-[-0.03em]">{step.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.copy}</p>
                  </div>
                  <span className="font-mono text-[10px] font-semibold text-muted-foreground">
                    0{index + 1}
                  </span>
                </motion.article>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="px-5 pb-5 sm:px-8 sm:pb-8">
        <motion.div
          initial={{ opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.75, ease }}
          className="mx-auto grid max-w-[1400px] overflow-hidden rounded-xl bg-primary px-6 py-16 text-white sm:px-10 sm:py-20 lg:grid-cols-[1fr_auto] lg:items-end lg:text-left"
        >
          <div>
            <div className="mb-7 inline-flex h-12 w-24 items-center justify-center rounded-full bg-popover/10 text-[#a5f3fc]">
              <WaveStrip />
            </div>
            <h2 className="max-w-4xl text-[clamp(2.8rem,5.5vw,6rem)] font-medium leading-[0.94] tracking-[-0.06em]">
              Make the next meeting easier to act on.
            </h2>
          </div>
          <div className="mt-9 flex flex-wrap gap-3 lg:ml-10 lg:mt-0 lg:justify-end">
            <MotionLink href="/sign-up" variant="light">
              Start free <ArrowRightIcon className="h-4 w-4" weight="bold" />
            </MotionLink>
            <MotionLink href="/sign-in" variant="secondary">
              Log in
            </MotionLink>
          </div>
        </motion.div>
      </section>

      <footer className="px-5 py-10 sm:px-8 sm:py-12">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-6 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between">
          <BrandMark />
          <p className="text-sm text-muted-foreground">Private meeting audio. Clear next steps.</p>
          <div className="flex gap-6 text-sm font-semibold text-muted-foreground">
            <motion.a href="#features" whileHover={{ y: -2 }} className="transition-colors hover:text-foreground">
              Features
            </motion.a>
            <motion.div whileHover={{ y: -2 }} className="transition-colors hover:text-foreground">
              <Link href="/sign-in">Log in</Link>
            </motion.div>
            <motion.div whileHover={{ y: -2 }} className="transition-colors hover:text-foreground">
              <Link href="/sign-up">Sign up</Link>
            </motion.div>
          </div>
        </div>
      </footer>
    </main>
  );
}
