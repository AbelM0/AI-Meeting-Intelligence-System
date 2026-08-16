import { AppShell } from '@/features/meetings/components/app-shell';
import { MeetingDetails } from '@/features/meetings/components/meeting-details';

type MeetingDetailsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function MeetingDetailsPage({ params }: MeetingDetailsPageProps) {
  const { id } = await params;

  return (
    <AppShell>
      <div
        data-print-root
        className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
      >
        <MeetingDetails id={id} />
      </div>
    </AppShell>
  );
}
