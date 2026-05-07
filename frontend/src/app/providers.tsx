'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { authApi } from '@/lib/api/auth.api';

function CsrfInitializer() {
  useEffect(() => {
    // Busca e seta o cookie csrf_token na inicialização da app
    authApi.getCsrfToken().catch(() => { /* silencioso — sem cookie o middleware bloqueia */ });
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
  }));

  return (
    <QueryClientProvider client={qc}>
      <CsrfInitializer />
      {children}
    </QueryClientProvider>
  );
}
