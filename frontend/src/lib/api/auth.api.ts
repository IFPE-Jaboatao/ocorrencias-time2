import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const baseApi = axios.create({ baseURL: `${BASE_URL}/api/v1` });

export const authApi = {
  solicitarMagicLink: (email: string) =>
    baseApi.post('/auth/magic-link', { email }).then(r => r.data),

  verificarMagicLink: (token: string) =>
    baseApi
      .post<{ accessToken: string; refreshToken: string }>('/auth/magic-link/verificar', { token })
      .then(r => r.data),

  refresh: (refreshToken: string) =>
    baseApi
      .post<{ accessToken: string; refreshToken: string }>('/auth/refresh', { refreshToken })
      .then(r => r.data),

  logout: (refreshToken: string) =>
    baseApi.post('/auth/logout', { refreshToken }).then(r => r.data),

  devLogin: (email: string) =>
    baseApi
      .post<{ accessToken: string; refreshToken: string }>('/auth/dev-login', { email })
      .then(r => r.data),
};
