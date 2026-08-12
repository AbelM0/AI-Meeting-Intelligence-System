import { AppShell } from '@/features/meetings/components/app-shell';
import { MeetingsDashboard } from '@/features/meetings/components/meetings-dashboard';

export default function Home() {
  return (
    <AppShell>
      <MeetingsDashboard />
    </AppShell>
  );
}
