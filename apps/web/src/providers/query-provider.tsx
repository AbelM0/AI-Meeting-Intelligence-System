'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { useState } from 'react';
import { configureApiAuthentication } from '@/lib/api-client';

export function QueryProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const { getToken, isLoaded, userId } = useAuth();

  if (!isLoaded) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background px-6" role="status" aria-label="Loading Auralis">
        <div className="flex flex-col items-center">
          <div className="flex h-12 items-center gap-1.5 text-primary motion-safe:animate-pulse" aria-hidden="true">
            {[16, 28, 44, 32, 20].map((height, index) => (
              <span key={index} className="w-1.5 rounded-full bg-current" style={{ height }} />
            ))}
          </div>
          <p className="mt-5 text-xl font-semibold tracking-tight">Auralis</p>
          <p className="mt-2 text-sm text-muted-foreground">Getting things ready…</p>
        </div>
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
