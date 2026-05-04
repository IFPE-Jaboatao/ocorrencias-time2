'use client';

import { AuthenticatedUser } from '@/types/ocorrencia.types';

const ACCESS_TOKEN_KEY  = 'sgoa_access';
const REFRESH_TOKEN_KEY = 'sgoa_refresh';

export function saveTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY,  accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function decodeJwt(token: string): AuthenticatedUser | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload)) as AuthenticatedUser;
  } catch {
    return null;
  }
}

export function getCurrentUser(): AuthenticatedUser | null {
  const token = getAccessToken();
  if (!token) return null;
  return decodeJwt(token);
}
