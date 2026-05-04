'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api/auth.api';
import { saveTokens } from '@/lib/auth/session';

function CallbackInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('Link inválido ou expirado.');
      return;
    }

    authApi.verificarMagicLink(token)
      .then(({ accessToken, refreshToken }) => {
        saveTokens(accessToken, refreshToken);
        router.replace('/dashboard');
      })
      .catch(() => setError('Link inválido ou já utilizado. Solicite um novo link.'));
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="text-center space-y-3">
        <p className="text-red-600 font-medium">{error}</p>
        <a href="/login" className="text-sm text-blue-600 underline">Voltar ao login</a>
      </div>
    );
  }

  return <p className="text-gray-500 text-sm">Verificando seu acesso...</p>;
}

export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-8 flex items-center justify-center">
        <Suspense fallback={<p className="text-gray-400 text-sm">Carregando...</p>}>
          <CallbackInner />
        </Suspense>
      </div>
    </div>
  );
}
