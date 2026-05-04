import axios from 'axios';
import { getAccessToken, getRefreshToken, saveTokens, clearTokens } from '../auth/session';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export const api = axios.create({ baseURL: `${BASE_URL}/api/v1` });

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = getRefreshToken();
      if (refresh) {
        try {
          const { data } = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, { refreshToken: refresh });
          saveTokens(data.accessToken, data.refreshToken);
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(original);
        } catch {
          clearTokens();
          window.location.href = '/login';
        }
      } else {
        clearTokens();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);
