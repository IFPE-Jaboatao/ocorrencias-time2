import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export const api = axios.create({
  baseURL:         `${BASE_URL}/api/v1`,
  withCredentials: true,   // envia cookies HttpOnly automaticamente
});

/** Lê csrf_token (cookie não-HttpOnly) para injetar como X-CSRF-Token. */
function getCsrfCookie(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

// Injeta X-CSRF-Token em todas as mutações
api.interceptors.request.use((config) => {
  const method = config.method?.toUpperCase() ?? '';
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
    const csrf = getCsrfCookie();
    if (csrf) config.headers['X-CSRF-Token'] = csrf;
  }
  return config;
});

// Em 401, tenta refresh via cookie sgoa_refresh; se falhar, redireciona para login.
// Para todos os outros erros HTTP, substitui e.message pela mensagem do backend.
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        await axios.post(`${BASE_URL}/api/v1/auth/refresh`, {}, { withCredentials: true });
        return api(original);
      } catch {
        if (typeof window !== 'undefined') window.location.href = '/login';
      }
    }

    // Usa a mensagem do backend (ex: "RN-08: ...") em vez de "Request failed with status code 403"
    const serverMessage = error.response?.data?.message;
    if (serverMessage) {
      error.message = Array.isArray(serverMessage)
        ? serverMessage.join('; ')   // class-validator retorna array em 400
        : serverMessage;
    }

    return Promise.reject(error);
  },
);
