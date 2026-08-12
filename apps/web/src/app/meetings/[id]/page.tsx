import { MeetingDetails } from '@/features/meetings/components/meeting-details';

type MeetingDetailsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function MeetingDetailsPage({ params }: MeetingDetailsPageProps) {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <MeetingDetails id={id} />
      </div>
    </main>
  );
}
