'use client';

import type { AuthenticatedUser } from '@/types/ocorrencia.types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/** Busca dados do usuário autenticado via cookie HttpOnly (GET /auth/me). */
export async function getMe(): Promise<AuthenticatedUser | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/auth/me`, {
      credentials: 'include',
      cache:       'no-store',
    });
    if (!res.ok) return null;
    return res.json() as Promise<AuthenticatedUser>;
  } catch {
    return null;
  }
}

/** Encerra sessão — limpa cookies via POST /auth/logout. */
export async function logout(): Promise<void> {
  try {
    await fetch(`${BASE_URL}/api/v1/auth/logout`, {
      method:      'POST',
      credentials: 'include',
    });
  } catch { /* best-effort */ }
}
