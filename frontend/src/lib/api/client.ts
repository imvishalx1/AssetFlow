import axios from 'axios';
import { env } from '../env';
import { tokenStore } from '../../auth/tokenStore';
import { refreshClient } from './refreshClient';
import { isMockMode } from '../../auth/mock';
import { mockAdapter } from './mockAdapter';

export const client = axios.create({
  baseURL: `${env.VITE_API_BASE_URL}/api/v1`,
  withCredentials: true,
  timeout: 10_000,
});

// In mock mode the entire API is served from in-memory seed data so the UI can
// be demoed without a running backend / database.
if (isMockMode) {
  client.defaults.adapter = mockAdapter;
}

client.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let refreshQueue: Array<{ resolve: (t: string) => void; reject: (e: unknown) => void }> = [];

// Unwrap the API envelope: backend returns { success, data }, so resolve the
// promise directly to the inner payload and let components read res.assets etc.
// instead of res.data.data.
client.interceptors.response.use(
  (res) => res.data.data,
  async (error) => {
    const original = error.config;
    if (
      error.response?.status === 401 &&
      error.response?.data?.error?.code === 'TOKEN_EXPIRED' &&
      original &&
      !original._retry
    ) {
      original._retry = true;
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return client(original);
        });
      }
      isRefreshing = true;
      try {
        const { data } = await refreshClient.post('/auth/refresh');
        const newToken = data.data.accessToken as string;
        tokenStore.set(newToken);
        refreshQueue.forEach((p) => p.resolve(newToken));
        refreshQueue = [];
        original.headers.Authorization = `Bearer ${newToken}`;
        return client(original);
      } catch (err) {
        refreshQueue.forEach((p) => p.reject(err));
        refreshQueue = [];
        tokenStore.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  },
);
