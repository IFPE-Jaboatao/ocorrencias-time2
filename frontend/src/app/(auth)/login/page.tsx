'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Send, Loader2, ShieldCheck, Zap } from 'lucide-react';
import { authApi }   from '@/lib/api/auth.api';

const DEV_USERS = [
  { label: 'Professor',    email: 'professor@escola.edu.br',   cor: 'text-blue-600 bg-blue-50 border-blue-200' },
  { label: 'Coordenador',  email: 'coordenador@escola.edu.br', cor: 'text-purple-600 bg-purple-50 border-purple-200' },
  { label: 'Diretor',      email: 'diretor@escola.edu.br',     cor: 'text-amber-700 bg-amber-50 border-amber-200' },
  { label: 'Admin',        email: 'admin@escola.edu.br',       cor: 'text-red-600 bg-red-50 border-red-200' },
];

const isDev = process.env.NEXT_PUBLIC_DEV_LOGIN_ENABLED === 'true';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]             = useState('');
  const [sent, setSent]               = useState(false);
  const [loading, setLoading]         = useState(false);
  const [devLoading, setDevLoading]   = useState<string | null>(null);
  const [error, setError]             = useState('');

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

  async function handleDevLogin(userEmail: string) {
    setDevLoading(userEmail);
    setError('');
    try {
      await authApi.devLogin(userEmail);
      router.push('/dashboard');
    } catch {
      setError('Falha no login de desenvolvimento.');
    } finally {
      setDevLoading(null);
    }
  }

  return (
    <div className="min-h-screen flex bg-gray-50">

      {/* ── Painel lateral (desktop) ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Decoração de fundo */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-blue-500 blur-3xl" />
          <div className="absolute bottom-20 right-20 w-48 h-48 rounded-full bg-purple-500 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-sm text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 shadow-lg mb-6">
            <ShieldCheck size={32} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">Radar Acadêmico</h1>
          <p className="text-slate-300 text-lg leading-relaxed">
            Gestão de Ocorrências Acadêmicas
          </p>
          <div className="mt-10 space-y-3 text-left">
            {[
              'Registro e acompanhamento de ocorrências',
              'Controle de SLA e prazos de validação',
              'Conformidade com ECA e LGPD',
              'Trilha de auditoria imutável',
            ].map(item => (
              <div key={item} className="flex items-center gap-3 text-sm text-slate-400">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Formulário ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6">

          {/* Logo mobile */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-900 shadow-lg mb-4">
              <ShieldCheck size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Radar Acadêmico</h1>
            <p className="text-sm text-gray-500 mt-1">Gestão de Ocorrências Acadêmicas</p>
          </div>

          {/* Card de login */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            {sent ? (
              <div className="text-center space-y-4 py-4">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-green-50">
                  <Mail size={26} className="text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Link enviado!</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Verifique sua caixa de entrada em{' '}
                    <strong className="text-gray-700">{email}</strong>{' '}
                    e clique no link para acessar.
                  </p>
                </div>
                <button
                  onClick={() => { setSent(false); setEmail(''); }}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Usar outro e-mail
                </button>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Acessar sistema</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Informe seu e-mail institucional para receber o link de acesso.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                      E-mail institucional
                    </label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="seu@escola.edu.br"
                        className="w-full rounded-xl border border-gray-200 pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {error && (
                    <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm transition-colors"
                  >
                    {loading
                      ? <><Loader2 size={15} className="animate-spin" /> Enviando...</>
                      : <><Send size={15} /> Enviar link de acesso</>
                    }
                  </button>
                </form>
              </>
            )}
          </div>

          {/* ── Painel dev ── */}
          {isDev && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-amber-600" />
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">
                  Acesso rápido — desenvolvimento
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {DEV_USERS.map(({ label, email: userEmail, cor }) => (
                  <button
                    key={userEmail}
                    onClick={() => handleDevLogin(userEmail)}
                    disabled={devLoading !== null}
                    className={`rounded-xl border px-3 py-2.5 text-left transition-all hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed ${cor}`}
                  >
                    <span className="block text-sm font-semibold">
                      {devLoading === userEmail
                        ? <span className="flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Entrando...</span>
                        : label
                      }
                    </span>
                    <span className="block text-xs opacity-70 truncate mt-0.5">{userEmail}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
