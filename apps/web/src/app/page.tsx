import { workspaceInfoSchema } from '@meeting-intelligence/schemas';
import type { WorkspaceInfo } from '@meeting-intelligence/types';

export default function Home() {
  const workspace: WorkspaceInfo = workspaceInfoSchema.parse({
    name: 'AI Meeting Intelligence System',
  });

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <h1 className="text-center text-3xl font-semibold tracking-tight">{workspace.name}</h1>
    </main>
  );
}
