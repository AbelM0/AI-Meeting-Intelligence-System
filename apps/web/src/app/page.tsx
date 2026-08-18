import type { Metadata } from 'next';
import { LandingPage } from './landing-page';

export const metadata: Metadata = {
  title: 'Auralis | Turn conversations into clear next steps',
  description:
    'Upload a private meeting recording and turn it into a searchable transcript, decisions, and accountable action items.',
};

export default function Home() {
  return <LandingPage />;
}
