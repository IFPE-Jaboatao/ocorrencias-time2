'use client';

import { useState } from 'react';
import { authApi } from '@/lib/api/auth.api';

export default function LoginPage() {
  const [email, setEmail]     = useState('');
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SGOA</h1>
          <p className="mt-1 text-sm text-gray-500">Sistema de Gestão de Ocorrências Acadêmicas</p>
        </div>

        {sent ? (
          <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-800">
            <p className="font-medium">Link enviado!</p>
            <p className="mt-1">Verifique sua caixa de entrada em <strong>{email}</strong> e clique no link para acessar.</p>
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

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

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
    </div>
  );
}
