import axios from 'axios';

export const TOKEN_KEY = 'auth_token';
export const USER_ID_KEY = 'auth_user_id';

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request
http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on expired / invalid token
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401 && localStorage.getItem(TOKEN_KEY)) {
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) return 'Cannot reach the server. Is the backend running?';
    const data = err.response.data as { message?: string; errors?: Record<string, string[]> };
    const firstFieldError = data?.errors ? Object.values(data.errors).flat()[0] : undefined;
    if (firstFieldError) return `${data.message ?? 'Error'}: ${firstFieldError}`;
    if (data?.message) return data.message;
  }
  return err instanceof Error ? err.message : 'Something went wrong';
}
