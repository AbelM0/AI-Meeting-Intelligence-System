import { AppShell } from '@/features/meetings/components/app-shell';
import { MeetingDetails } from '@/features/meetings/components/meeting-details';

type MeetingDetailsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function MeetingDetailsPage({ params }: MeetingDetailsPageProps) {
  const { id } = await params;

  return (
    <AppShell>
      <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
        <MeetingDetails id={id} />
      </div>
    </AppShell>
  );
}
