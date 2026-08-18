'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { useState } from 'react';
import { configureApiAuthentication } from '@/lib/api-client';

export function QueryProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const { getToken, isLoaded, userId } = useAuth();

  if (!isLoaded) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
        Loading secure workspace…
      </div>
    );
  }

  return (
    <IdentityQueryProvider key={userId ?? 'signed-out'} getToken={getToken}>
      {children}
    </IdentityQueryProvider>
  );
}

function IdentityQueryProvider({
  children,
  getToken,
}: Readonly<{
  children: React.ReactNode;
  getToken: () => Promise<string | null>;
}>) {
  const [queryClient] = useState(() => new QueryClient());
  configureApiAuthentication(getToken);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
