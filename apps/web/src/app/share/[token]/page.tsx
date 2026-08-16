import { PublicMeetingShareView } from '@/features/meetings/components/public-meeting-share';

type PublicSharePageProps = { params: Promise<{ token: string }> };

export default async function PublicSharePage({ params }: PublicSharePageProps) {
  const { token } = await params;
  return <PublicMeetingShareView token={token} />;
}
