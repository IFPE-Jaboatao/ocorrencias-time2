'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi }   from '@/lib/api/auth.api';
import { saveTokens } from '@/lib/auth/session';

const DEV_USERS = [
  { label: 'Professor',    email: 'professor@escola.edu.br' },
  { label: 'Coordenador',  email: 'coordenador@escola.edu.br' },
  { label: 'Diretor',      email: 'diretor@escola.edu.br' },
  { label: 'Admin',        email: 'admin@escola.edu.br' },
];

const isDev = process.env.NEXT_PUBLIC_DEV_LOGIN_ENABLED === 'true';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [sent, setSent]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const [devLoading, setDevLoading] = useState<string | null>(null);
  const [error, setError]       = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.solicitarMagicLink(email);
      setSent(true);
    } catch {
      setError('Não foi possível enviar o link. Verifique o e-mail e tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDevLogin(email: string) {
    setDevLoading(email);
    setError('');
    try {
      const { accessToken, refreshToken } = await authApi.devLogin(email);
      saveTokens(accessToken, refreshToken);
      router.push('/dashboard');
    } catch {
      setError('Falha no login de desenvolvimento.');
    } finally {
      setDevLoading(null);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-4">

        <div className="bg-white rounded-2xl shadow-sm p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SGOA</h1>
            <p className="mt-1 text-sm text-gray-500">Sistema de Gestão de Ocorrências Acadêmicas</p>
          </div>

          {sent ? (
            <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-800">
              <p className="font-medium">Link enviado!</p>
              <p className="mt-1">
                Verifique sua caixa de entrada em <strong>{email}</strong> e clique no link para acessar.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  E-mail institucional
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@escola.edu.br"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Enviando...' : 'Enviar link de acesso'}
              </button>
            </form>
          )}
        </div>

        {isDev && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
              Acesso rápido — ambiente de desenvolvimento
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DEV_USERS.map(({ label, email }) => (
                <button
                  key={email}
                  onClick={() => handleDevLogin(email)}
                  disabled={devLoading !== null}
                  className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed text-left"
                >
                  {devLoading === email ? '...' : label}
                  <span className="block text-xs font-normal text-amber-500 truncate">{email}</span>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
