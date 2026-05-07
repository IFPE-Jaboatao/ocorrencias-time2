'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, AlertTriangle, Plus,
  LogOut, Menu, X, Building2, ChevronRight,
  Users, Tag, BarChart3, GraduationCap,
} from 'lucide-react';
import { getMe, logout as sessionLogout } from '@/lib/auth/session';
import { authApi } from '@/lib/api/auth.api';
import type { AuthenticatedUser } from '@/types/ocorrencia.types';

const NAV_ITEMS: { href: string; label: string; icon: React.ElementType; perfis?: string[] }[] = [
  { href: '/dashboard',        label: 'Dashboard',       icon: LayoutDashboard },
  { href: '/ocorrencias',      label: 'Ocorrências',     icon: AlertTriangle },
  { href: '/ocorrencias/nova', label: 'Nova Ocorrência', icon: Plus },
  { href: '/alunos',           label: 'Alunos',          icon: GraduationCap },
  { href: '/relatorios',       label: 'Relatórios',      icon: BarChart3, perfis: ['COORDENADOR', 'EQUIPE_PEDAGOGICA', 'DIRETOR', 'SECRETARIA', 'ADMIN'] },
];

const ADMIN_ITEMS = [
  { href: '/admin/usuarios',   label: 'Usuários',        icon: Users },
  { href: '/admin/categorias', label: 'Categorias',      icon: Tag },
];

const PERFIL_COR: Record<string, string> = {
  PROFESSOR:         'bg-blue-500/20 text-blue-300',
  COORDENADOR:       'bg-purple-500/20 text-purple-300',
  DIRETOR:           'bg-amber-500/20 text-amber-300',
  ADMIN:             'bg-red-500/20 text-red-300',
  EQUIPE_PEDAGOGICA: 'bg-teal-500/20 text-teal-300',
  SECRETARIA:        'bg-gray-500/20 text-gray-300',
};

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [user, setUser]         = useState<AuthenticatedUser | null>(null);
  const [checked, setChecked]   = useState(false);
  const [sidebarOpen, setSidebar] = useState(false);

  useEffect(() => {
    getMe().then((current) => {
      if (!current) {
        router.replace('/login');
      } else {
        setUser(current);
        setChecked(true);
      }
    });
  }, [router]);

  // Fechar sidebar ao navegar no mobile
  useEffect(() => { setSidebar(false); }, [pathname]);

  async function handleLogout() {
    await sessionLogout();
    router.replace('/login');
  }

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  const perfilLabel = user?.perfil?.replace('_', ' ') ?? '';
  const iniciais = user?.nome?.split(' ').slice(0, 2).map(n => n[0]).join('') ?? '?';

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ── Overlay mobile ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 md:hidden"
          onClick={() => setSidebar(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 flex flex-col
        transform transition-transform duration-200 ease-in-out
        md:relative md:translate-x-0 md:flex
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-slate-700/50">
          <div>
            <span className="text-white font-bold text-lg tracking-tight">Radar Acadêmico</span>
            <p className="text-slate-400 text-xs mt-0.5">Gestão de Ocorrências</p>
          </div>
          <button onClick={() => setSidebar(false)} className="md:hidden text-slate-400 hover:text-white p-1">
            <X size={18} />
          </button>
        </div>

        {/* Campus */}
        {user?.campus && (
          <div className="px-5 py-3 border-b border-slate-700/50">
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <Building2 size={13} />
              <span>{user.campus}</span>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.filter(item => !item.perfis || (user && item.perfis.includes(user.perfil))).map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href) && href !== '/ocorrencias/nova');
            const exactActive = pathname === href;
            const isActive = href === '/ocorrencias/nova' ? exactActive : (href === '/dashboard' ? exactActive : active);
            return (
              <Link
                key={href}
                href={href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                  ${isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }
                `}
              >
                <Icon size={17} className="flex-shrink-0" />
                <span>{label}</span>
                {isActive && <ChevronRight size={14} className="ml-auto opacity-70" />}
              </Link>
            );
          })}

          {/* Seção Admin */}
          {user && ['ADMIN', 'DIRETOR'].includes(user.perfil) && (
            <div className="pt-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-1">
                Administração
              </p>
              {ADMIN_ITEMS.map(({ href, label, icon: Icon }) => {
                const isActive = pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                      ${isActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }
                    `}
                  >
                    <Icon size={17} className="flex-shrink-0" />
                    <span>{label}</span>
                    {isActive && <ChevronRight size={14} className="ml-auto opacity-70" />}
                  </Link>
                );
              })}
            </div>
          )}
        </nav>

        {/* User footer */}
        <div className="p-4 border-t border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
              {iniciais}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.nome}</p>
              <span className={`inline-block text-xs px-1.5 py-0.5 rounded font-medium ${PERFIL_COR[user?.perfil ?? ''] ?? 'bg-gray-500/20 text-gray-300'}`}>
                {perfilLabel}
              </span>
            </div>
            <button
              onClick={handleLogout}
              title="Sair"
              className="text-slate-400 hover:text-red-400 transition-colors p-1 flex-shrink-0"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Conteúdo principal ── */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">

        {/* Header mobile */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0">
          <button onClick={() => setSidebar(true)} className="text-gray-600 hover:text-gray-900 p-1">
            <Menu size={22} />
          </button>
          <span className="font-bold text-gray-900">Radar Acadêmico</span>
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
            {iniciais}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
