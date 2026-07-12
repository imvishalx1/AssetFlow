import axios from 'axios';
import { env } from '../env';

// Separate instance (no auth interceptor) used only for refreshing the access token.
export const refreshClient = axios.create({
  baseURL: `${env.VITE_API_BASE_URL}/api/v1`,
  withCredentials: true,
  timeout: 10_000,
});
