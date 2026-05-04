'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, clearTokens } from '@/lib/auth/session';
import { authApi } from '@/lib/api/auth.api';
import { getRefreshToken } from '@/lib/auth/session';
import type { AuthenticatedUser } from '@/types/ocorrencia.types';

const NAV_ITEMS = [
  { href: '/dashboard',       label: 'Dashboard' },
  { href: '/ocorrencias',     label: 'Ocorrências' },
  { href: '/ocorrencias/nova', label: '+ Nova Ocorrência' },
];

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [user, setUser]       = useState<AuthenticatedUser | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const current = getCurrentUser();
    if (!current) {
      router.replace('/login');
    } else {
      setUser(current);
      setChecked(true);
    }
  }, [router]);

  async function handleLogout() {
    const rt = getRefreshToken();
    if (rt) {
      try { await authApi.logout(rt); } catch { /* ignore */ }
    }
    clearTokens();
    router.replace('/login');
  }

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-bold text-gray-900 text-sm">SGOA</span>
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span>{user?.nome}</span>
          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{user?.perfil}</span>
          <button onClick={handleLogout} className="text-red-500 hover:underline text-xs">
            Sair
          </button>
        </div>
      </header>

      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
