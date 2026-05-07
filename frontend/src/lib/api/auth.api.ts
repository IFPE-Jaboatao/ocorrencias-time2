import axios from 'axios';
import type { AuthenticatedUser } from '@/types/ocorrencia.types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// Instância dedicada para auth — sem interceptors (evita loop em 401 do refresh)
const authAxios = axios.create({
  baseURL:         `${BASE_URL}/api/v1`,
  withCredentials: true,
});

export const authApi = {
  solicitarMagicLink: (email: string) =>
    authAxios.post<{ token?: string; message?: string }>('/auth/magic-link', { email }).then(r => r.data),

  verificarMagicLink: (token: string) =>
    authAxios.post<{ ok: boolean }>('/auth/magic-link/verificar', { token }).then(r => r.data),

  refresh: () =>
    authAxios.post<{ ok: boolean }>('/auth/refresh', {}).then(r => r.data),

  logout: () =>
    authAxios.post('/auth/logout', {}).then(r => r.data),

  me: () =>
    authAxios.get<AuthenticatedUser>('/auth/me').then(r => r.data),

  devLogin: (email: string) =>
    authAxios.post<{ ok: boolean }>('/auth/dev-login', { email }).then(r => r.data),

  getCsrfToken: () =>
    authAxios.get<{ csrfToken: string }>('/auth/csrf-token').then(r => r.data),
};
